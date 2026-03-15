import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  return `₹${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2)}`
}

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function generateOrderId(): string {
  return 'ORD-' + String(Math.floor(100000 + Math.random() * 900000))
}
