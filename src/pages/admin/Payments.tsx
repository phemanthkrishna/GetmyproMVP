import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { BottomNav } from '../../components/BottomNav'
import { formatCurrency, formatDate } from '../../lib/utils'
import { ClipboardList, Users, DollarSign, Package, Store, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import type { Order } from '../../types'

function workerUpiLink(upiId: string, amount: number, note: string) {
  const params = new URLSearchParams({ pa: upiId, pn: 'GetMyPro', am: amount.toFixed(2), cu: 'INR', tn: note })
  return `upi://pay?${params.toString()}`
}

const NAV = [
  { to: '/admin', icon: ClipboardList, label: 'Orders' },
  { to: '/admin/workers', icon: Users, label: 'Workers' },
  { to: '/admin/payments', icon: DollarSign, label: 'Payments' },
  { to: '/admin/materials', icon: Package, label: 'Materials' },
  { to: '/admin/stores', icon: Store, label: 'Stores' },
]

const PLATFORM_FEE = 25   // ₹25 kept from each ₹125 booking
const WORKER_VISIT = 100  // ₹100 visiting charge from each booking → to worker

export default function AdminPayments() {
  const [orders, setOrders] = useState<Order[]>([])
  const [workerUpi, setWorkerUpi] = useState<Record<string, string>>({})

  useEffect(() => { fetchOrders() }, [])

  async function fetchWorkerUpis(rows: Order[]) {
    const ids = [...new Set(rows.map(o => o.worker_id).filter(Boolean))] as string[]
    if (!ids.length) return
    const { data } = await supabase.from('workers').select('id,upi_id').in('id', ids)
    const map: Record<string, string> = {}
    ;(data || []).forEach((w: any) => { if (w.upi_id) map[w.id] = w.upi_id })
    setWorkerUpi(map)
  }

  async function fetchOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .not('status', 'eq', 'booked')
      .order('created_at', { ascending: false })
    const rows = (data as Order[]) || []
    setOrders(rows)
    fetchWorkerUpis(rows)
  }

  // ── Derived data ────────────────────────────────────────────────
  const bookingPaid = orders.filter(o => o.booking_paid)
  const finalPaid   = orders.filter(o => o.final_paid)
  const completed   = orders.filter(o => o.status === 'completed')
  const cancelled   = orders.filter(o => o.status === 'cancelled' && (o.worker_cancellation_pay || 0) > 0)

  // Money IN
  const totalBookingCollected = bookingPaid.length * 125
  const totalFinalCollected   = finalPaid.reduce((s, o) => s + (o.total_quote || 0), 0)
  const totalMaterialCommission = orders.reduce((s, o) => s + (o.mat_commission || 0), 0)
  const totalIn = totalBookingCollected + totalFinalCollected

  // Platform revenue = ₹25 per booking + material commissions
  const platformFromBookings = bookingPaid.length * PLATFORM_FEE
  const platformRevenue = platformFromBookings + totalMaterialCommission

  // Money OUT to workers
  const completedPayouts  = completed.reduce((s, o) => s + (o.quote_labour || 0) + WORKER_VISIT, 0)
  const cancelledPayouts  = cancelled.reduce((s, o) => s + (o.worker_cancellation_pay || 0), 0)
  const totalWorkerPayout = completedPayouts + cancelledPayouts

  // Net profit
  const netProfit = platformRevenue

  // Pending payouts
  const pendingLabour    = completed.filter(o => !o.labour_pay_settled)
  const pendingCancel    = cancelled.filter(o => !o.cancellation_pay_settled)

  async function markLabourPaid(o: Order) {
    const { error } = await supabase.from('orders').update({ labour_pay_settled: true }).eq('id', o.id)
    if (error) { toast.error(error.message); return }
    toast.success(`Paid ${o.worker_name} — ${formatCurrency((o.quote_labour || 0) + WORKER_VISIT)}`)
    fetchOrders()
  }

  async function markCancelPaid(o: Order) {
    const { error } = await supabase.from('orders').update({ cancellation_pay_settled: true }).eq('id', o.id)
    if (error) { toast.error(error.message); return }
    toast.success(`Paid ${o.worker_name} — ${formatCurrency(o.worker_cancellation_pay || 0)}`)
    fetchOrders()
  }

  return (
    <div className="page-content px-5 py-6">
      <h1 className="text-2xl font-black font-heading text-slate-50 mb-5">Payments & Revenue</h1>

      {/* ── Money In ── */}
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Money In</p>
      <div className="bg-slate-800 border border-slate-700 rounded-2xl divide-y divide-slate-700 mb-4">
        <Row label={`Booking fees (${bookingPaid.length} × ₹125)`} value={formatCurrency(totalBookingCollected)} color="text-slate-50" />
        <Row label="Final job payments" value={formatCurrency(totalFinalCollected)} color="text-slate-50" />
        <Row label="Total collected" value={formatCurrency(totalIn)} color="text-green-400" bold />
      </div>

      {/* ── Platform Revenue ── */}
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Platform Revenue</p>
      <div className="bg-slate-800 border border-slate-700 rounded-2xl divide-y divide-slate-700 mb-4">
        <Row label={`Booking fee cut (${bookingPaid.length} × ₹25)`} value={formatCurrency(platformFromBookings)} color="text-slate-50" />
        <Row label="Material commissions" value={formatCurrency(totalMaterialCommission)} color="text-slate-50" />
        <Row label="Net Revenue" value={formatCurrency(netProfit)} color="text-green-400" bold />
      </div>

      {/* ── Worker Payouts Summary ── */}
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Worker Payouts</p>
      <div className="bg-slate-800 border border-slate-700 rounded-2xl divide-y divide-slate-700 mb-6">
        <Row label={`Completed jobs (labour + ₹100 visit each)`} value={formatCurrency(completedPayouts)} color="text-slate-50" />
        <Row label={`Cancellation visit charges`} value={formatCurrency(cancelledPayouts)} color="text-slate-50" />
        <Row label="Total to workers" value={formatCurrency(totalWorkerPayout)} color="text-orange-400" bold />
      </div>

      {/* ── Pending: Completed Job Payouts ── */}
      {pendingLabour.length > 0 && (
        <>
          <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">Pending — Completed Job Payouts</p>
          <div className="flex flex-col gap-3 mb-6">
            {pendingLabour.map(o => (
              <div key={o.id} className="bg-slate-800 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-slate-50 text-sm font-semibold">{o.worker_name}</p>
                  <p className="text-slate-500 text-xs">{o.service} · {o.id}</p>
                  <p className="text-slate-600 text-xs">{formatDate(o.created_at)}</p>
                  <div className="flex gap-3 mt-1 text-xs">
                    <span className="text-slate-400">Labour: {formatCurrency(o.quote_labour || 0)}</span>
                    <span className="text-slate-400">Visit: {formatCurrency(WORKER_VISIT)}</span>
                  </div>
                  {o.worker_id && workerUpi[o.worker_id] && (
                    <p className="text-blue-400 text-xs font-mono mt-1">UPI: {workerUpi[o.worker_id]}</p>
                  )}
                  {o.worker_id && !workerUpi[o.worker_id] && (
                    <p className="text-slate-600 text-xs mt-1">No UPI ID on file</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-orange-400 font-black text-base">{formatCurrency((o.quote_labour || 0) + WORKER_VISIT)}</span>
                  {o.worker_id && workerUpi[o.worker_id] && (
                    <a
                      href={workerUpiLink(workerUpi[o.worker_id], (o.quote_labour || 0) + WORKER_VISIT, `Payout ${o.id}`)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-500 text-white font-bold flex items-center gap-1"
                    >
                      <ExternalLink size={10} /> Pay via UPI
                    </a>
                  )}
                  <button
                    onClick={() => markLabourPaid(o)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-green-500 text-white font-bold"
                  >
                    Mark Paid
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Pending: Cancellation Payouts ── */}
      {pendingCancel.length > 0 && (
        <>
          <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3">Pending — Cancellation Visit Charges</p>
          <div className="flex flex-col gap-3 mb-6">
            {pendingCancel.map(o => (
              <div key={o.id} className="bg-slate-800 border border-red-500/20 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-slate-50 text-sm font-semibold">{o.worker_name || '—'}</p>
                  <p className="text-slate-500 text-xs">{o.service} · {o.id}</p>
                  <p className="text-red-400 text-xs">Customer cancelled after quote</p>
                  {o.worker_id && workerUpi[o.worker_id] && (
                    <p className="text-blue-400 text-xs font-mono mt-1">UPI: {workerUpi[o.worker_id]}</p>
                  )}
                  {o.worker_id && !workerUpi[o.worker_id] && (
                    <p className="text-slate-600 text-xs mt-1">No UPI ID on file</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-orange-400 font-black text-base">{formatCurrency(o.worker_cancellation_pay || 0)}</span>
                  {o.worker_id && workerUpi[o.worker_id] && (
                    <a
                      href={workerUpiLink(workerUpi[o.worker_id], o.worker_cancellation_pay || 0, `Visit charge ${o.id}`)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-500 text-white font-bold flex items-center gap-1"
                    >
                      <ExternalLink size={10} /> Pay via UPI
                    </a>
                  )}
                  <button
                    onClick={() => markCancelPaid(o)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-green-500 text-white font-bold"
                  >
                    Mark Paid
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {pendingLabour.length === 0 && pendingCancel.length === 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center mb-6">
          <p className="text-green-400 font-semibold text-sm">All worker payouts settled ✓</p>
        </div>
      )}

      {/* ── Settled History ── */}
      {completed.filter(o => o.labour_pay_settled).length > 0 && (
        <>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Settled History</p>
          <div className="flex flex-col gap-2 mb-6">
            {completed.filter(o => o.labour_pay_settled).map(o => (
              <div key={o.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm font-semibold">{o.worker_name}</p>
                  <p className="text-slate-500 text-xs">{o.service} · {formatDate(o.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-sm font-bold">{formatCurrency((o.quote_labour || 0) + WORKER_VISIT)}</p>
                  <p className="text-green-400 text-xs">✓ Paid</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <BottomNav items={NAV} />
    </div>
  )
}

function Row({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between items-center px-4 py-3 ${bold ? 'font-bold' : ''}`}>
      <span className="text-slate-400 text-sm">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  )
}
