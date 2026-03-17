import { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('font-bold text-[var(--text)] font-heading', className)} {...props}>
      {children}
    </p>
  )
}
