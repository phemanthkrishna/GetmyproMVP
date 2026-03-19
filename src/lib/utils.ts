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
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return String(1000 + (arr[0] % 9000))
}

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function generateOrderId(): string {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return 'ORD-' + String(100000 + (arr[0] % 900000))
}
