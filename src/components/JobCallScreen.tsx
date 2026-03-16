import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import type { Order } from '../types'

const TIMEOUT_SECS = 30

interface WorkerMeta {
  service_categories: string[]
  is_online: boolean
  verified: boolean
  is_active: boolean
}

interface Props {
  workerId: string
  workerName: string
  workerPhone: string
}

export function JobCallScreen({ workerId, workerName, workerPhone }: Props) {
  const [workerMeta, setWorkerMeta] = useState<WorkerMeta | null>(null)
  const [queue, setQueue] = useState<Order[]>([])
  const [countdown, setCountdown] = useState(TIMEOUT_SECS)
  const [accepting, setAccepting] = useState(false)
  const navigate = useNavigate()
  const currentRef = useRef<Order | null>(null)

  // ── Load and watch worker meta ──────────────────────────────────────
  useEffect(() => {
    supabase.from('workers')
      .select('service_categories, is_online, verified, is_active')
      .eq('id', workerId)
      .single()
      .then(({ data }) => setWorkerMeta(data as WorkerMeta))

    const ch = supabase.channel(`worker-meta-${workerId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'workers',
        filter: `id=eq.${workerId}`,
      }, payload => setWorkerMeta(payload.new as WorkerMeta))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [workerId])

  // ── When meta changes, clear queue if no longer eligible ────────────
  useEffect(() => {
    if (!workerMeta) return
    const eligible = workerMeta.verified && workerMeta.is_active && workerMeta.is_online
    if (!eligible) { setQueue([]); return }
    loadPendingOrders(workerMeta)
  }, [workerMeta])

  async function isBusy(): Promise<boolean> {
    const { data } = await supabase
      .from('orders')
      .select('id')
      .eq('worker_id', workerId)
      .not('status', 'in', '(completed,cancelled)')
      .limit(1)
    return (data?.length ?? 0) > 0
  }

  async function loadPendingOrders(meta: WorkerMeta) {
    if (await isBusy()) return
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'booked')
      .is('worker_id', null)
      .not('declined_worker_ids', 'cs', `{${workerId}}`)
      .order('created_at', { ascending: true })
    const cats = meta.service_categories || []
    const relevant = (data as Order[] || []).filter(o =>
      cats.length === 0 || cats.includes(o.service)
    )
    setQueue(relevant)
  }

  // ── Subscribe to incoming orders ────────────────────────────────────
  useEffect(() => {
    const ch = supabase.channel(`job-requests-${workerId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async payload => {
        if (!workerMeta?.verified || !workerMeta?.is_active || !workerMeta?.is_online) return
        const order = payload.new as Order
        if (order.status !== 'booked' || order.worker_id) return
        if ((order.declined_worker_ids || []).includes(workerId)) return
        const cats = workerMeta.service_categories || []
        if (cats.length > 0 && !cats.includes(order.service)) return
        if (await isBusy()) return
        if ('vibrate' in navigator) navigator.vibrate([400, 150, 400, 150, 400])
        setQueue(prev => {
          if (prev.find(o => o.id === order.id)) return prev
          return [...prev, order]
        })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
        const updated = payload.new as Order
        // Remove from queue if taken by another worker
        if (updated.worker_id && updated.worker_id !== workerId) {
          setQueue(prev => prev.filter(o => o.id !== updated.id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [workerId, workerMeta])

  const current = queue[0] ?? null
  currentRef.current = current

  // ── Countdown timer per order ───────────────────────────────────────
  useEffect(() => {
    if (!current) return
    setCountdown(TIMEOUT_SECS)

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          const ord = currentRef.current
          if (ord) doDecline(ord)
          return TIMEOUT_SECS
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [current?.id])

  // ── Actions ─────────────────────────────────────────────────────────
  async function doDecline(order: Order) {
    await supabase.rpc('decline_job', { p_order_id: order.id, p_worker_id: workerId })
    setQueue(prev => prev.filter(o => o.id !== order.id))
  }

  async function handleAccept() {
    if (!current || accepting) return
    setAccepting(true)

    // Atomic claim — only succeeds if still unassigned
    const { data, error } = await supabase
      .from('orders')
      .update({ worker_id: workerId, worker_name: workerName, worker_phone: workerPhone })
      .eq('id', current.id)
      .is('worker_id', null)
      .select('id')

    if (error || !data?.length) {
      toast.error('Job was just taken by another pro')
      setQueue(prev => prev.filter(o => o.id !== current.id))
      setAccepting(false)
      return
    }

    toast.success('Job accepted! 🎉')
    setQueue([])
    navigate(`/worker/job/${current.id}`)
    setAccepting(false)
  }

  async function handleDecline() {
    if (!current) return
    await doDecline(current)
  }

  if (!current) return null

  // Countdown ring math
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - countdown / TIMEOUT_SECS)
  const urgent = countdown <= 8

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-slate-950 px-6 py-12">
      {/* Top label */}
      <div className="text-center">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Incoming Job Request</p>
        {queue.length > 1 && (
          <p className="text-slate-500 text-xs mt-1">{queue.length - 1} more waiting</p>
        )}
      </div>

      {/* Animated rings + emoji */}
      <div className="relative flex items-center justify-center">
        {/* Pulse rings */}
        <div className="absolute w-64 h-64 rounded-full border border-orange-500/10 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute w-56 h-56 rounded-full border border-orange-500/15 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.4s' }} />
        <div className="absolute w-48 h-48 rounded-full border border-orange-500/20 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.8s' }} />

        {/* Countdown SVG ring */}
        <svg className="absolute w-44 h-44 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#1e293b" strokeWidth="5" />
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={urgent ? '#ef4444' : '#f97316'}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>

        {/* Emoji core */}
        <div className="w-36 h-36 rounded-full bg-slate-900 border-2 border-orange-500/30 flex flex-col items-center justify-center z-10 shadow-2xl">
          <span className="text-6xl">{current.service_emoji}</span>
        </div>
      </div>

      {/* Job details */}
      <div className="w-full text-center space-y-1">
        <h2 className="text-white font-black font-heading text-3xl">{current.service}</h2>
        <p className="text-slate-400 text-sm truncate">{current.address}</p>
        <p className="text-slate-600 text-xs">₹100 visit charge guaranteed</p>
        <p className={`text-sm font-bold mt-3 transition-colors ${urgent ? 'text-red-400' : 'text-slate-400'}`}>
          {urgent ? `⚠️ Auto-decline in ${countdown}s` : `Auto-decline in ${countdown}s`}
        </p>
      </div>

      {/* Buttons */}
      <div className="w-full flex gap-4">
        <button
          onClick={handleDecline}
          className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl bg-slate-800 border border-slate-700 active:scale-95 transition-transform"
        >
          <span className="text-2xl">✕</span>
          <span className="text-white font-bold text-sm">Decline</span>
        </button>
        <button
          onClick={handleAccept}
          disabled={accepting}
          className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl bg-green-500 active:scale-95 transition-transform disabled:opacity-60"
        >
          <span className="text-2xl">{accepting ? '⏳' : '✓'}</span>
          <span className="text-white font-bold text-sm">{accepting ? 'Accepting...' : 'Accept'}</span>
        </button>
      </div>
    </div>
  )
}
