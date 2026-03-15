import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { OtpInput } from '../../components/OtpInput'
import { useAuth } from '../../context/AuthContext'
import { sendOtp, verifyOtp } from '../../lib/twoFactor'
import { supabase } from '../../lib/supabase'

export default function WorkerLogin() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSendOtp() {
    if (phone.length < 10) return toast.error('Enter a valid phone number')
    setLoading(true)
    try {
      // Check workers table directly — ensures full registration completed
      const { data: worker } = await supabase
        .from('workers')
        .select('id')
        .eq('phone', phone)
        .single()

      if (!worker) {
        toast.error('No worker account found. Redirecting to registration...')
        setTimeout(() => navigate('/worker/register'), 1500)
        setLoading(false)
        return
      }

      const sid = await sendOtp(phone)
      setSessionId(sid)
      setStep('otp')
      toast.success('OTP sent!')
    } catch (e: any) {
      toast.error(e.message || 'Failed to send OTP')
    }
    setLoading(false)
  }

  async function handleVerifyOtp() {
    if (otp.length < 6) return toast.error('Enter 6-digit OTP')
    setLoading(true)
    try {
      const ok = await verifyOtp(sessionId, otp)
      if (!ok) {
        toast.error('Wrong OTP')
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('phone', phone)
        .single()

      if (!profile || profile.role !== 'worker') {
        toast.error('No worker account found. Please register first.')
        navigate('/worker/register')
        setLoading(false)
        return
      }

      signIn({ id: profile.id, name: profile.name, phone, role: 'worker' })
      navigate('/worker')
    } catch (e: any) {
      toast.error(e.message || 'Login failed')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex flex-col px-5 py-8">
      <button onClick={() => navigate('/')} className="text-slate-400 mb-8">← Back</button>

      <div className="mb-8">
        <h1 className="text-3xl font-black font-heading text-slate-50">
          {step === 'phone' ? 'Pro Login 🔧' : 'Verify OTP'}
        </h1>
        <p className="text-slate-400 mt-1">
          {step === 'phone' ? 'Welcome back, Pro!' : `Sent to +91 ${phone}`}
        </p>
      </div>

      {step === 'phone' ? (
        <div className="flex flex-col gap-4">
          <Input
            label="Registered Phone Number"
            placeholder="10-digit mobile number"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
          />
          <Button size="lg" variant="accent" loading={loading} onClick={handleSendOtp}>
            Send OTP →
          </Button>
          <button
            onClick={() => navigate('/worker/register')}
            className="text-blue-400 text-sm text-center"
          >
            New here? Register as a Pro
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <OtpInput value={otp} onChange={setOtp} />
          <Button size="lg" variant="accent" loading={loading} onClick={handleVerifyOtp}>
            Verify & Enter →
          </Button>
          <button onClick={() => setStep('phone')} className="text-slate-400 text-sm text-center">
            Change number
          </button>
        </div>
      )}
    </div>
  )
}
