import { collection, doc, getDoc, getDocs, increment, serverTimestamp, setDoc, type QueryDocumentSnapshot } from 'firebase/firestore'
import { db } from '../core/firebase'

export type UsageItem = { key: string; label: string; count: number }

const USAGE_COLLECTIONS: { key: string; label: string }[] = [
  { key: 'users', label: 'Users' },
  { key: 'subjects', label: 'Subjects' },
  { key: 'exams', label: 'Exams' },
  { key: 'testSeries', label: 'Test series' },
  { key: 'testSeriesPurchases', label: 'Test series purchases' },
  { key: 'examSubmissions', label: 'Exam submissions' },
  { key: 'walletTransactions', label: 'Wallet transactions' },
  { key: 'questionReports', label: 'Question reports' },
]

/// Firestore document counts per collection, used as a lightweight proxy for
/// Firebase usage. Real read/write/storage quota requires the Blaze plan and
/// the Cloud Monitoring API, which this Spark-plan, client-only app doesn't have.
export async function getFirebaseUsage(): Promise<UsageItem[]> {
  const snapshots = await Promise.all(
    USAGE_COLLECTIONS.map(({ key }) => getDocs(collection(db, key))),
  )
  return USAGE_COLLECTIONS.map(({ key, label }, index) => ({
    key,
    label,
    count: snapshots[index].size,
  }))
}

export type TrendPoint = { date: string; count: number }

function toDateKey(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(0, 10)
}

function bucketByDay(
  docs: QueryDocumentSnapshot[],
  timestampField: string,
  days: number,
): TrendPoint[] {
  const counts = new Map<string, number>()
  for (const doc of docs) {
    const seconds = (doc.data()[timestampField] as { seconds?: number } | undefined)?.seconds
    if (seconds == null) continue
    const key = toDateKey(seconds)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const points: TrendPoint[] = []
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today)
    date.setUTCDate(date.getUTCDate() - i)
    const key = date.toISOString().slice(0, 10)
    points.push({ date: key, count: counts.get(key) ?? 0 })
  }
  return points
}

export type Trends = {
  signups: TrendPoint[]
  attempts: TrendPoint[]
}

export async function getTrends(days: number): Promise<Trends> {
  const [users, submissions] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'examSubmissions')),
  ])
  return {
    signups: bucketByDay(users.docs, 'createdAt', days),
    attempts: bucketByDay(submissions.docs, 'submittedAt', days),
  }
}

/* ------------------------------------------------------------------ */
/* Pre-aggregated day/week/month buckets. Mobile writes one increment  */
/* per bucket on each event (signup, attempt, purchase); the dashboard */
/* reads a handful of docs instead of scanning whole collections.      */
/* Collections: analyticsDaily/{yyyy-MM-dd},                           */
/*   analyticsWeekly/{yyyy-Www (ISO)}, analyticsMonthly/{yyyy-MM}.      */
/* Fields: signups, attempts, purchases (counts), revenue (₹ sum).      */
/* ------------------------------------------------------------------ */

export type Granularity = 'day' | 'week' | 'month'

const ANALYTICS_COLLECTIONS: Record<Granularity, string> = {
  day: 'analyticsDaily',
  week: 'analyticsWeekly',
  month: 'analyticsMonthly',
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export function dayKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
}

