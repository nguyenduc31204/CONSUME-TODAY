import { z } from 'zod'

/**
 * Transaction form validation schema.
 */
export const transactionSchema = z.object({
  amount: z.number().min(0, 'Số tiền không được âm'),
  category_id: z.string().uuid('Danh mục không hợp lệ').nullable(),
  wallet_id: z.string().uuid('Ví không hợp lệ'),
  note: z.string().max(500, 'Ghi chú tối đa 500 ký tự').optional(),
  merchant_name: z.string().max(255).optional(),
})

export type TransactionFormData = z.infer<typeof transactionSchema>

/**
 * Wallet form validation schema.
 */
export const walletSchema = z.object({
  name: z.string().min(1, 'Tên ví không được trống').max(50, 'Tên ví tối đa 50 ký tự'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Mã màu không hợp lệ').optional(),
  description: z.string().max(200).optional(),
})

export type WalletFormData = z.infer<typeof walletSchema>

/**
 * Category form validation schema.
 */
export const categorySchema = z.object({
  name: z.string().min(1, 'Tên danh mục không được trống').max(50, 'Tối đa 50 ký tự'),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Mã màu không hợp lệ').optional(),
  emoji: z.string().max(10).optional(),
})

export type CategoryFormData = z.infer<typeof categorySchema>
