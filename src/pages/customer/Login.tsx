import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { OtpInput } from '../../components/OtpInput'
import { useAuth } from '../../context/AuthContext'
import {
  createRecaptchaVerifier,
  sendOtp,
  verifyOtp,
  type ConfirmationResult,
  type RecaptchaVerifier,
} from '../../lib/firebaseOtp'
import { supabase } from '../../lib/supabase'

export default function CustomerLogin() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const verifierRef = useRef<RecaptchaVerifier | null>(null)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    verifierRef.current = createRecaptchaVerifier('recaptcha-container')
    return () => {
      verifierRef.current?.clear()
      verifierRef.current = null
    }
  }, [])

  async function handleSendOtp() {
    if (!name.trim()) return toast.error('Enter your name')
    if (phone.length < 10) return toast.error('Enter a valid phone number')
    if (!verifierRef.current) return toast.error('reCAPTCHA not ready, refresh the page')
    setLoading(true)
    try {
      const result = await sendOtp(phone, verifierRef.current)
      setConfirmationResult(result)
      setStep('otp')
      toast.success('OTP sent!')
    } catch (e: any) {
      toast.error(e.message || 'Failed to send OTP')
    }
    setLoading(false)
  }

  async function handleVerifyOtp() {
    if (otp.length < 6) return toast.error('Enter 6-digit OTP')
    if (!confirmationResult) return toast.error('Please request OTP first')
    setLoading(true)
    try {
      const ok = await verifyOtp(confirmationResult, otp)
      if (!ok) {
        toast.error('Wrong OTP, try again')
        setLoading(false)
        return
      }

      const { data: existing } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('phone', phone)
        .single()

      let profileId: string
      if (existing) {
        profileId = existing.id
      } else {
        const { data: newProfile, error } = await supabase
          .from('profiles')
          .insert({ phone, name, role: 'customer' })
          .select('id')
          .single()
        if (error) throw error
        profileId = newProfile.id
      }

      signIn({ id: profileId, name, phone, role: 'customer' })
      navigate('/customer')
    } catch (e: any) {
      toast.error(e.message || 'Login failed')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex flex-col px-5 py-8">
      <div id="recaptcha-container" />

      <button onClick={() => navigate('/')} className="text-slate-400 mb-8">← Back</button>

      <div className="mb-8">
        <h1 className="text-3xl font-black font-heading text-slate-50">
          {step === 'phone' ? 'Welcome! 👋' : 'Verify OTP'}
        </h1>
        <p className="text-slate-400 mt-1">
          {step === 'phone'
            ? 'Book trusted pros in Hyderabad'
            : `Sent to +91 ${phone}`}
        </p>
      </div>

      {step === 'phone' ? (
        <div className="flex flex-col gap-4">
          <Input
            label="Your Name"
            placeholder="Enter your full name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <Input
            label="Phone Number"
            placeholder="10-digit mobile number"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
          />
          <Button size="lg" loading={loading} onClick={handleSendOtp} className="mt-2">
            Send OTP →
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <OtpInput value={otp} onChange={setOtp} />
          <Button size="lg" loading={loading} onClick={handleVerifyOtp}>
            Verify & Continue →
          </Button>
          <button
            onClick={() => setStep('phone')}
            className="text-slate-400 text-sm text-center"
          >
            Change number
          </button>
        </div>
      )}
    </div>
  )
}