export function weekKey(date: Date): string {
  // ISO week: week 1 contains the year's first Thursday.
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const weekday = day.getUTCDay() === 0 ? 7 : day.getUTCDay()
  const thursday = new Date(day)
  thursday.setUTCDate(thursday.getUTCDate() + (4 - weekday))
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1))
  const week = Math.floor((thursday.getTime() - yearStart.getTime()) / 604800000) + 1
  return `${thursday.getUTCFullYear()}-W${pad2(week)}`
}

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`
}

function bucketKey(granularity: Granularity, date: Date): string {
  if (granularity === 'week') return weekKey(date)
  if (granularity === 'month') return monthKey(date)
  return dayKey(date)
}

function shift(date: Date, granularity: Granularity, steps: number): Date {
  const next = new Date(date)
  if (granularity === 'week') next.setUTCDate(next.getUTCDate() + steps * 7)
  else if (granularity === 'month') next.setUTCMonth(next.getUTCMonth() + steps)
  else next.setUTCDate(next.getUTCDate() + steps)
  return next
}

/// Record one event into the current day/week/month buckets. Counters only
/// ever increase (enforced by firestore.rules); safe under concurrency via
/// FieldValue.increment. Zero deltas are skipped to save writes.
export async function recordAnalyticsEvent(delta: {
  signups?: number
  attempts?: number
  purchases?: number
  revenue?: number
}): Promise<void> {
  const { signups = 0, attempts = 0, purchases = 0, revenue = 0 } = delta
  if (signups === 0 && attempts === 0 && purchases === 0 && revenue === 0) return
  const now = new Date()
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() }
  if (signups !== 0) data.signups = increment(signups)
  if (attempts !== 0) data.attempts = increment(attempts)
  if (purchases !== 0) data.purchases = increment(purchases)
  if (revenue !== 0) data.revenue = increment(revenue)
  await Promise.all(
    (Object.keys(ANALYTICS_COLLECTIONS) as Granularity[]).map((granularity) =>
      setDoc(
        doc(db, ANALYTICS_COLLECTIONS[granularity], bucketKey(granularity, now)),
        data,
        { merge: true },
      ),
    ),
  )
}

export type Bucket = {
  key: string
  label: string
  signups: number
  attempts: number
  purchases: number
  revenue: number
}

function bucketLabel(granularity: Granularity, key: string): string {
  if (granularity === 'month') {
    // Short display label ("Sep 2026") — never ISO, so charts print it raw.
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[Number(key.slice(5, 7)) - 1] ?? ''} ${key.slice(0, 4)}`.trim()
  }
  if (granularity === 'week') return key.replace('-W', ' W')
  return key.slice(5)
}

/// Read the last `periods` buckets (oldest first). A few doc reads instead
/// of full collection scans. Missing buckets read as zeros.
export async function getAnalyticsBuckets(
  granularity: Granularity,
  periods: number,
): Promise<Bucket[]> {
  const now = new Date()
  const keys: string[] = []
  for (let i = periods - 1; i >= 0; i -= 1) {
    keys.push(bucketKey(granularity, shift(now, granularity, -i)))
  }
  const snapshots = await Promise.all(
    keys.map((key) => getDoc(doc(db, ANALYTICS_COLLECTIONS[granularity], key))),
  )
  return keys.map((key, index) => {
    const data = snapshots[index].data() as
      | { signups?: number; attempts?: number; purchases?: number; revenue?: number }
      | undefined
    return {
      key,
      label: bucketLabel(granularity, key),
      signups: data?.signups ?? 0,
      attempts: data?.attempts ?? 0,
      purchases: data?.purchases ?? 0,
      revenue: data?.revenue ?? 0,
    }
  })
}

export type BucketedTrends = {
  signups: TrendPoint[]
  attempts: TrendPoint[]
  purchases: TrendPoint[]
  revenueTotal: number
}

export async function getBucketedTrends(
  granularity: Granularity,
  periods: number,
): Promise<BucketedTrends> {
  const buckets = await getAnalyticsBuckets(granularity, periods)
  return {
    signups: buckets.map((b) => ({ date: b.label, count: b.signups })),
    attempts: buckets.map((b) => ({ date: b.label, count: b.attempts })),
    purchases: buckets.map((b) => ({ date: b.label, count: b.purchases })),
    revenueTotal: buckets.reduce((sum, b) => sum + b.revenue, 0),
  }
}

/* ------------------------------------------------------------------ */
/* One-time backfill: seed day buckets from existing history docs.     */
/* Day docs that already exist (live counters) are left untouched, so   */
/* re-running is safe. Weekly/monthly buckets rebuild themselves going  */
/* forward; run this once right after deploying the mobile writes.      */
/* ------------------------------------------------------------------ */

