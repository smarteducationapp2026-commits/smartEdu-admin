import type { PricingType } from '../../core/types'

export type FormState = {
  title: string
  description: string
  courseId: string
  examIds: string[]
  status: 'draft' | 'published'
  pricingType: PricingType
  price: string
}

export const emptyForm: FormState = {
  title: '',
  description: '',
  courseId: '',
  examIds: [],
  status: 'draft',
  pricingType: 'free',
  price: '',
}
