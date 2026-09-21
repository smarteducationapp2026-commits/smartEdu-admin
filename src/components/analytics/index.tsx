import { useEffect, useState } from 'react'
import './analytics.css'
import {
  getBucketedTrends,
  getFirebaseUsage,
  getUsageBuckets,
  seedAnalyticsFromHistory,
  syncFirestoreUsage,
  type BucketedTrends,
  type Granularity,
  type UsageItem,
  type UsageTotals,
} from '../../services/analytics'
import { LineChart } from './LineChart'

const PERIODS: Record<Granularity, number> = { day: 14, week: 12, month: 12 }

function UsageBars({ items }: { items: UsageItem[] }) {
  const max = Math.max(1, ...items.map((item) => item.count))
  const sorted = [...items].sort((a, b) => b.count - a.count)
  return (
    <div className="usage-bars">
      {sorted.map((item) => (
        <div className="usage-row" key={item.key}>
          <span className="usage-label">{item.label}</span>
          <div className="usage-track">
            <div className="usage-fill" style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
          <strong className="usage-value">{item.count.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  )
}

function AnalyticsDashboard() {
  const [usage, setUsage] = useState<UsageItem[] | null>(null)

  useEffect(() => {
    void getFirebaseUsage().then(setUsage)
  }, [])

  return (
    <div className="stack">
      <div className="card">
        <h3>Firebase usage</h3>
        <p className="field-hint">
          Document counts per Firestore collection — a lightweight proxy for usage. Exact
          read/write/storage quota requires the Blaze plan; check the Firebase console for
          billing-accurate numbers.
        </p>
        {usage ? <UsageBars items={usage} /> : <p>Loading…</p>}
      </div>
    </div>
  )
}

function AnalyticsTrends() {
  const [granularity, setGranularity] = useState<Granularity>('day')
  const [trends, setTrends] = useState<BucketedTrends | null>(null)
  const [usage, setUsage] = useState<UsageTotals | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [seedMessage, setSeedMessage] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    void getBucketedTrends(granularity, PERIODS[granularity]).then((result) => {
      if (!cancelled) setTrends(result)
    })
    void getUsageBuckets(granularity, PERIODS[granularity]).then((result) => {
      if (!cancelled) setUsage(result)
    })
    return () => {
      cancelled = true
    }
  }, [granularity])

  async function syncUsage() {
    setSyncing(true)
    setSyncMessage('')
    try {
      const { daysSynced } = await syncFirestoreUsage(PERIODS[granularity])
      setSyncMessage(`Synced ${daysSynced} day${daysSynced === 1 ? '' : 's'} from Google Cloud.`)
      setUsage(await getUsageBuckets(granularity, PERIODS[granularity]))
    } catch (error) {
      setSyncMessage(
        error instanceof Error
          ? `Sync unavailable: ${error.message} (needs Blaze + deployed functions)`
          : 'Sync unavailable (needs Blaze + deployed functions).',
      )
    } finally {
      setSyncing(false)
    }
  }

  async function rebuildFromHistory() {    setSeeding(true)
    setSeedMessage('')
    try {
      const { daysSeeded } = await seedAnalyticsFromHistory()
      setSeedMessage(
        daysSeeded > 0
          ? `Seeded ${daysSeeded} day${daysSeeded === 1 ? '' : 's'} from history.`
          : 'Nothing to seed — history is already in the buckets.',
      )
      // Refresh whatever granularity is showing (day buckets changed).
      setTrends(await getBucketedTrends(granularity, PERIODS[granularity]))
    } catch (error) {
      setSeedMessage(error instanceof Error ? error.message : 'Unable to rebuild.')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="stack">
      <div className="toolbar range-toolbar">
        {(['day', 'week', 'month'] as const).map((option) => (
          <button
            key={option}
            className={granularity === option ? '' : 'secondary'}
            onClick={() => setGranularity(option)}
          >
            {option === 'day' ? 'Daily' : option === 'week' ? 'Weekly' : 'Monthly'}
          </button>
        ))}
        <button
          type="button"
          className="secondary"
          disabled={seeding}
          title="One-time backfill of day buckets from existing history docs"
          onClick={() => void rebuildFromHistory()}
        >
          {seeding ? 'Rebuilding…' : 'Rebuild from history'}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={syncing}
          title="Pull true Firestore read/write totals via Cloud Functions (Blaze only)"
          onClick={() => void syncUsage()}
        >
          {syncing ? 'Syncing…' : 'Sync Firestore usage'}
        </button>
      </div>
      {seedMessage && <p className="notice">{seedMessage}</p>}
      {syncMessage && <p className="notice">{syncMessage}</p>}
      <div className="stat">
        <span>Revenue ({granularity === 'day' ? '14 days' : granularity === 'week' ? '12 weeks' : '12 months'})</span>
        <strong>₹{(trends?.revenueTotal ?? 0).toLocaleString()}</strong>
      </div>
      <div className="grid12">
        <div className="card col-6">
          {trends ? <LineChart title="New signups" data={trends.signups} /> : <p>Loading…</p>}
        </div>
        <div className="card col-6">
          {trends ? <LineChart title="Exam attempts" data={trends.attempts} /> : <p>Loading…</p>}
        </div>
      </div>
      <div className="grid12">
        <div className="card col-6">
          {trends ? (
            <LineChart title="Test series purchases" data={trends.purchases} color="#1c9a5b" />
          ) : (
            <p>Loading…</p>
          )}
        </div>
        <div className="card col-6">
          {usage ? (
            <LineChart title="Firestore reads" data={usage.reads} color="#7c3aed" />
          ) : (
            <p>Loading…</p>
          )}
        </div>
      </div>
      <div className="grid12">
        <div className="card col-6">
          {usage ? (
            <LineChart title="Firestore writes" data={usage.writes} color="#fb8500" />
          ) : (
            <p>Loading…</p>
          )}
        </div>
        <div className="card col-6">
          <h3>About these numbers</h3>
          <p className="field-hint">
            Reads/writes come from Google Cloud Monitoring via Cloud Functions, so they
            need the Blaze plan with deployed functions — until then these charts read
            as zeros. Everything else on this tab comes from the app's own counters.
          </p>
        </div>
      </div>
    </div>
  )
}

export function Analytics() {
  const [tab, setTab] = useState<'dashboard' | 'trends'>('dashboard')
  return (
    <div className="stack">
      <div className="toolbar analytics-tabs">
        <button className={tab === 'dashboard' ? '' : 'secondary'} onClick={() => setTab('dashboard')}>
          Dashboard
        </button>
        <button className={tab === 'trends' ? '' : 'secondary'} onClick={() => setTab('trends')}>
          Trends
        </button>
      </div>
      {tab === 'dashboard' ? <AnalyticsDashboard /> : <AnalyticsTrends />}
    </div>
  )
}
