import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useOrder } from '../../hooks/useOrders'
import { useAuth } from '../../context/AuthContext'
import { useWorkerLocation } from '../../hooks/useWorkerLocation'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { OtpInput } from '../../components/OtpInput'
import { StatusBadge } from '../../components/StatusBadge'
import { supabase } from '../../lib/supabase'
import { formatDate, formatCurrency } from '../../lib/utils'
import { ArrowLeft, Upload, Plus, X, Navigation } from 'lucide-react'
import type { QuoteMaterial } from '../../types'

const UNITS = ['nos', 'm', 'kg', 'L', 'box', 'pkt']

export default function JobDetail() {
  const { orderId } = useParams<{ orderId: string }>()
  const { order, loading, refetch } = useOrder(orderId!)
  const { session } = useAuth()
  const navigate = useNavigate()

  const [hasActiveJob, setHasActiveJob] = useState(false)

  useEffect(() => {
    if (!session?.id) return
    supabase
      .from('orders')
      .select('id')
      .eq('worker_id', session.id)
      .not('status', 'in', '("completed","cancelled")')
      .then(({ data }) => setHasActiveJob((data?.length ?? 0) > 0))
  }, [session?.id])

  // Broadcast live GPS while en route to customer
  const isEnRoute = order?.worker_id === session?.id && order?.status === 'booked'
  useWorkerLocation(session?.id ?? '', isEnRoute)

  // OTP rate-limiting state (5 attempts → 60s lockout per OTP type)
  const [arrivalAttempts, setArrivalAttempts] = useState(0)
  const [arrivalLockedUntil, setArrivalLockedUntil] = useState<number | null>(null)
  const [compAttempts, setCompAttempts] = useState(0)
  const [compLockedUntil, setCompLockedUntil] = useState<number | null>(null)
  const [matAttempts, setMatAttempts] = useState(0)
  const [matLockedUntil, setMatLockedUntil] = useState<number | null>(null)

  const [arrivalOtp, setArrivalOtp] = useState('')
  const [compOtp, setCompOtp] = useState('')
  const [matCollectionOtp, setMatCollectionOtp] = useState('')
  const [labour, setLabour] = useState('')
  const [needsMaterials, setNeedsMaterials] = useState(false)
  const [materials, setMaterials] = useState<QuoteMaterial[]>([{ name: '', qty: 1, unit: 'nos' }])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [saving, setSaving] = useState(false)

  if (loading) return <div className="p-6 text-slate-400">Loading...</div>
  if (!order) return <div className="p-6 text-slate-400">Job not found</div>

  const isMyJob = order.worker_id === session?.id
  const canAccept = order.status === 'booked' && !order.worker_id

  // Step 1: Accept job
  async function acceptJob() {
    if (!session) return
    if (hasActiveJob) {
      toast.error('Complete your current job before accepting a new one')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('orders').update({
      worker_id: session.id,
      worker_name: session.name,
      worker_phone: session.phone,
      status: 'booked', // stays booked until arrival OTP entered
    }).eq('id', order!.id)
    if (error) toast.error(error.message)
    else { toast.success('Job accepted! Head to the customer 🚗'); refetch() }
    setSaving(false)
  }

  // Enter arrival OTP to confirm arrived
  async function confirmArrival() {
    if (arrivalLockedUntil && Date.now() < arrivalLockedUntil) {
      const secs = Math.ceil((arrivalLockedUntil - Date.now()) / 1000)
      toast.error(`Too many wrong attempts. Try again in ${secs}s`)
      return
    }
    if (arrivalOtp !== order!.arrival_otp) {
      const next = arrivalAttempts + 1
      setArrivalAttempts(next)
      if (next >= 5) { setArrivalLockedUntil(Date.now() + 60_000); setArrivalAttempts(0) }
      toast.error('Wrong OTP — ask customer to check their app')
      return
    }
    setArrivalAttempts(0)
    setSaving(true)
    const { error } = await supabase.from('orders').update({ status: 'inspecting' }).eq('id', order!.id)
    if (error) toast.error('Failed to confirm arrival, please try again')
    else { toast.success('Arrived! Start your inspection 🔍'); refetch() }
    setSaving(false)
  }

  // Start inspection
  async function startInspection() {
    setSaving(true)
    const { error } = await supabase.from('orders').update({ status: 'inspecting' }).eq('id', order!.id)
    if (error) { console.error('Start inspection failed:', error); toast.error(error.message) }
    else { toast.success('Inspection started'); refetch() }
    setSaving(false)
  }

  // Step 2: Send quote (from inspecting status)
  async function sendQuote() {
    if (!labour || isNaN(Number(labour))) return toast.error('Enter labour charges')
    const labourAmt = Number(labour)
    if (labourAmt < 50) return toast.error('Labour charge must be at least ₹50')
    setSaving(true)
    const validMats = needsMaterials ? materials.filter(m => m.name.trim()) : []

    // > ₹1,000 requires admin approval before quote is sent
    if (labourAmt > 1_000) {
      const { error } = await supabase.from('orders').update({
        labour_approval_pending: true,
        labour_pending_amount: labourAmt,
        quote_materials: validMats,
      }).eq('id', order!.id)
      if (error) toast.error(error.message)
      else { toast.success('Amount sent for admin approval ⏳'); refetch() }
      setSaving(false)
      return
    }

    const update: Record<string, any> = {
      quote_labour: labourAmt,
      quote_materials: validMats,
      status: 'quote_sent',
    }
    // No materials — set cost to 0 so quote goes straight to customer
    if (!needsMaterials) {
      update.mat_cost_admin = 0
      update.total_quote = labourAmt
    }
    const { error } = await supabase.from('orders').update(update).eq('id', order!.id)
    if (error) { toast.error(error.message); setSaving(false); return }

    // Auto-assign nearest active store when materials are needed
    if (needsMaterials && validMats.length > 0) {
      const { data: storeData } = await supabase
        .from('stores')
        .select('id, name, contact')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      if (storeData) {
        const arr = new Uint32Array(1)
        crypto.getRandomValues(arr)
        const otp = String(100000 + (arr[0] % 900000))
        await supabase.from('orders').update({
          mat_store_id: storeData.id,
          mat_store_name: storeData.name,
          mat_store_contact: storeData.contact,
          mat_collection_otp: otp,
        }).eq('id', order!.id)
      }
      toast.success('Quote sent — store notified! 📋')
    } else {
      toast.success(needsMaterials ? 'Quote sent to admin! 📋' : 'Quote sent to customer! 📋')
    }
    refetch()
    setSaving(false)
  }

  function addMaterial() {
    setMaterials(m => [...m, { name: '', qty: 1, unit: 'nos' }])
  }
  function removeMaterial(i: number) {
    setMaterials(m => m.filter((_, idx) => idx !== i))
  }
  function updateMaterial(i: number, field: keyof QuoteMaterial, val: string | number) {
    setMaterials(m => m.map((mat, idx) => idx === i ? { ...mat, [field]: val } : mat))
  }

  async function confirmMatCollection() {
    if (matLockedUntil && Date.now() < matLockedUntil) {
      const secs = Math.ceil((matLockedUntil - Date.now()) / 1000)
      toast.error(`Too many wrong attempts. Try again in ${secs}s`)
      return
    }
    if (matCollectionOtp !== order!.mat_collection_otp) {
      const next = matAttempts + 1
      setMatAttempts(next)
      if (next >= 5) { setMatLockedUntil(Date.now() + 60_000); setMatAttempts(0) }
      toast.error('Wrong OTP — ask the store for their collection code')
      return
    }
    setMatAttempts(0)
    setSaving(true)
    const { error } = await supabase.from('orders').update({ mat_collected: true }).eq('id', order!.id)
    if (error) toast.error('Failed to confirm collection, please try again')
    else { toast.success('Materials collected ✓'); refetch() }
    setSaving(false)
  }

  // Upload photo
  async function uploadPhoto(file: File) {
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only JPEG, PNG, WebP or HEIC images are allowed')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB')
      return
    }
    setSaving(true)
    const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    const path = `jobs/${order!.id}.${ext}`
    const { error } = await supabase.storage.from('uploads').upload(path, file, { upsert: true })
    if (error) { toast.error('Upload failed, please try again'); setSaving(false); return }
    const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path)
    const { error: updateError } = await supabase.from('orders').update({ job_photo_url: publicUrl }).eq('id', order!.id)
    if (updateError) { console.error('Photo URL save failed:', updateError); toast.error(updateError.message); setSaving(false); return }
    toast.success('Photo uploaded ✓')
    refetch()
    setSaving(false)
  }

  // Mark done + verify comp OTP
  async function markDone() {
    if (!order!.job_photo_url && !photoFile) return toast.error('Upload a completion photo first')
    setSaving(true)
    const { error } = await supabase.from('orders').update({ status: 'done_uploaded' }).eq('id', order!.id)
    if (error) { console.error('Mark done failed:', error); toast.error(error.message) }
    else { toast.success('Done! Ask customer for their OTP'); refetch() }
    setSaving(false)
  }

  async function verifyCompOtp() {
    if (compLockedUntil && Date.now() < compLockedUntil) {
      const secs = Math.ceil((compLockedUntil - Date.now()) / 1000)
      toast.error(`Too many wrong attempts. Try again in ${secs}s`)
      return
    }
    if (compOtp !== order!.comp_otp) {
      const next = compAttempts + 1
      setCompAttempts(next)
      if (next >= 5) { setCompLockedUntil(Date.now() + 60_000); setCompAttempts(0) }
      toast.error('Wrong OTP — ask customer to check their app')
      return
    }
    setCompAttempts(0)
    setSaving(true)
    const { error } = await supabase.from('orders').update({ status: 'completed' }).eq('id', order!.id)
    if (error) toast.error('Failed to complete job, please try again')
    else { toast.success('Job complete! Payment will be credited ✓'); navigate('/worker') }
    setSaving(false)
  }

  return (
    <div className="page-content px-5 py-6">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/worker')} className="text-slate-400"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="font-black font-heading text-slate-50 text-xl">{order.service}</h1>
          <p className="text-slate-500 text-xs">{order.id}</p>
        </div>
        <div className="ml-auto"><StatusBadge status={order.status} /></div>
      </div>

      {/* Job details */}
      <Card className="mb-4">
        <div className="flex flex-col gap-2 text-sm">
          <Row label="Address" value={order.address} />
          <Row label="Customer" value={`${order.customer_name} · ${order.customer_phone}`} />
          {order.problem_description && <Row label="Problem" value={order.problem_description} />}
          <Row label="Date" value={formatDate(order.created_at)} />
        </div>
        {isMyJob && (
          <a
            href={
              order.customer_lat && order.customer_lng
                ? `https://www.google.com/maps/dir/?api=1&destination=${order.customer_lat},${order.customer_lng}`
                : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.address)}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl py-2.5 text-sm transition-colors"
          >
            <Navigation size={15} />
            Navigate to Customer
          </a>
        )}
      </Card>

      {/* Step 1: Accept */}
      {canAccept && hasActiveJob && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 mb-4 text-orange-400 text-sm">
          🔒 You're currently on a job — complete it before accepting new requests
        </div>
      )}
      {canAccept && !hasActiveJob && (
        <div className="flex gap-3 mb-4">
          <Button variant="primary" className="flex-1" loading={saving} onClick={acceptJob}>
            Accept Job ✓
          </Button>
          <Button variant="danger" className="flex-1" onClick={() => navigate('/worker')}>
            Decline
          </Button>
        </div>
      )}

      {/* After accepting but before status=worker_visiting: enter arrival OTP */}
      {isMyJob && order.status === 'booked' && order.worker_id && (
        <Card className="mb-4">
          <p className="font-bold text-slate-50 mb-2">Enter Arrival OTP</p>
          <p className="text-slate-400 text-sm mb-4">Ask the customer for their arrival code</p>
          <OtpInput value={arrivalOtp} onChange={setArrivalOtp} length={4} />
          <Button size="lg" variant="accent" loading={saving} onClick={confirmArrival} className="mt-4">
            Confirm Arrival ✓
          </Button>
        </Card>
      )}

      {/* inspecting: awaiting admin approval for high labour amount */}
      {isMyJob && order.status === 'inspecting' && order.labour_approval_pending && (
        <Card className="mb-4 border-amber-500/30 bg-amber-500/10">
          <p className="text-amber-400 font-bold mb-1">⏳ Awaiting Admin Approval</p>
          <p className="text-slate-400 text-sm">Your labour charge of {formatCurrency(order.labour_pending_amount || 0)} exceeds ₹1,000 and requires admin approval. You'll be notified once approved.</p>
        </Card>
      )}

      {/* inspecting: show quote form */}
      {isMyJob && order.status === 'inspecting' && !order.labour_approval_pending && (
        <Card className="mb-4">
          <p className="font-bold text-slate-50 mb-1">Send Quote to Admin</p>
          <div className="flex flex-col gap-4">
            <Input
              label="Labour Charges (₹)"
              type="number"
              placeholder="e.g. 500"
              value={labour}
              onChange={e => setLabour(e.target.value)}
            />
            {labour && !isNaN(Number(labour)) && Number(labour) > 0 && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
                <p className="text-slate-400 text-xs mb-1">Your estimated earnings</p>
                <p className="text-green-400 font-black text-xl">{formatCurrency(Number(labour) + 100)}</p>
                <p className="text-slate-500 text-xs mt-0.5">₹{labour} labour + ₹100 visiting charge</p>
              </div>
            )}
            {/* Materials toggle */}
            <div className="flex items-center justify-between bg-slate-900 rounded-xl px-4 py-3">
              <div>
                <p className="text-slate-50 text-sm font-semibold">Materials needed?</p>
                <p className="text-slate-500 text-xs">{needsMaterials ? 'Admin will review & price materials' : 'Quote goes directly to customer'}</p>
              </div>
              <button
                type="button"
                onClick={() => setNeedsMaterials(v => !v)}
                className={`relative w-12 h-6 rounded-full transition-colors ${needsMaterials ? 'bg-orange-500' : 'bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${needsMaterials ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
            <div className={needsMaterials ? '' : 'hidden'}>
              <p className="text-sm text-slate-400 mb-2 font-medium">Materials list</p>
              {materials.map((m, i) => (
                <div key={i} className="flex gap-2 mb-2 items-center">
                  <input
                    placeholder="Item name"
                    value={m.name}
                    onChange={e => updateMaterial(i, 'name', e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-50 text-sm outline-none focus:border-blue-500"
                  />
                  <input
                    type="number"
                    min="1"
                    value={m.qty}
                    onChange={e => updateMaterial(i, 'qty', Number(e.target.value))}
                    className="w-14 bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-slate-50 text-sm outline-none focus:border-blue-500 text-center"
                  />
                  <select
                    value={m.unit}
                    onChange={e => updateMaterial(i, 'unit', e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-slate-50 text-sm outline-none"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  {i > 0 && (
                    <button onClick={() => removeMaterial(i)} className="text-red-400">
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addMaterial} className="text-blue-400 text-sm flex items-center gap-1 mt-1">
                <Plus size={14} /> Add Material
              </button>
            </div>
            <Button size="lg" variant="accent" loading={saving} onClick={sendQuote}>
              {needsMaterials ? 'Send Quote to Admin →' : 'Send Quote to Customer →'}
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Waiting for payment */}
      {isMyJob && order.status === 'quote_sent' && (
        <Card className="mb-4">
          <p className="font-bold text-slate-50 mb-3">Your Quote</p>
          <div className="flex flex-col gap-2 text-sm">
            <Row label="Labour" value={formatCurrency(order.quote_labour || 0)} />
            {(Array.isArray(order.quote_materials) ? order.quote_materials as QuoteMaterial[] : []).map((m, i) => (
              <Row key={i} label={m.name} value={`${m.qty} ${m.unit}`} />
            ))}
          </div>
          {order.mat_cost_admin == null ? (
            <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-400 text-sm">
              Admin is reviewing material prices…
            </div>
          ) : (
            <div className="mt-3 bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-blue-400 text-sm">
              Admin confirmed material cost: {formatCurrency(order.mat_cost_admin)}.
              Waiting for customer to pay.
            </div>
          )}
        </Card>
      )}

      {/* Material collection */}
      {isMyJob && order.status === 'in_progress' && Array.isArray(order.quote_materials) && order.quote_materials.length > 0 && !order.mat_collected && (
        <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
          {!order.mat_store_id ? (
            <p className="text-amber-400 text-sm">⏳ Admin is assigning a store for material collection. Check back shortly.</p>
          ) : (
            <>
              <p className="font-bold text-slate-50 mb-3">🏪 Collect Materials First</p>
              <div className="flex flex-col gap-1 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Store</span>
                  <span className="text-slate-50 font-semibold">{order.mat_store_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Contact</span>
                  <a href={`tel:${order.mat_store_contact}`} className="text-blue-400">{order.mat_store_contact}</a>
                </div>
              </div>
              <p className="text-slate-400 text-sm mb-3">Enter the OTP given by the store to confirm collection:</p>
              <OtpInput value={matCollectionOtp} onChange={setMatCollectionOtp} length={6} />
              <Button size="lg" variant="accent" loading={saving} onClick={confirmMatCollection} className="mt-4">
                Confirm Collection ✓
              </Button>
            </>
          )}
        </Card>
      )}

      {/* Step 4: Upload completion photo — only show after materials collected (if any) */}
      {isMyJob && order.status === 'in_progress' && (
        !(Array.isArray(order.quote_materials) && order.quote_materials.length > 0 && !order.mat_collected)
      ) && (
        <Card className="mb-4">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-4 text-green-400 text-sm">
            Payment received! Start work now.
          </div>
          <p className="font-bold text-slate-50 mb-3">Upload Completion Photo</p>
          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-slate-600 rounded-xl p-6 text-center hover:border-orange-500 transition-colors">
              {photoPreview || order.job_photo_url ? (
                <img
                  src={photoPreview || order.job_photo_url}
                  alt="Completion"
                  className="rounded-xl w-full object-cover"
                />
              ) : (
                <>
                  <Upload className="mx-auto text-slate-500 mb-2" size={24} />
                  <p className="text-slate-400 text-sm">Tap to upload after photo</p>
                </>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); uploadPhoto(f) }
              }}
            />
          </label>
          <Button size="lg" variant="primary" loading={saving} onClick={markDone} className="mt-4">
            Mark Work Complete & Get OTP ✓
          </Button>
        </Card>
      )}

      {/* Step 5: Verify completion OTP */}
      {isMyJob && order.status === 'done_uploaded' && (
        <Card className="mb-4">
          {order.job_photo_url && (
            <img src={order.job_photo_url} alt="Completion" className="rounded-xl w-full object-cover mb-4" />
          )}
          <p className="font-bold text-slate-50 mb-2">Enter Completion OTP</p>
          <p className="text-slate-400 text-sm mb-4">Ask customer for their completion code</p>
          <OtpInput value={compOtp} onChange={setCompOtp} length={4} />
          <Button size="lg" variant="primary" loading={saving} onClick={verifyCompOtp} className="mt-4">
            Verify OTP & Complete Job ✓
          </Button>
        </Card>
      )}

      {order.status === 'completed' && (
        <Card className="border-green-500/30 bg-green-500/10 mb-4">
          <p className="text-green-400 font-bold">🎉 Job Completed</p>
          <div className="mt-2">
            <p className="text-slate-300 text-sm font-semibold">
              Total Earned: {formatCurrency((order.quote_labour || 0) + 100)}
            </p>
            <p className="text-slate-500 text-xs mt-0.5">+₹100 booking bonus included</p>
          </div>
        </Card>
      )}

      {order.status === 'cancelled' && (order.worker_cancellation_pay ?? 0) > 0 && (
        <Card className="border-green-500/30 bg-green-500/10 mb-4">
          <p className="text-green-400 font-bold">Cancellation Payout</p>
          <p className="text-slate-300 text-sm mt-1">
            ₹{order.worker_cancellation_pay} will be credited to your account
          </p>
        </Card>
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
