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
  createdAt?: { seconds?: number }
  updatedAt?: { seconds?: number }
}

export type AdminRole = 'user' | 'admin' | 'superAdmin'
export type InstituteRole = 'institute' | 'admin'
export type Course = { id: string; title: string; offer?: string; active?: boolean }
export type Test = { id: string; title?: string; courseId?: string; active?: boolean; questionCount?: number }
export type AcademicStatus = 'active' | 'inactive'
export type Subject = { id: string; parentId?: string | null; name: string; code?: string; description?: string; type?: 'subject' | 'topic' | 'subtopic' | 'mixed'; status?: AcademicStatus; order?: number }
export type ExamStatus = 'draft' | 'created' | 'published'
export type ExamAnswerOption = 'A' | 'B' | 'C' | 'D'
export type ExamQuestion = { question: string; optionA: string; optionB: string; optionC: string; optionD: string; correctAnswer: ExamAnswerOption; explanation?: string }
export type Exam = { id: string; topicId: string; name: string; description?: string; questions: ExamQuestion[]; status: ExamStatus; createdAt?: { seconds?: number }; updatedAt?: { seconds?: number } }
export type AdminUser = Pick<User, 'email' | 'displayName' | 'photoURL'> & { uid: string }
