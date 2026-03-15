import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-bold rounded-xl btn-press transition-all disabled:opacity-50 disabled:cursor-not-allowed'
    const variants = {
      primary: 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-600',
      accent:  'bg-orange-500 text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600',
      ghost:   'bg-slate-800 text-slate-300 hover:bg-slate-700',
      danger:  'bg-red-500 text-white hover:bg-red-600',
      outline: 'border-2 border-slate-600 text-slate-300 hover:border-slate-400',
    }
    const sizes = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-base',
      lg: 'px-6 py-4 text-lg w-full',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? (
          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
        ) : null}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
