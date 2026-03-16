import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-sm text-slate-400 mb-1 font-medium">{label}</label>}
      <input
        ref={ref}
        className={cn(
          'w-full bg-[#111318] border-2 border-[#1F2937] rounded-xl px-4 py-3 text-slate-50 placeholder-slate-600 outline-none',
          'focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(29,111,217,0.12)] transition-all',
          error && 'border-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'
