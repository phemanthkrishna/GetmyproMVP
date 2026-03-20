import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useStoreAuth } from '../context/StoreAuthContext'
import { BottomNav } from '../components/BottomNav'
import type { StoreOrder } from '../types'
import { Bell, ChevronRight, Package } from 'lucide-react'

function statusLabel(status: string, matCollected: boolean) {
  if (matCollected) return { text: 'Collected', color: 'text-green-400 bg-green-500/10' }
  switch (status) {
    case 'quote_sent': return { text: 'Add Prices', color: 'text-orange-400 bg-orange-500/10' }
    case 'in_progress': return { text: 'Pack Goods', color: 'text-blue-400 bg-blue-500/10' }
    default: return { text: status, color: 'text-slate-400 bg-slate-800' }
  }
}

export default function Dashboard() {
  const { store } = useStoreAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<StoreOrder[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    if (!store) return
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('mat_store_id', store.id)
      .order('created_at', { ascending: false })
    if (error) { toast.error('Failed to load orders'); return }
    setOrders((data as StoreOrder[]) || [])
    setLoading(false)
  }, [store])

  useEffect(() => {
    fetchOrders()
    if (!store) return
    const channel = supabase
      .channel('store-orders-' + store.id)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `mat_store_id=eq.${store.id}`,
      }, () => { fetchOrders(); toast.info('Order updated') })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [store, fetchOrders])

  const active = orders.filter(o => !o.mat_collected && ['quote_sent', 'in_progress'].includes(o.status))
  const collected = orders.filter(o => o.mat_collected || o.status === 'material_collected')
  const needsAction = active.filter(o => o.status === 'quote_sent').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="page-content px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-black font-heading text-slate-50">{store?.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{store?.store_type}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">{store?.commission_pct}% commission</span>
          </div>
        </div>
      </div>

      {/* Active orders */}
      {active.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Active Orders</p>
          <div className="flex flex-col gap-3">
            {active.map(order => {
              const badge = statusLabel(order.status, order.mat_collected)
              const needsPrice = order.status === 'quote_sent'
              return (
                <button
                  key={order.id}
                  onClick={() => navigate('/order/' + order.id)}
                  className={`w-full text-left bg-slate-900 rounded-2xl p-4 border ${needsPrice ? 'border-orange-500/60 pulse-border' : 'border-slate-800'}`}
                >
                  {needsPrice && (
                    <div className="flex items-center gap-2 mb-2">
                      <Bell size={14} className="text-orange-400" />
                      <span className="text-orange-400 text-xs font-bold uppercase tracking-wide">Action Required</span>
                    </div>
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{order.service_emoji}</span>
                        <span className="font-bold text-slate-50 text-sm">{order.service}</span>
                      </div>
                      <p className="text-slate-500 text-xs">{order.address.slice(0, 50)}{order.address.length > 50 ? '…' : ''}</p>
                      {order.worker_name && <p className="text-slate-400 text-xs mt-1">Worker: {order.worker_name}</p>}
                      {order.store_earnings != null && (
                        <p className="text-green-400 text-xs font-bold mt-1">You earn: ₹{order.store_earnings.toFixed(2)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.color}`}>{badge.text}</span>
                      <ChevronRight size={16} className="text-slate-600" />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Collected orders */}
      {collected.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Collected</p>
          <div className="flex flex-col gap-2">
            {collected.slice(0, 10).map(order => (
              <button
                key={order.id}
                onClick={() => navigate('/order/' + order.id)}
                className="w-full text-left bg-slate-900/50 border border-slate-800 rounded-2xl p-3 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span>{order.service_emoji}</span>
                    <span className="text-slate-300 text-sm font-semibold">{order.service}</span>
                  </div>
                  {order.store_earnings != null && (
                    <p className="text-green-400 text-xs font-semibold mt-0.5">₹{order.store_earnings.toFixed(2)} earned</p>
                  )}
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-green-400 bg-green-500/10">Collected ✓</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package size={48} className="text-slate-700 mb-4" />
          <p className="text-slate-400 font-bold text-lg">No orders yet</p>
          <p className="text-slate-600 text-sm mt-1">New orders will appear here automatically</p>
        </div>
      )}

      <BottomNav pendingCount={needsAction} />
    </div>
  )
}
