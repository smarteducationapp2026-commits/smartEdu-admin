import type { User } from 'firebase/auth'

export type UserRecord = {
  id: string
  uid?: string
  email?: string
  displayName?: string
  firstName?: string
  lastName?: string
  dateOfBirth?: string
  phoneNumber?: string
  targetExam?: string
  district?: string
  state?: string
  preferredLanguage?: 'telugu' | 'english'
  photoUrl?: string
  role?: string
  referralCode?: string
  provider?: string
  onboardingComplete?: boolean
  walletBalance?: number
  createdAt?: { seconds?: number }
  updatedAt?: { seconds?: number }
}

export type WalletTransactionType = 'signup_bonus' | 'referral_bonus' | 'topup' | 'admin_credit' | 'admin_debit'
export type WalletDirection = 'credit' | 'debit'
export type WalletTransaction = {
  id: string
  uid: string
  type: WalletTransactionType
  direction: WalletDirection
  amount: number
  balanceAfter?: number
  description?: string
  createdBy?: string
  createdAt?: { seconds?: number }
}

export type InstituteRole = 'institute' | 'admin'
export type AcademicStatus = 'active' | 'inactive'
export type Subject = { id: string; parentId?: string | null; name: string; code?: string; description?: string; type?: 'subject' | 'topic' | 'subtopic' | 'mixed'; status?: AcademicStatus; order?: number }
export type ExamStatus = 'draft' | 'created' | 'published'
export type ExamAnswerOption = 'A' | 'B' | 'C' | 'D'
export type ExamTimerType = 'perQuestion' | 'overall'
export type ExamTimerFields = { timerEnabled?: boolean; timerType?: ExamTimerType | null; timerSeconds?: number | null }
export type ExamQuestion = { question: string; optionA: string; optionB: string; optionC: string; optionD: string; correctAnswer: ExamAnswerOption; explanation?: string }
export type Exam = { id: string; topicId: string; name: string; description?: string; questions: ExamQuestion[]; status: ExamStatus; createdAt?: { seconds?: number }; updatedAt?: { seconds?: number } } & ExamTimerFields
export type PublicExamQuestion = { question: string; optionA: string; optionB: string; optionC: string; optionD: string }
export type PublicExam = { id: string; name: string; topicId: string; questionCount: number; status: ExamStatus; questions: PublicExamQuestion[]; updatedAt?: { seconds?: number } } & ExamTimerFields
export type TestSeriesStatus = 'draft' | 'published'
export type PricingType = 'free' | 'paid'
export type TestSeries = { id: string; title: string; description?: string; examIds: string[]; thumbnailUrl?: string; status: TestSeriesStatus; pricingType?: PricingType; price?: number; createdAt?: { seconds?: number }; updatedAt?: { seconds?: number }; publishedAt?: { seconds?: number } }
export type AdminUser = Pick<User, 'email' | 'displayName' | 'photoURL'> & { uid: string }
