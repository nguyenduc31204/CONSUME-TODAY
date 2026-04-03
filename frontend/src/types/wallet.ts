export interface Wallet {
  id: string
  user_id: string
  name: string
  description: string | null
  color: string
  icon: string
  is_default: boolean
  is_personal: boolean
  balance: number
  created_at: string
  updated_at: string
}

export interface WalletCreateData {
  name: string
  description?: string
  color?: string
  icon?: string
  initial_balance?: number
}

export interface WalletUpdateData {
  name?: string
  description?: string
  color?: string
  icon?: string
}

export interface WalletBalanceAdjustment {
  amount: number  // positive = add income, negative = subtract
}
