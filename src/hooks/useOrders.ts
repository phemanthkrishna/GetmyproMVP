import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Order } from '../types'

export function useOrders(filter: Record<string, string>) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchOrders() {
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false })
    for (const [col, val] of Object.entries(filter)) {
      query = query.eq(col, val)
    }
    const { data, error } = await query
    if (error) console.error('Failed to load orders:', error.message)
    else if (data) setOrders(data as Order[])
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()

    const channel = supabase
      .channel('orders-' + Object.keys(filter).join('-'))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => fetchOrders())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [JSON.stringify(filter)])

  return { orders, loading, refetch: fetchOrders }
}

export function useOrder(orderId: string) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchOrder() {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()
    if (error) console.error('Failed to load order:', error.message)
    else if (data) setOrder(data as Order)
    setLoading(false)
  }

  useEffect(() => {
    fetchOrder()

    // Real-time subscription — no server-side filter (requires REPLICA IDENTITY FULL)
    // Instead filter client-side on the payload's id field
    const channel = supabase
      .channel('order-' + orderId)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => { if (payload.new.id === orderId) setOrder(payload.new as Order) }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orderId])

  return { order, loading, refetch: fetchOrder }
}
