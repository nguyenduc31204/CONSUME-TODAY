export interface Category {
  id: string
  wallet_id: string
  name: string
  icon: string
  color: string
  emoji: string
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CategoryCreateData {
  name: string
  icon?: string
  color?: string
  emoji?: string
}

export interface CategoryUpdateData {
  name?: string
  icon?: string
  color?: string
  emoji?: string
}
