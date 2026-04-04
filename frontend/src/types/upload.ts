/**
 * Upload-related types — mirrors backend Phase 3 response shapes.
 */

export interface OcrCategoryResult {
  id: string | null
  name: string
  confidence: number
}

export interface OcrResult {
  merchant: string | null
  amount: number | null
  currency: string
  date: string | null
  note: string | null
  category: OcrCategoryResult | null
  is_life_log: boolean
  confidence: number
  reason: string | null
}

export interface UploadImageData {
  url: string
  thumbnail_url: string | null
  width: number | null
  height: number | null
}

export interface UploadTransactionResponse {
  transaction_id: string
  image: UploadImageData
  ocr_result: OcrResult
  auto_save_in_seconds: number
  wallet_id: string
  wallet_name: string
  transaction_status: string
}

export interface TransactionForEdit {
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
}

export interface WalletSummary {
  id: string
  name: string
  color: string
  icon: string
  is_default: boolean
}

export interface CategorySummary {
  id: string
  name: string
  emoji: string
  color: string
}

export interface TransactionEditResponse {
  transaction: TransactionForEdit
  wallets: WalletSummary[]
  categories: CategorySummary[]
}

export type UploadState =
  | { phase: 'idle' }
  | { phase: 'compressing'; file: File }
  | { phase: 'uploading'; file: File }
  | { phase: 'preview'; data: UploadTransactionResponse; file: File }
  | { phase: 'editing'; data: UploadTransactionResponse; file: File }
  | { phase: 'saving'; data: UploadTransactionResponse }
  | { phase: 'done'; data: UploadTransactionResponse }
  | { phase: 'error'; message: string }
