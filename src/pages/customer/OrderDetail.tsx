import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useOrder } from '../../hooks/useOrders'
import { StatusBadge } from '../../components/StatusBadge'
import { JourneyTracker } from '../../components/JourneyTracker'
import { LiveTrackingMap } from '../../components/LiveTrackingMap'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { supabase } from '../../lib/supabase'
import { formatDate, formatCurrency } from '../../lib/utils'
import { TRANSACTION_FEE_RATE } from '../../constants'
import { ArrowLeft, Star } from 'lucide-react'

export default function CustomerOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>()
  const { order, loading, refetch } = useOrder(orderId!)
  const [rating, setRating] = useState(0)
  const [upiRef, setUpiRef] = useState('')
  const [saving, setSaving] = useState(false)
  const [workerPhoto, setWorkerPhoto] = useState<string | null>(null)
  const [paymentSubmitted, setPaymentSubmitted] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (order?.worker_id) {
      supabase.from('workers').select('photo_url').eq('id', order.worker_id).maybeSingle()
        .then(({ data, error }) => {
          if (!error) setWorkerPhoto(data?.photo_url || null)
        })
    }
  }, [order?.worker_id])

  async function handleFinalPay() {
    if (!order) return
    if (!order.total_quote) return toast.error('Quote amount not available yet')
    setSaving(true)
    try {
      const { error } = await supabase.from('orders').update({ upi_final_ref: upiRef || 'pending' }).eq('id', order.id)
      if (error) throw error
      toast.success('Payment submitted! Admin will confirm shortly.')
      setPaymentSubmitted(true)
    } catch (err: any) {
      console.error('Final pay submit failed:', err)
      toast.error(err?.message || 'Failed to submit, please try again')
    }
    setSaving(false)
  }

  async function cancelOrder() {
    if (!order) return
    if (order.status === 'cancelled') return // idempotency guard
    if (!confirm('Cancel this order? The worker has already visited, so ₹100 of your booking fee will go to the Pro.')) return
    setSaving(true)
    try {
      const workerVisited = ['inspecting', 'quote_sent', 'in_progress', 'done_uploaded', 'worker_visiting'].includes(order.status)
      const { error } = await supabase.from('orders').update({
        status: 'cancelled',
        worker_cancellation_pay: workerVisited ? 100 : 0,
      }).eq('id', order.id).neq('status', 'cancelled') // extra server-side idempotency
      if (error) throw error
      toast.success('Order cancelled.')
      refetch()
    } catch (err: any) {
      console.error('Cancel order failed:', err)
      toast.error(err?.message || 'Failed to cancel order, please try again')
    }
    setSaving(false)
  }

  async function submitRating(val: number) {
    if (!order) return
    setRating(val)
    const { error } = await supabase.from('orders').update({ rating: val }).eq('id', order.id)
    if (error) { console.error('Rating submit failed:', error); return }
    toast.success('Thank you for your rating! ⭐')
    refetch()
  }

  if (loading) return <div className="p-6 text-slate-400">Loading...</div>
  if (!order) return <div className="p-6 text-slate-400">Order not found</div>

  return (
    <div className="page-content px-5 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/customer/orders')} className="text-slate-400">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-black font-heading text-slate-50 text-xl">{order.service}</h1>
          <p className="text-slate-500 text-xs">{order.id} · {formatDate(order.created_at)}</p>
        </div>
        <div className="ml-auto"><StatusBadge status={order.status} /></div>
      </div>

      {/* Journey */}
      <Card className="mb-4">
        <p className="font-bold text-slate-50 mb-4">Order Journey</p>
        <JourneyTracker status={order.status} />
      </Card>

      {/* Details */}
      <Card className="mb-4">
        <p className="font-bold text-slate-50 mb-3">Details</p>
        <div className="flex flex-col gap-2 text-sm">
          <Row label="Address" value={order.address} />
          {order.problem_description && <Row label="Problem" value={order.problem_description} />}
          {order.worker_name && (
            <div className="flex items-center gap-3 py-1">
              <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center text-sm font-bold text-slate-50 shrink-0">
                {workerPhoto
                  ? <img src={workerPhoto} alt={order.worker_name} className="w-full h-full object-cover" />
                  : order.worker_name[0]
                }
              </div>
              <div>
                <p className="text-slate-50 text-sm font-semibold">{order.worker_name}</p>
                <p className="text-slate-500 text-xs">Your assigned Pro</p>
              </div>
            </div>
          )}
          <Row label="Booking fee" value={formatCurrency(order.booking_amt)} />
          <Row
            label="Payment status"
            value={order.booking_paid ? '✅ Booking paid' : '⏳ Awaiting payment confirmation'}
          />
        </div>
      </Card>

      {/* Live tracking map — worker en route */}
      {order.worker_id && (order.status === 'booked' || order.status === 'worker_visiting') && (
        <Card className="mb-4">
          <p className="font-bold text-slate-50 mb-3">🚗 Live Tracking</p>
          <LiveTrackingMap
            workerId={order.worker_id}
            workerName={order.worker_name || 'Pro'}
            customerLat={order.customer_lat}
            customerLng={order.customer_lng}
          />
        </Card>
      )}

      {/* Arrival OTP — show when worker assigned but not yet visiting confirmed */}
      {order.worker_id && order.status === 'booked' && (
        <Card className="mb-4 border-amber-500/30 bg-amber-500/10">
          <p className="text-amber-400 font-bold mb-1">🚗 Arrival OTP</p>
          <p className="text-slate-400 text-sm mb-2">Share this code with the worker when they arrive:</p>
          <div className="text-4xl font-black text-white tracking-widest text-center py-2">
            {order.arrival_otp}
          </div>
        </Card>
      )}

      {/* Status-specific actions */}
      {order.status === 'booked' && !order.worker_id && (
        <Card className="mb-4 border-blue-500/30 bg-blue-500/10">
          <p className="text-blue-400 text-sm">We're assigning the best Pro near you 🔍</p>
        </Card>
      )}

      {order.status === 'worker_visiting' && (
        <Card className="mb-4 border-amber-500/30 bg-amber-500/10">
          <p className="text-amber-400 text-sm">Worker is on the way to check the job and send a quote 🚗</p>
        </Card>
      )}

      {order.status === 'quote_sent' && order.mat_cost_admin != null && (
        <Card className="mb-4">
          <p className="font-bold text-slate-50 mb-3">📋 Your Quote</p>
          <div className="flex flex-col gap-2 text-sm">
            <Row label="Labour charges" value={formatCurrency(order.quote_labour || 0)} />
            <Row label="Material cost" value={formatCurrency(order.mat_cost_admin || 0)} />
            <Row
              label="Transaction fee (2.5%)"
              value={formatCurrency(Math.round((order.total_quote || 0) * TRANSACTION_FEE_RATE * 100) / 100)}
            />
          </div>
          <div className="border-t border-slate-700 mt-3 pt-3 flex justify-between items-center">
            <span className="font-bold text-slate-50">Total to pay</span>
            <span className="font-black text-orange-400 text-xl">
              {formatCurrency(Math.round((order.total_quote || 0) * (1 + TRANSACTION_FEE_RATE) * 100) / 100)}
            </span>
          </div>
          <div className="mt-3">
            {!paymentSubmitted ? (
              <>
                <input
                  placeholder="Paste UTR / transaction ref (optional)"
                  value={upiRef}
                  onChange={e => setUpiRef(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-50 text-sm placeholder-slate-600 outline-none mb-3"
                />
                <Button size="lg" variant="accent" loading={saving} onClick={handleFinalPay}>
                  Submit Payment →
                </Button>
                <button
                  onClick={cancelOrder}
                  disabled={saving}
                  className="w-full mt-2 py-2.5 text-sm font-semibold text-red-400 border border-red-500/30 rounded-xl bg-red-500/10 disabled:opacity-50"
                >
                  Cancel Order
                </button>
                <p className="text-slate-600 text-xs text-center mt-1.5">
                  Note: ₹100 of your booking fee will be paid to the Pro for their visit.
                </p>
              </>
            ) : (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
                <p className="text-blue-300 font-semibold text-sm">⏳ Payment submitted</p>
                <p className="text-slate-400 text-xs mt-1">Waiting for admin to confirm your payment. Work will start shortly.</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {order.status === 'in_progress' && (
        <Card className="mb-4 border-orange-500/30 bg-orange-500/10">
          <p className="text-orange-400 text-sm">Work in progress! Worker will upload a photo when done 🔧</p>
        </Card>
      )}

      {order.status === 'done_uploaded' && (
        <Card className="mb-4 border-green-500/30 bg-green-500/10">
          <p className="text-green-400 font-bold mb-1">✅ Completion OTP</p>
          <p className="text-slate-400 text-sm mb-2">Share this code with the worker to confirm job is done:</p>
          <div className="text-5xl font-black text-white tracking-widest text-center py-3">
            {order.comp_otp}
          </div>
        </Card>
      )}

      {order.status === 'completed' && (
        <>
          {order.job_photo_url && (
            <Card className="mb-4">
              <p className="font-bold text-slate-50 mb-2">Completion Photo</p>
              <img src={order.job_photo_url} alt="Job done" className="rounded-xl w-full object-cover" />
            </Card>
          )}
          <Card className="mb-4 border-green-500/30 bg-green-500/10">
            <p className="text-green-400 font-bold">🎉 Job Completed!</p>
            <p className="text-slate-400 text-sm mt-1">Thank you for using GetMyPro</p>
          </Card>
          {!order.rating && (
            <Card className="mb-4">
              <p className="font-bold text-slate-50 mb-3">Rate your experience</p>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => submitRating(n)}>
                    <Star
                      size={32}
                      className={n <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}
                    />
                  </button>
                ))}
              </div>
            </Card>
          )}
          {order.rating && (
            <Card>
              <div className="flex items-center gap-2">
                <span className="text-amber-400">{'★'.repeat(order.rating)}</span>
                <span className="text-slate-400 text-sm">You rated this job</span>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-300 text-right">{value}</span>
    </div>
  )
}
