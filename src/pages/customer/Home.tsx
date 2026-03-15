import { useNavigate } from 'react-router-dom'
import { SERVICES } from '../../constants'
import { BottomNav } from '../../components/BottomNav'
import { StatusBadge } from '../../components/StatusBadge'
import { useAuth } from '../../context/AuthContext'
import { useOrders } from '../../hooks/useOrders'
import { formatDate } from '../../lib/utils'
import { Home, BookOpen, List, ChevronRight, LogOut } from 'lucide-react'

const NAV = [
  { to: '/customer', icon: Home, label: 'Home' },
  { to: '/customer/book', icon: BookOpen, label: 'Book' },
  { to: '/customer/orders', icon: List, label: 'Orders' },
]

export default function CustomerHome() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const { orders } = useOrders({ customer_id: session?.id || '' })
  const active = orders.filter(o => !['completed', 'cancelled'].includes(o.status))

  return (
    <div className="page-content px-5 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-slate-500 text-sm">Hello, {session?.name?.split(' ')[0]}</p>
          <h1 className="text-2xl font-black font-heading text-slate-50 mt-0.5">What do you need?</h1>
        </div>
        <button onClick={signOut} className="flex items-center gap-1.5 text-red-400 text-xs font-semibold mt-1">
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      {/* Active orders banner */}
      {active.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Active</p>
          <div className="flex flex-col gap-2">
            {active.map(o => (
              <button
                key={o.id}
                onClick={() => navigate(`/customer/orders/${o.id}`)}
                className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-left btn-press w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{o.service_emoji}</span>
                  <div>
                    <p className="font-semibold text-slate-50 text-sm">{o.service}</p>
                    <p className="text-slate-500 text-xs">{formatDate(o.created_at)}</p>
                  </div>
                </div>
                <StatusBadge status={o.status} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Services */}
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Services</p>
      <div className="flex flex-col gap-1">
        {SERVICES.map(s => (
          <button
            key={s.id}
            onClick={() => navigate(`/customer/book?service=${encodeURIComponent(s.name)}`)}
            className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-800 btn-press text-left transition-colors"
          >
            <span className="text-xl w-8 text-center">{s.emoji}</span>
            <div className="flex-1">
              <p className="font-semibold text-slate-50 text-sm">{s.name}</p>
              <p className="text-slate-500 text-xs">{s.desc}</p>
            </div>
            <ChevronRight size={16} className="text-slate-600" />
          </button>
        ))}
      </div>

      <BottomNav items={NAV} />
    </div>
  )
}
