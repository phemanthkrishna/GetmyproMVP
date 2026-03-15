import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useOrders } from '../../hooks/useOrders'
import { StatusBadge } from '../../components/StatusBadge'
import { BottomNav } from '../../components/BottomNav'
import { formatDate, formatCurrency } from '../../lib/utils'
import { Home, BookOpen, List } from 'lucide-react'
import { ChevronRight } from 'lucide-react'

const NAV = [
  { to: '/customer', icon: Home, label: 'Home' },
  { to: '/customer/book', icon: BookOpen, label: 'Book' },
  { to: '/customer/orders', icon: List, label: 'Orders' },
]

export default function CustomerOrders() {
  const { session } = useAuth()
  const { orders, loading } = useOrders({ customer_id: session?.id || '' })
  const navigate = useNavigate()

  return (
    <div className="page-content px-5 py-6">
      <h1 className="text-2xl font-black font-heading text-slate-50 mb-5">My Orders</h1>

      {loading && (
        <div className="text-center text-slate-500 py-10">Loading...</div>
      )}

      {!loading && orders.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-slate-400 font-semibold">No orders yet</p>
          <p className="text-slate-600 text-sm mt-1">Book a service to get started</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {orders.map(o => (
          <button
            key={o.id}
            onClick={() => navigate(`/customer/orders/${o.id}`)}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-left btn-press w-full"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{o.service_emoji}</span>
                <div>
                  <p className="font-bold text-slate-50">{o.service}</p>
                  <p className="text-slate-500 text-xs">{o.id} · {formatDate(o.created_at)}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={o.status} />
                {o.total_quote && (
                  <span className="text-xs text-slate-400">{formatCurrency(o.total_quote)}</span>
                )}
                <ChevronRight size={14} className="text-slate-600" />
              </div>
            </div>
          </button>
        ))}
      </div>

      <BottomNav items={NAV} />
    </div>
  )
}
