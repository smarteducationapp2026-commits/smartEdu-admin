import type { PricingType } from '../../core/types'

export type FormState = {
  title: string
  description: string
  examIds: string[]
  status: 'draft' | 'published'
  pricingType: PricingType
  price: string
}

export const emptyForm: FormState = {
  title: '',
  description: '',
  examIds: [],
  status: 'draft',
  pricingType: 'free',
  price: '',
}
