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
  note: string | null
  ocr_confidence: number
  is_life_log: boolean
  transaction_status: string
  created_at: string
  updated_at: string
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
  note?: string
  is_life_log?: boolean
}

export interface TransactionUpdateData {
  amount?: number
  category_id?: string
  wallet_id?: string
  note?: string
  merchant_name?: string
}
