export interface Transaction {
  id: string
  user_id: string
  wallet_id: string
  category_id: string | null
  image_url: string | null
  thumbnail_url: string | null
  merchant_name: string | null
  amount: number
  currency: string
  transaction_date: string | null
  transaction_time: string | null
  note: string | null
  ocr_confidence: number
  is_life_log: boolean
  is_income: boolean
  is_manual: boolean
  transaction_status: string
  created_at: string
  updated_at: string
  /** Denormalized from wallet/category for frontend convenience */
  category_name?: string | null
  wallet_name?: string | null
}

export interface TransactionListParams {
  wallet_id?: string
  category_id?: string
  start_date?: string
  end_date?: string
  skip?: number
  limit?: number
}

export interface TransactionCreateData {
  wallet_id: string
  category_id?: string
  amount: number
  merchant_name?: string
  transaction_date?: string
  transaction_time?: string
  note?: string
  is_life_log?: boolean
  is_income?: boolean
}

export interface TransactionUpdateData {
  amount?: number
  /** Category UUID, null to clear, or undefined to leave unchanged */
  category_id?: string | null
  wallet_id?: string
  note?: string
  merchant_name?: string
  transaction_time?: string | null
  /** True = income (adds balance to wallet), false/undefined = expense (deducts balance) */
  is_income?: boolean
}
