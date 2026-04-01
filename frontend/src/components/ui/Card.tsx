import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/utils/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outline'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl border border-gray-100 bg-white',
          'shadow-sm transition-shadow',
          {
            default: 'shadow-sm',
            elevated: 'shadow-md',
            outline: 'shadow-none border-gray-200',
          }[variant],
          {
            none: '',
            sm: 'p-3',
            md: 'p-4',
            lg: 'p-6',
          }[padding],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  },
)

Card.displayName = 'Card'
