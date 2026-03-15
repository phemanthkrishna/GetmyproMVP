import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { SERVICES, BOOKING_FEE } from '../../constants'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'
import { BottomNav } from '../../components/BottomNav'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { openUpiPayment } from '../../lib/upi'
import { generateOtp, generateOrderId, formatCurrency } from '../../lib/utils'
import { Home, BookOpen, List } from 'lucide-react'

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
  const { session } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const svc = params.get('service')
    if (svc) setSelectedService(svc)
  }, [params])

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

      // Insert order (booking_paid=false, admin confirms after UPI)
      const { error } = await supabase.from('orders').insert({
        id: orderId,
        customer_id: session.id,
        customer_name: session.name,
        customer_phone: session.phone,
        service: selectedService,
        service_emoji: serviceObj?.emoji || '🔧',
        address,
        problem_description: problem || null,
        status: 'booked',
        booking_amt: BOOKING_FEE,
        booking_paid: false,
        arrival_otp: arrivalOtp,
        comp_otp: compOtp,
      })
      if (error) throw error

      // Open UPI
      openUpiPayment(BOOKING_FEE, `Booking ${orderId}`)

      toast.success('Order placed! Complete payment via UPI 🎉')
      navigate(`/customer/orders/${orderId}`)
    } catch (e: any) {
      toast.error(e.message || 'Failed to place order')
    }
    setLoading(false)
  }

  return (
    <div className="page-content px-5 py-6">
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
              onClick={() => setSelectedService('')}
              className="text-white/70 text-xs border border-white/30 rounded-lg px-2 py-1"
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="flex flex-col gap-4 mb-5">
        <Input
          label="Full Address"
          placeholder="House no, street, locality, Hyderabad"
          value={address}
          onChange={e => setAddress(e.target.value)}
        />
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
            <span>Booking fee</span>
            <span>{formatCurrency(BOOKING_FEE)}</span>
          </div>
        </div>
        <div className="border-t border-slate-700 mt-3 pt-3 flex justify-between items-center">
          <span className="font-bold text-slate-50">Pay now</span>
          <span className="bg-orange-500 text-white font-black px-3 py-1 rounded-full text-lg">
            {formatCurrency(BOOKING_FEE)}
          </span>
        </div>
        <p className="text-slate-500 text-xs mt-3">
          Worker visits, checks the job, then sends you a full quote. You pay for work only after seeing the price.
        </p>
      </Card>

      <Button size="lg" variant="accent" loading={loading} onClick={handleBook}>
        Pay {formatCurrency(BOOKING_FEE)} via UPI 🔒
      </Button>

      <BottomNav items={NAV} />
    </div>
  )
}
