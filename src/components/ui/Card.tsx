import { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-[#111318] border border-[#1F2937] rounded-2xl p-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('font-bold text-slate-50 font-heading', className)} {...props}>
      {children}
    </p>
  )
}
