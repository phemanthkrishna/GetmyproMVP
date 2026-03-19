import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SERVICES } from '../../constants'
import { BottomNav } from '../../components/BottomNav'
import { StatusBadge } from '../../components/StatusBadge'
import { ThemeToggle } from '../../components/ThemeToggle'
import { useAuth } from '../../context/AuthContext'
import { useOrders } from '../../hooks/useOrders'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../lib/utils'
import { Home, BookOpen, List, LogOut } from 'lucide-react'

const NAV = [
  { to: '/customer', icon: Home, label: 'Home' },
  { to: '/customer/book', icon: BookOpen, label: 'Book' },
  { to: '/customer/orders', icon: List, label: 'Orders' },
]

interface ReadyAlert { service: string; emoji: string }

export default function CustomerHome() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const { orders } = useOrders({ customer_id: session?.id || '' })
  const active = orders.filter(o => !['completed', 'cancelled'].includes(o.status))
  const [readyAlerts, setReadyAlerts] = useState<ReadyAlert[]>([])

  useEffect(() => {
    if (!session?.id) return
    checkAlerts()

    // Re-check whenever any worker's online status changes
    const channel = supabase
      .channel('home-partner-status')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'workers' }, () => checkAlerts())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session?.id])

  async function checkAlerts() {
    if (!session?.id) return
    const { data: alerts } = await supabase
      .from('service_alerts')
      .select('service')
      .eq('customer_id', session.id)
    if (!alerts?.length) { setReadyAlerts([]); return }

    const { data: onlineWorkers } = await supabase
      .from('workers')
      .select('service, service_categories')
      .eq('verified', true)
      .eq('is_active', true)
      .eq('is_online', true)

    const ready = alerts
      .filter(alert =>
        (onlineWorkers || []).some(w =>
          w.service === alert.service ||
          (Array.isArray(w.service_categories) && w.service_categories.includes(alert.service))
        )
      )
      .map(alert => ({
        service: alert.service,
        emoji: SERVICES.find(s => s.name === alert.service)?.emoji || '🔧',
      }))
    setReadyAlerts(ready)
  }

  async function dismissAlert(service: string) {
    if (!session?.id) return
    await supabase.from('service_alerts').delete()
      .eq('customer_id', session.id)
      .eq('service', service)
    setReadyAlerts(prev => prev.filter(a => a.service !== service))
  }

  return (
    <div className="page-content px-5 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-slate-500 text-sm">Hello, {session?.name?.split(' ')[0]}</p>
          <h1 className="text-2xl font-black font-heading text-slate-50 mt-0.5">What do you need?</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={signOut} className="flex items-center gap-1.5 text-red-400 text-xs font-semibold">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      {/* Partner availability notifications */}
      {readyAlerts.length > 0 && (
        <div className="mb-5">
          {readyAlerts.map(alert => (
            <div
              key={alert.service}
              className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-2 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl shrink-0">{alert.emoji}</span>
                <div className="min-w-0">
                  <p className="text-green-400 font-bold text-sm leading-tight">
                    {alert.service} partners are online!
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">Ready to accept your booking now</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    dismissAlert(alert.service)
                    navigate(`/customer/book?service=${encodeURIComponent(alert.service)}`)
                  }}
                  className="text-xs bg-green-500 text-white font-bold px-3 py-1.5 rounded-lg whitespace-nowrap"
                >
                  Book now
                </button>
                <button
                  onClick={() => dismissAlert(alert.service)}
                  className="text-slate-500 text-xs"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
      <div className="grid grid-cols-3 gap-3">
        {SERVICES.map(s => (
          <button
            key={s.id}
            onClick={() => navigate(`/customer/book?service=${encodeURIComponent(s.name)}`)}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-slate-800 border border-slate-700 py-4 px-2 btn-press transition-colors hover:border-orange-500/50 hover:bg-slate-700"
          >
            <span className="text-3xl">{s.emoji}</span>
            <p className="font-semibold text-slate-50 text-xs text-center leading-tight">{s.name}</p>
            <p className="text-slate-500 text-xs text-center leading-tight">{s.desc}</p>
          </button>
        ))}
      </div>

      <BottomNav items={NAV} />
    </div>
  )
}
