const MERCHANT_UPI = import.meta.env.VITE_UPI_MERCHANT_ID as string

export function generateUpiLink(amount: number, note: string): string {
  const pa = MERCHANT_UPI || 'getmypro@paytm'
  const params = new URLSearchParams({
    pa,
    pn: 'GetMyPro',
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note,
  })
  return `upi://pay?${params.toString()}`
}

export function openUpiPayment(amount: number, note: string): void {
  const link = generateUpiLink(amount, note)
  window.location.href = link
}
