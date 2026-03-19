import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { SERVICES, BOOKING_FEE, VISITING_CHARGE, PLATFORM_FEE, TRANSACTION_FEE_RATE } from '../../constants'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'
import { BottomNav } from '../../components/BottomNav'
import { MapPicker } from '../../components/MapPicker'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { generateOtp, generateOrderId, formatCurrency } from '../../lib/utils'
import { Home, BookOpen, List, MapPin } from 'lucide-react'

const NAV = [
  { to: '/customer', icon: Home, label: 'Home' },
  { to: '/customer/book', icon: BookOpen, label: 'Book' },
  { to: '/customer/orders', icon: List, label: 'Orders' },
]

export default function Book() {
  const [params] = useSearchParams()
  const [selectedService, setSelectedService] = useState('')
  const [address, setAddress] = useState('')
  const [problem, setProblem] = useState('')
  const [loading, setLoading] = useState(false)
  const [workersAvailable, setWorkersAvailable] = useState<boolean | null>(null)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [alertSaved, setAlertSaved] = useState(false)
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const { session } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const svc = params.get('service')
    if (svc) setSelectedService(svc)
  }, [params])

  useEffect(() => {
    if (!selectedService) { setWorkersAvailable(null); setAlertSaved(false); return }
    checkAvailability(selectedService)

    // Re-check availability in realtime as workers go on/offline
    const channel = supabase
      .channel('book-worker-status')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'workers' }, () => {
        checkAvailability(selectedService)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedService])

  async function checkAvailability(service: string) {
    setCheckingAvailability(true)
    const { data } = await supabase
      .from('workers')
      .select('service, service_categories')
      .eq('verified', true)
      .eq('is_active', true)
      .eq('is_online', true)
    const available = (data || []).some(w =>
      w.service === service ||
      (Array.isArray(w.service_categories) && w.service_categories.includes(service))
    )
    setWorkersAvailable(available)
    setCheckingAvailability(false)
  }

  const serviceObj = SERVICES.find(s => s.name === selectedService)

  async function handleBook() {
    if (!selectedService) return toast.error('Select a service')
    if (!address.trim()) return toast.error('Enter your address')
    if (!session) return

    setLoading(true)
    try {
      const orderId = generateOrderId()
      const arrivalOtp = generateOtp()
      const compOtp = generateOtp()

      const { error } = await supabase.from('orders').insert({
        id: orderId,
        customer_id: session.id,
        customer_name: session.name,
        customer_phone: session.phone,
        service: selectedService,
        service_emoji: serviceObj?.emoji || '🔧',
        address,
        customer_lat: lat ?? undefined,
        customer_lng: lng ?? undefined,
        problem_description: problem || null,
        status: 'booked',
        booking_amt: BOOKING_FEE,
        booking_paid: false,
        arrival_otp: arrivalOtp,
        comp_otp: compOtp,
      })
      if (error) throw error

      // Clear any saved alert for this service since they're now booking
      await supabase.from('service_alerts')
        .delete()
        .eq('customer_id', session.id)
        .eq('service', selectedService)

      toast.success('Order placed! Our team will contact you shortly.')
      navigate(`/customer/orders/${orderId}`)
    } catch {
      toast.error('Failed to place order, please try again')
    }
    setLoading(false)
  }

  async function handleNotifyMe() {
    if (!address.trim()) return toast.error('Enter your address so we can notify you')
    if (!session) return
    setLoading(true)
    try {
      const { error } = await supabase.from('service_alerts').upsert({
        customer_id: session.id,
        customer_name: session.name,
        customer_phone: session.phone,
        service: selectedService,
        address,
        problem_description: problem || null,
      }, { onConflict: 'customer_id,service' })
      if (error) throw error
      setAlertSaved(true)
      toast.success("You're on the list! We'll notify you when a partner comes online.")
    } catch {
      toast.error('Failed to save, please try again')
    }
    setLoading(false)
  }

  return (
    <div className="page-content px-5 py-6">
      {showMapPicker && (
        <MapPicker
          initialLat={lat ?? undefined}
          initialLng={lng ?? undefined}
          onConfirm={(mlat, mlng, addr) => { setLat(mlat); setLng(mlng); setAddress(addr); setShowMapPicker(false) }}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      <h1 className="text-2xl font-black font-heading text-slate-50 mb-5">Book a Service</h1>

      {/* Service selector */}
      {!selectedService ? (
        <>
          <p className="text-slate-400 text-sm mb-3">Select a service</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {SERVICES.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedService(s.name)}
                className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-left btn-press hover:border-blue-500/50"
              >
                <div className="text-3xl mb-2">{s.emoji}</div>
                <p className="font-bold text-slate-50 text-sm">{s.name}</p>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-2xl p-4 mb-5 flex items-center justify-between">
          <div>
            <p className="text-orange-200 text-xs font-bold">SELECTED SERVICE</p>
            <p className="text-white font-black font-heading text-xl">{selectedService}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{serviceObj?.emoji}</span>
            <button
              onClick={() => { setSelectedService(''); setWorkersAvailable(null); setAlertSaved(false) }}
              className="text-white/70 text-xs border border-white/30 rounded-lg px-2 py-1"
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* Checking availability */}
      {selectedService && checkingAvailability && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 mb-4 text-slate-400 text-sm text-center animate-pulse">
          Checking partner availability...
        </div>
      )}

      {/* ── No workers available ── */}
      {selectedService && !checkingAvailability && workersAvailable === false && (
        <>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-5">
            <p className="text-amber-400 font-bold text-sm mb-1">No partners available right now</p>
            <p className="text-slate-400 text-xs leading-relaxed">
              All {selectedService} pros are currently offline. Enter your details below and we'll notify you
              the moment a partner comes online.
            </p>
          </div>

          {alertSaved ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 text-center mb-5">
              <p className="text-3xl mb-2">🔔</p>
              <p className="text-green-400 font-bold text-base mb-1">You're on the list!</p>
              <p className="text-slate-400 text-sm">
                We'll notify you on the home screen the moment a {selectedService} partner comes online.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 mb-5">
                <div>
                  <Input
                    label="Your Address"
                    placeholder="House no, street, locality"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    className="flex items-center gap-1.5 text-orange-400 text-xs font-semibold mt-1.5"
                  >
                    <MapPin size={12} />
                    {lat ? 'Location pinned on map ✓' : 'Pick on map'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1 font-medium">
                    Describe the problem (optional)
                  </label>
                  <textarea
                    placeholder="E.g. pipe is leaking under kitchen sink..."
                    value={problem}
                    onChange={e => setProblem(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-slate-50 placeholder-slate-500 outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>
              </div>
              <Button size="lg" loading={loading} onClick={handleNotifyMe}>
                🔔 Notify me when available
              </Button>
            </>
          )}
        </>
      )}

      {/* ── Workers available — normal booking flow ── */}
      {selectedService && !checkingAvailability && workersAvailable === true && (
        <>
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
            <p className="text-green-400 text-sm font-semibold">Partners available — ready to book</p>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-4 mb-5">
            <div>
              <Input
                label="Full Address"
                placeholder="House no, street, locality"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowMapPicker(true)}
                className="flex items-center gap-1.5 text-orange-400 text-xs font-semibold mt-1.5"
              >
                <MapPin size={12} />
                {lat ? 'Location pinned on map ✓' : 'Pick on map'}
              </button>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1 font-medium">
                Describe the problem (optional)
              </label>
              <textarea
                placeholder="E.g. pipe is leaking under kitchen sink..."
                value={problem}
                onChange={e => setProblem(e.target.value)}
                rows={3}
                className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-slate-50 placeholder-slate-500 outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Payment card */}
          <Card className="mb-5">
            <p className="font-bold text-slate-50 mb-3">Payment Breakdown</p>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Visiting charge</span>
                <span>{formatCurrency(VISITING_CHARGE)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Platform fee</span>
                <span>{formatCurrency(PLATFORM_FEE)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Transaction fee (2.5%)</span>
                <span>{formatCurrency(Math.round(BOOKING_FEE * TRANSACTION_FEE_RATE * 100) / 100)}</span>
              </div>
            </div>
            <div className="border-t border-slate-700 mt-3 pt-3 flex justify-between items-center">
              <span className="font-bold text-slate-50">Total to pay</span>
              <span className="bg-orange-500 text-white font-black px-3 py-1 rounded-full text-lg">
                {formatCurrency(Math.round(BOOKING_FEE * (1 + TRANSACTION_FEE_RATE) * 100) / 100)}
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-3">
              Worker visits, checks the job, then sends you a full quote. Payment will be collected via our secure gateway.
            </p>
          </Card>

          <Button size="lg" variant="accent" loading={loading} onClick={handleBook}>
            Confirm Booking →
          </Button>
        </>
      )}

      <BottomNav items={NAV} />
    </div>
  )
}
