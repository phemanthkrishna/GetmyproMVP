import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useOrder } from '../../hooks/useOrders'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { StatusBadge } from '../../components/StatusBadge'
import { formatDate, formatCurrency } from '../../lib/utils'
import { ArrowLeft, Phone } from 'lucide-react'
import type { Worker, QuoteMaterial } from '../../types'

interface StoreRow { id: string; name: string; store_type: string; contact: string }

export default function AdminOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>()
  const { order, loading, refetch } = useOrder(orderId!)
  const navigate = useNavigate()
  const [workers, setWorkers] = useState<Worker[]>([])
  const [stores, setStores] = useState<StoreRow[]>([])
  const [selectedWorker, setSelectedWorker] = useState('')
  const [selectedStore, setSelectedStore] = useState('')
  const [matCost, setMatCost] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('workers').select('*').eq('verified', true).eq('is_active', true).eq('is_online', true)
      .then(({ data, error }) => { if (!error) setWorkers((data as Worker[]) || []) })
    supabase.from('stores').select('id,name,store_type,contact').order('name')
      .then(({ data, error }) => { if (!error) setStores((data as StoreRow[]) || []) })
  }, [])

  if (loading) return <div className="p-6 text-slate-400">Loading...</div>
  if (!order) return <div className="p-6 text-slate-400">Order not found</div>

  const matchingWorkers = workers.filter(w =>
    w.service_categories?.includes(order.service) || w.service === order.service
  )
  const workerOptions = matchingWorkers.length > 0 ? matchingWorkers : workers

  async function assignWorker() {
    if (!selectedWorker) return toast.error('Select a worker')
    const w = workers.find(wk => wk.id === selectedWorker)
    if (!w) return
    setSaving(true)
    const { error } = await supabase.from('orders').update({
      worker_id: w.id,
      worker_name: w.name,
      worker_phone: w.phone,
    }).eq('id', order!.id)
    if (error) toast.error('Failed to assign worker, please try again')
    else { toast.success('Worker assigned ✓'); refetch() }
    setSaving(false)
  }

  async function approveLabour() {
    setSaving(true)
    const labourAmt = order!.labour_pending_amount || 0
    const validMats = Array.isArray(order!.quote_materials) && order!.quote_materials.length > 0
    const update: Record<string, any> = {
      quote_labour: labourAmt,
      labour_approval_pending: false,
      labour_pending_amount: null,
      status: 'quote_sent',
    }
    if (!validMats) {
      update.mat_cost_admin = 0
      update.total_quote = labourAmt
    }
    const { error } = await supabase.from('orders').update(update).eq('id', order!.id)
    if (error) toast.error('Failed to approve, please try again')
    else { toast.success('Labour approved — quote sent ✓'); refetch() }
    setSaving(false)
  }

  async function rejectLabour() {
    setSaving(true)
    const { error } = await supabase.from('orders').update({
      labour_approval_pending: false,
      labour_pending_amount: null,
    }).eq('id', order!.id)
    if (error) toast.error('Failed to reject, please try again')
    else { toast.success('Labour charge rejected — worker will re-enter'); refetch() }
    setSaving(false)
  }

  async function confirmMatCost() {
    if (!matCost || isNaN(Number(matCost))) return toast.error('Enter valid material cost')
    const mat = Number(matCost)
    if (mat < 0) return toast.error('Material cost cannot be negative')
    if (mat > 500_000) return toast.error('Material cost cannot exceed ₹5,00,000')
    setSaving(true)
    const labour = order!.quote_labour || 0
    const { error } = await supabase.from('orders').update({
      mat_cost_admin: mat,
      total_quote: labour + mat,
    }).eq('id', order!.id)
    if (error) toast.error('Failed to confirm material cost, please try again')
    else { toast.success('Quote sent to customer ✓'); refetch() }
    setSaving(false)
  }

  async function confirmFinalPayment() {
    if (!order!.upi_final_ref?.trim()) {
      toast.error('Cannot confirm — no UTR/transaction reference on file')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('orders').update({
      final_paid: true,
      status: 'in_progress',
    }).eq('id', order!.id)
    if (error) toast.error('Failed to confirm payment, please try again')
    else { toast.success('Payment confirmed — work started ✓'); refetch() }
    setSaving(false)
  }

  async function confirmBookingPayment() {
    if (!order!.upi_booking_ref?.trim()) {
      toast.error('Cannot confirm — no UTR/transaction reference on file')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('orders').update({ booking_paid: true }).eq('id', order!.id)
    if (error) toast.error('Failed to confirm payment, please try again')
    else { toast.success('Booking payment confirmed ✓'); refetch() }
    setSaving(false)
  }

  async function assignStore() {
    if (!selectedStore) return toast.error('Select a store')
    const store = stores.find(s => s.id === selectedStore)
    if (!store) return
    const arr = new Uint32Array(1)
    crypto.getRandomValues(arr)
    const otp = String(100000 + (arr[0] % 900000))
    setSaving(true)
    const { error } = await supabase.from('orders').update({
      mat_store_id: store.id,
      mat_store_name: store.name,
      mat_store_contact: store.contact,
      mat_collection_otp: otp,
    }).eq('id', order!.id)
    if (error) toast.error('Failed to assign store, please try again')
    else { toast.success(`Store assigned! Collection OTP: ${otp}`); refetch() }
    setSaving(false)
  }

  async function cancelOrder() {
    if (!confirm('Cancel this order?')) return
    setSaving(true)
    const workerStarted = ['inspecting', 'quote_sent', 'in_progress', 'done_uploaded'].includes(order!.status)
    const updatePayload: Record<string, any> = { status: 'cancelled' }
    if (workerStarted) updatePayload.worker_cancellation_pay = 100
    const { error } = await supabase.from('orders').update(updatePayload).eq('id', order!.id)
    if (error) { toast.error('Failed to cancel order, please try again'); setSaving(false); return }
    toast.success('Order cancelled')
    navigate('/admin')
    setSaving(false)
  }

  return (
    <div className="page-content px-5 py-6">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/admin')} className="text-slate-400"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="font-black font-heading text-slate-50 text-xl">
            {order.service_emoji} {order.service}
          </h1>
          <p className="text-slate-500 text-xs">{order.id} · {formatDate(order.created_at)}</p>
        </div>
        <div className="ml-auto"><StatusBadge status={order.status} /></div>
      </div>

      {/* Customer info */}
      <Card className="mb-4">
        <p className="font-bold text-slate-50 mb-3">Customer</p>
        <div className="flex flex-col gap-2 text-sm">
          <Row label="Name" value={order.customer_name} />
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Phone</span>
            <a href={`tel:${order.customer_phone}`} className="text-blue-400 flex items-center gap-1">
              <Phone size={12} /> {order.customer_phone}
            </a>
          </div>
          <Row label="Address" value={order.address} />
          {order.problem_description && <Row label="Problem" value={order.problem_description} />}
          <Row label="Booking fee" value={formatCurrency(order.booking_amt)} />
          <Row label="Booking paid" value={order.booking_paid ? '✅ Yes' : '❌ Pending'} />
        </div>
      </Card>

      {/* Confirm booking payment if not yet */}
      {!order.booking_paid && (
        <Card className="mb-4 border-amber-500/30">
          <p className="text-amber-400 font-bold mb-2">⚠️ Booking Payment Pending</p>
          <p className="text-slate-400 text-sm mb-3">
            Check your UPI app for ₹{order.booking_amt} from {order.customer_phone}
            {order.upi_booking_ref && ` · Ref: ${order.upi_booking_ref}`}
          </p>
          <Button variant="primary" loading={saving} onClick={confirmBookingPayment}>
            Confirm Booking Payment ✓
          </Button>
        </Card>
      )}

      {/* Assign worker */}
      {order.status === 'booked' && !order.worker_id && order.booking_paid && (
        <Card className="mb-4">
          <p className="font-bold text-slate-50 mb-3">Assign Worker</p>
          {workerOptions.length === 0 ? (
            <p className="text-slate-500 text-sm">No verified workers available for this service.</p>
          ) : (
            <>
              <select
                value={selectedWorker}
                onChange={e => setSelectedWorker(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-50 outline-none mb-3"
              >
                <option value="">Select worker</option>
                {workerOptions.map(w => (
                  <option key={w.id} value={w.id}>{w.name} — {w.service} · {w.phone}</option>
                ))}
              </select>
              <Button variant="accent" loading={saving} onClick={assignWorker}>
                Assign & Notify →
              </Button>
            </>
          )}
        </Card>
      )}

      {/* Worker assigned info */}
      {order.worker_name && (
        <Card className="mb-4">
          <p className="font-bold text-slate-50 mb-2">Worker</p>
          <Row label="Name" value={order.worker_name} />
          <div className="flex justify-between gap-4 mt-2 text-sm">
            <span className="text-slate-500">Phone</span>
            <a href={`tel:${order.worker_phone}`} className="text-blue-400 flex items-center gap-1">
              <Phone size={12} /> {order.worker_phone}
            </a>
          </div>
        </Card>
      )}

      {/* Labour approval — worker submitted > ₹1,000 */}
      {order.labour_approval_pending && (
        <Card className="mb-4 border-amber-500/30 bg-amber-500/10">
          <p className="text-amber-400 font-bold mb-1">⚠️ Labour Approval Required</p>
          <p className="text-slate-400 text-sm mb-3">
            Worker requested labour charge of{' '}
            <span className="text-white font-bold">{formatCurrency(order.labour_pending_amount || 0)}</span>
            {' '}(exceeds ₹1,000 limit)
          </p>
          <div className="flex gap-3">
            <Button variant="accent" loading={saving} onClick={approveLabour} className="flex-1">
              Approve ✓
            </Button>
            <Button variant="danger" loading={saving} onClick={rejectLabour} className="flex-1">
              Reject ✗
            </Button>
          </div>
        </Card>
      )}

      {/* Set material cost */}
      {order.status === 'quote_sent' && (
        <Card className="mb-4">
          <p className="font-bold text-slate-50 mb-3">Worker's Quote</p>
          <div className="flex flex-col gap-1 text-sm mb-3">
            <Row label="Labour" value={formatCurrency(order.quote_labour || 0)} />
            {(Array.isArray(order.quote_materials) ? order.quote_materials as QuoteMaterial[] : []).map((m, i) => (
              <Row key={i} label={m.name} value={`${m.qty} ${m.unit}`} />
            ))}
          </div>
          {order.mat_cost_admin == null ? (
            <>
              <p className="text-blue-400 text-sm mb-3">
                📞 Call customer to confirm scope and agree on material prices
              </p>
              <Input
                label="Set Material Cost (₹)"
                type="number"
                placeholder="e.g. 300"
                value={matCost}
                onChange={e => setMatCost(e.target.value)}
              />
              <Button variant="accent" loading={saving} onClick={confirmMatCost} className="mt-3">
                Confirm & Send Quote to Customer →
              </Button>
            </>
          ) : (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-green-400 text-sm">
              ✓ Material cost: {formatCurrency(order.mat_cost_admin)} · Total quote: {formatCurrency(order.total_quote || 0)}
            </div>
          )}
        </Card>
      )}

      {/* Confirm final payment */}
      {order.status === 'quote_sent' && order.mat_cost_admin != null && !order.final_paid && (
        <Card className="mb-4 border-amber-500/30">
          <p className="text-amber-400 font-bold mb-2">⏳ Awaiting Final Payment</p>
          <p className="text-slate-400 text-sm mb-3">
            Customer needs to pay {formatCurrency(order.total_quote || 0)} via UPI
            {order.upi_final_ref && ` · Ref: ${order.upi_final_ref}`}
          </p>
          <Button variant="primary" loading={saving} onClick={confirmFinalPayment}>
            Confirm Payment & Start Work ✓
          </Button>
        </Card>
      )}

      {/* Material collection — assign store after payment confirmed */}
      {order.status === 'in_progress' && Array.isArray(order.quote_materials) && order.quote_materials.length > 0 && (
        <Card className="mb-4">
          <p className="font-bold text-slate-50 mb-3">🏪 Material Collection</p>
          {!order.mat_store_id ? (
            <>
              <p className="text-slate-400 text-sm mb-3">Select a partner store for the worker to collect materials from.</p>
              <select
                value={selectedStore}
                onChange={e => setSelectedStore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-50 outline-none mb-3"
              >
                <option value="">Select store</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name} — {s.store_type} · {s.contact}</option>
                ))}
              </select>
              <Button variant="accent" loading={saving} onClick={assignStore}>
                Assign Store & Generate OTP →
              </Button>
            </>
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              <Row label="Store" value={order.mat_store_name || '—'} />
              <Row label="Contact" value={order.mat_store_contact || '—'} />
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mt-1">
                <p className="text-amber-400 text-xs font-semibold mb-1">Collection OTP (share with store)</p>
                <p className="text-white font-black text-3xl tracking-widest text-center">{order.mat_collection_otp}</p>
              </div>
              {order.mat_collected ? (
                <p className="text-green-400 text-sm font-semibold text-center">✓ Worker collected materials</p>
              ) : (
                <p className="text-amber-400 text-sm text-center">⏳ Waiting for worker to collect</p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Completion photo */}
      {['done_uploaded', 'completed'].includes(order.status) && order.job_photo_url && (
        <Card className="mb-4">
          <p className="font-bold text-slate-50 mb-2">Completion Photo</p>
          <img src={order.job_photo_url} alt="Job done" className="rounded-xl w-full object-cover" />
          {order.status === 'done_uploaded' && (
            <div className="mt-3 bg-slate-900 rounded-xl p-3">
              <p className="text-slate-400 text-xs">Completion OTP</p>
              <p className="text-white font-black text-2xl tracking-widest">{order.comp_otp}</p>
            </div>
          )}
        </Card>
      )}

      {/* Cancel */}
      {!['completed', 'cancelled'].includes(order.status) && (
        <Button variant="danger" onClick={cancelOrder} loading={saving}>
          Cancel Order
        </Button>
      )}
      {order.status === 'cancelled' && (
        <Card className="mt-4 border-red-500/30 bg-red-500/10">
          <p className="text-red-400">This order has been cancelled.</p>
        </Card>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-300 text-right">{value}</span>
    </div>
  )
}