export async function seedAnalyticsFromHistory(): Promise<{ daysSeeded: number }> {
  const [users, submissions, purchases] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'examSubmissions')),
    getDocs(collection(db, 'testSeriesPurchases')),
  ])
  const aggregate = new Map<string, { signups: number; attempts: number; purchases: number; revenue: number }>()
  const add = (seconds: number | undefined, field: 'signups' | 'attempts' | 'purchases', revenue = 0) => {
    if (seconds == null) return
    const key = toDateKey(seconds)
    const entry = aggregate.get(key) ?? { signups: 0, attempts: 0, purchases: 0, revenue: 0 }
    entry[field] += 1
    entry.revenue += revenue
    aggregate.set(key, entry)
  }
  for (const item of users.docs) {
    add((item.data()['createdAt'] as { seconds?: number } | undefined)?.seconds, 'signups')
  }
  for (const item of submissions.docs) {
    add((item.data()['submittedAt'] as { seconds?: number } | undefined)?.seconds, 'attempts')
  }
  for (const item of purchases.docs) {
    const data = item.data()
    add(
      (data['purchasedAt'] as { seconds?: number } | undefined)?.seconds,
      'purchases',
      (data['price'] as number | undefined) ?? 0,
    )
  }
  let daysSeeded = 0
  for (const [key, entry] of aggregate) {
    const ref = doc(db, 'analyticsDaily', key)
    const existing = await getDoc(ref)
    if (existing.exists()) continue
    await setDoc(ref, { ...entry, updatedAt: serverTimestamp() })
    daysSeeded += 1
  }
  return { daysSeeded }
}

/* ------------------------------------------------------------------ */
/* True Firestore read/write totals (Blaze only). Written daily by the  */
/* usage Cloud Functions into analyticsUsage/{yyyy-MM-dd}; until Blaze  */
/* is on, this collection is empty and the charts below read as zeros.  */
/* ------------------------------------------------------------------ */

export type UsageTotals = { reads: TrendPoint[]; writes: TrendPoint[] }

function startOfDayUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

/// Read raw day docs for the span and aggregate into buckets (oldest first).
export async function getUsageBuckets(
  granularity: Granularity,
  periods: number,
): Promise<UsageTotals> {
  const now = new Date()
  const spanDays =
    granularity === 'day' ? periods : granularity === 'week' ? periods * 7 + 6 : periods * 31 + 30
  const dayKeys: string[] = []
  for (let i = spanDays - 1; i >= 0; i -= 1) {
    dayKeys.push(dayKey(shift(startOfDayUTC(now), 'day', -i)))
  }
  const snapshots = await Promise.all(
    dayKeys.map((key) => getDoc(doc(db, 'analyticsUsage', key))),
  )
  const perDay = new Map(
    dayKeys.map((key, index) => {
      const data = snapshots[index].data() as { reads?: number; writes?: number } | undefined
      return [key, { reads: data?.reads ?? 0, writes: data?.writes ?? 0 }] as const
    }),
  )
  // Group days by their ISO bucket key, keep the newest `periods` buckets.
  const grouped = new Map<string, { reads: number; writes: number }>()
  for (const key of dayKeys) {
    const parts = key.split('-').map(Number)
    const bucket = bucketKey(granularity, new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])))
    const entry = grouped.get(bucket) ?? { reads: 0, writes: 0 }
    const day = perDay.get(key) ?? { reads: 0, writes: 0 }
    entry.reads += day.reads
    entry.writes += day.writes
    grouped.set(bucket, entry)
  }
  const keys = [...grouped.keys()].slice(-periods)
  return {
    reads: keys.map((key) => ({
      date: bucketLabel(granularity, key),
      count: grouped.get(key)?.reads ?? 0,
    })),
    writes: keys.map((key) => ({
      date: bucketLabel(granularity, key),
      count: grouped.get(key)?.writes ?? 0,
    })),
  }
}

/// Admin-triggered sync of the last N days via the syncFirestoreUsage Cloud
/// Function (Blaze only). Throws when functions aren't deployed yet.
export async function syncFirestoreUsage(days = 7): Promise<{ daysSynced: number }> {
  const { getFunctions, httpsCallable } = await import('firebase/functions')
  const { app } = await import('../core/firebase')
  const callable = httpsCallable<{ days: number }, { daysSynced: number }>(
    getFunctions(app),
    'syncFirestoreUsage',
  )
  const result = await callable({ days })
  return result.data
}
