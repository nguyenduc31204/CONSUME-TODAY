import { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'category' | 'life-log' | 'success' | 'error' | 'warning'
  size?: 'sm' | 'md'
  color?: string // Hex color for category badges
}

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  color,
  style,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        {
          sm: 'px-2 py-0.5 text-xs',
          md: 'px-3 py-1 text-xs',
        }[size],
        {
          default: 'bg-memoir-100 text-memoir-700',
          category: '',
          'life-log': 'bg-memoir-50 text-memoir-500 border border-memoir-200',
          success: 'bg-green-50 text-green-700',
          error: 'bg-red-50 text-red-600',
          warning: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
        }[variant],
        className,
      )}
      style={
        variant === 'category' && color
          ? { backgroundColor: `${color}20`, color, borderColor: `${color}40`, ...style }
          : style
      }
      {...props}
    >
      {children}
    </span>
  )
}
