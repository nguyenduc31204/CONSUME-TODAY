import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/utils/cn'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'memoir-btn inline-flex items-center justify-center gap-2 font-medium transition-all',
          'focus:outline-none focus:ring-2 focus:ring-memoir-500 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          // Variant
          {
            'bg-memoir-500 text-white hover:bg-memoir-600 active:bg-memoir-700 shadow-sm':
              variant === 'primary',
            'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300':
              variant === 'secondary',
            'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200':
              variant === 'ghost',
            'bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200':
              variant === 'destructive',
          },
          // Size
          {
            'px-3 py-1.5 text-sm rounded-lg': size === 'sm',
            'px-4 py-2.5 text-sm rounded-xl': size === 'md',
            'px-6 py-3 text-base rounded-xl': size === 'lg',
          },
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    )
  },
)

Button.displayName = 'Button'
