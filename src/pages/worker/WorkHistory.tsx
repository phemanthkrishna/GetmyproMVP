import { useAuth } from '../../context/AuthContext'
import { useOrders } from '../../hooks/useOrders'
import { useNavigate } from 'react-router-dom'
import { BottomNav } from '../../components/BottomNav'
import { StatusBadge } from '../../components/StatusBadge'
import { formatDate, formatCurrency } from '../../lib/utils'
import { Briefcase, DollarSign, User, History } from 'lucide-react'

const NAV = [
  { to: '/worker', icon: Briefcase, label: 'Jobs' },
  { to: '/worker/earnings', icon: DollarSign, label: 'Earnings' },
  { to: '/worker/history', icon: History, label: 'History' },
  { to: '/worker/profile', icon: User, label: 'Profile' },
]

const WORKER_VISIT = 100

export default function WorkerHistory() {
  const { session } = useAuth()
  const { orders } = useOrders({ worker_id: session?.id || '' })
  const navigate = useNavigate()

  const sorted = [...orders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  function getAmount(o: (typeof orders)[0]) {
    if (o.status === 'completed') return (o.quote_labour || 0) + WORKER_VISIT
    if (o.status === 'cancelled' && (o.worker_cancellation_pay || 0) > 0) return o.worker_cancellation_pay || 0
    if (o.quote_labour) return o.quote_labour
    return null
  }

  function getAmountLabel(o: (typeof orders)[0]) {
    if (o.status === 'completed') return 'Labour + visit'
    if (o.status === 'cancelled') return 'Visit charge'
    return 'Est. labour'
  }

  return (
    <div className="page-content px-5 py-6">
      <h1 className="text-2xl font-black font-heading text-slate-50 mb-5">Work History</h1>

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm">No jobs yet</div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map(o => {
            const amt = getAmount(o)
            return (
              <button
                key={o.id}
                onClick={() => navigate(`/worker/job/${o.id}`)}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between text-left w-full"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{o.service_emoji}</span>
                    <p className="text-slate-50 font-semibold text-sm truncate">{o.service}</p>
                  </div>
                  <p className="text-slate-500 text-xs mb-1">{o.id} · {formatDate(o.created_at)}</p>
                  <p className="text-slate-600 text-xs truncate">{o.address}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 ml-3 shrink-0">
                  <StatusBadge status={o.status} />
                  {amt !== null && (
                    <div className="text-right">
                      <p className="text-green-400 font-bold text-sm">{formatCurrency(amt)}</p>
                      <p className="text-slate-600 text-xs">{getAmountLabel(o)}</p>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      <BottomNav items={NAV} />
    </div>
  )
}
