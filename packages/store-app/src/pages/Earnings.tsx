import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useStoreAuth } from '../context/StoreAuthContext'
import { BottomNav } from '../components/BottomNav'
import type { StoreOrder } from '../types'

export default function Earnings() {
  const { store } = useStoreAuth()
  const [orders, setOrders] = useState<StoreOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!store) return
    supabase
      .from('orders')
      .select('id, service, service_emoji, store_earnings, created_at')
      .eq('mat_store_id', store.id)
      .eq('mat_collected', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders((data as StoreOrder[]) || [])
        setLoading(false)
      })
  }, [store])

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const totalEarnings = (filter: (d: Date) => boolean) =>
    orders.filter(o => filter(new Date(o.created_at))).reduce((s, o) => s + (o.store_earnings || 0), 0)

  const today = totalEarnings(d => d >= todayStart)
  const week = totalEarnings(d => d >= weekStart)
  const month = totalEarnings(d => d >= monthStart)
  const total = orders.reduce((s, o) => s + (o.store_earnings || 0), 0)

  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 })

  const stats: [string, string][] = [
    ['Today', fmt(today)],
    ['This Week', fmt(week)],
    ['This Month', fmt(month)],
    ['Total Jobs', String(orders.length)],
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="page-content px-4 py-6">
      <h1 className="text-2xl font-black font-heading text-slate-50 mb-5">Your Earnings</h1>

      {/* Summary grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {stats.map(([label, value]) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wide mb-1">{label}</p>
            <p className="text-xl font-black text-slate-50">{value}</p>
          </div>
        ))}
      </div>

      {/* Total earnings highlight */}
      <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-4 mb-5 text-center">
        <p className="text-slate-400 text-sm mb-1">Total Earnings (All Time)</p>
        <p className="text-3xl font-black gradient-text">{fmt(total)}</p>
      </div>

      {/* Settlement info banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-5">
        <p className="text-amber-400 text-sm leading-relaxed">
          Earnings are settled to your registered bank account by GetMyPro. Questions? Contact your GetMyPro coordinator.
        </p>
      </div>

      {/* Order history */}
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Order History</p>
      {orders.length === 0 ? (
        <p className="text-slate-600 text-sm text-center py-8">No completed orders yet</p>
      ) : (
        <div className="flex flex-col divide-y divide-slate-800">
          {orders.map(o => (
            <div key={o.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-slate-50 text-sm font-semibold">{o.service_emoji} {o.service}</p>
                <p className="text-slate-500 text-xs">
                  {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <p className="text-green-400 font-bold">{fmt(o.store_earnings || 0)}</p>
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
