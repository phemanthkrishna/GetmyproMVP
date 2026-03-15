import { useAuth } from '../../context/AuthContext'
import { useOrders } from '../../hooks/useOrders'
import { BottomNav } from '../../components/BottomNav'
import { formatCurrency, formatDate } from '../../lib/utils'
import { Briefcase, DollarSign, User, History } from 'lucide-react'

const NAV = [
  { to: '/worker', icon: Briefcase, label: 'Jobs' },
  { to: '/worker/earnings', icon: DollarSign, label: 'Earnings' },
  { to: '/worker/history', icon: History, label: 'History' },
  { to: '/worker/profile', icon: User, label: 'Profile' },
]

const WORKER_VISIT = 100

export default function WorkerEarnings() {
  const { session } = useAuth()
  const { orders } = useOrders({ worker_id: session?.id || '' })

  const completed      = orders.filter(o => o.status === 'completed')
  const cancelledVisit = orders.filter(o => o.status === 'cancelled' && (o.worker_cancellation_pay || 0) > 0)
  const activeJobs     = orders.filter(o => !['completed', 'cancelled'].includes(o.status))

  // Earnings per completed job = labour + ₹100 visit
  const totalEarned  = completed.reduce((s, o) => s + (o.quote_labour || 0) + WORKER_VISIT, 0)
  const visitEarned  = cancelledVisit.reduce((s, o) => s + (o.worker_cancellation_pay || 0), 0)
  const pendingAmt   = activeJobs.reduce((s, o) => s + (o.quote_labour || 0), 0)

  return (
    <div className="page-content px-5 py-6">
      <h1 className="text-2xl font-black font-heading text-slate-50 mb-5">Earnings</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
          <p className="text-slate-400 text-xs mb-1">Total Earned</p>
          <p className="text-2xl font-black text-green-400">{formatCurrency(totalEarned + visitEarned)}</p>
          <p className="text-slate-600 text-xs mt-1">{completed.length} completed</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
          <p className="text-slate-400 text-xs mb-1">In Progress</p>
          <p className="text-2xl font-black text-orange-400">{formatCurrency(pendingAmt)}</p>
          <p className="text-slate-600 text-xs mt-1">{activeJobs.length} active</p>
        </div>
      </div>

      {/* Earnings breakdown */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl divide-y divide-slate-700 mb-6">
        <div className="flex justify-between px-4 py-3">
          <span className="text-slate-400 text-sm">Labour charges earned</span>
          <span className="text-slate-50 text-sm font-semibold">{formatCurrency(completed.reduce((s, o) => s + (o.quote_labour || 0), 0))}</span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-slate-400 text-sm">Visiting charges ({completed.length + cancelledVisit.length} visits)</span>
          <span className="text-slate-50 text-sm font-semibold">{formatCurrency((completed.length + cancelledVisit.length) * WORKER_VISIT)}</span>
        </div>
        <div className="flex justify-between px-4 py-3 font-bold">
          <span className="text-slate-300 text-sm">Total</span>
          <span className="text-green-400 text-sm">{formatCurrency(totalEarned + visitEarned)}</span>
        </div>
      </div>

      {/* Completed jobs */}
      <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Completed Jobs</h2>
      {completed.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">No completed jobs yet</div>
      ) : (
        <div className="flex flex-col gap-2 mb-6">
          {completed.map(o => (
            <div key={o.id} className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-slate-50 text-sm font-semibold">{o.service_emoji} {o.service}</p>
                <p className="text-slate-500 text-xs">{formatDate(o.created_at)}</p>
                <div className="flex gap-2 mt-0.5 text-xs text-slate-500">
                  <span>Labour: {formatCurrency(o.quote_labour || 0)}</span>
                  <span>+ Visit: ₹100</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-green-400 font-bold text-sm block">{formatCurrency((o.quote_labour || 0) + WORKER_VISIT)}</span>
                <span className={`text-xs ${o.labour_pay_settled ? 'text-green-400' : 'text-amber-400'}`}>
                  {o.labour_pay_settled ? '✓ Paid' : '⏳ Pending'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancellation visit charges */}
      {cancelledVisit.length > 0 && (
        <>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Visit Charges (Cancelled)</h2>
          <div className="flex flex-col gap-2">
            {cancelledVisit.map(o => (
              <div key={o.id} className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-slate-50 text-sm font-semibold">{o.service_emoji} {o.service}</p>
                  <p className="text-slate-500 text-xs">{formatDate(o.created_at)}</p>
                  <p className="text-red-400 text-xs">Customer cancelled after quote</p>
                </div>
                <div className="text-right">
                  <span className="text-orange-400 font-bold text-sm block">{formatCurrency(o.worker_cancellation_pay || 0)}</span>
                  <span className={`text-xs ${o.cancellation_pay_settled ? 'text-green-400' : 'text-amber-400'}`}>
                    {o.cancellation_pay_settled ? '✓ Paid' : '⏳ Pending'}
                  </span>
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
