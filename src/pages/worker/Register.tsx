import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { SERVICES } from '../../constants'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { OtpInput } from '../../components/OtpInput'
import { useAuth } from '../../context/AuthContext'
import { sendOtp, verifyOtp } from '../../lib/twoFactor'
import { supabase } from '../../lib/supabase'
import { Camera } from 'lucide-react'

const STEPS = ['info', 'otp', 'aadhaar', 'photo'] as const
type Step = typeof STEPS[number]

export default function WorkerRegister() {
  const [step, setStep] = useState<Step>('info')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [serviceCategories, setServiceCategories] = useState<string[]>([])
  const [otp, setOtp] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [aadhaarNumber, setAadhaarNumber] = useState('')
  const [upiId, setUpiId] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSendOtp() {
    if (!name.trim()) return toast.error('Enter your name')
    if (serviceCategories.length === 0) return toast.error('Select at least one service')
    if (phone.length < 10) return toast.error('Enter valid phone number')
    setLoading(true)
    try {
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
    const ok = await verifyOtp(sessionId, otp)
    if (!ok) {
      toast.error('Wrong OTP')
      setLoading(false)
      return
    }
    setStep('aadhaar')
    setLoading(false)
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleComplete() {
    if (!photoFile) return toast.error('Upload your photo to continue')
    setLoading(true)
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .upsert({ phone, name, role: 'worker' }, { onConflict: 'phone' })
        .select('id')
        .single()
      if (profileError) throw profileError

      // Upload photo
      const ext = photoFile.name.split('.').pop()
      const path = `photos/${profile.id}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(path, photoFile, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path)

      const { error: workerError } = await supabase.from('workers').upsert({
        id: profile.id,
        name,
        phone,
        service: serviceCategories[0],
        service_categories: serviceCategories,
        aadhaar_url: aadhaarNumber.replace(/\s/g, ''),
        photo_url: publicUrl,
        upi_id: upiId.trim() || null,
        verified: false,
      }, { onConflict: 'id' })
      if (workerError) throw workerError

      signIn({ id: profile.id, name, phone, role: 'worker' })
      toast.success('Registration submitted! Admin will verify you shortly.')
      navigate('/worker')
    } catch (e: any) {
      toast.error(e.message || 'Registration failed')
    }
    setLoading(false)
  }

  const stepIndex = STEPS.indexOf(step)

  return (
    <div className="min-h-dvh flex flex-col px-5 py-8">
      <button onClick={() => navigate('/')} className="text-slate-400 mb-6">← Back</button>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`flex-1 h-1 rounded-full ${stepIndex >= i ? 'bg-orange-500' : 'bg-slate-700'}`}
          />
        ))}
      </div>

      {step === 'info' && (
        <>
          <h1 className="text-2xl font-black font-heading text-slate-50 mb-6">Join as a Pro 🔧</h1>
          <div className="flex flex-col gap-4">
            <Input label="Full Name" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
            <div>
              <label className="block text-sm text-slate-400 mb-1 font-medium">
                Your Services <span className="text-slate-600">(select up to 2)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SERVICES.map(s => {
                  const selected = serviceCategories.includes(s.name)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        if (selected) {
                          setServiceCategories(prev => prev.filter(c => c !== s.name))
                        } else if (serviceCategories.length < 2) {
                          setServiceCategories(prev => [...prev, s.name])
                        } else {
                          toast.error('You can select up to 2 services')
                        }
                      }}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors text-left ${
                        selected
                          ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                          : 'border-slate-700 bg-slate-800 text-slate-400'
                      }`}
                    >
                      <span>{s.emoji}</span>
                      <span>{s.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <Input
              label="Phone Number"
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
          </div>
        </>
      )}

      {step === 'otp' && (
        <>
          <h1 className="text-2xl font-black font-heading text-slate-50 mb-2">Verify Phone</h1>
          <p className="text-slate-400 mb-8">Sent to +91 {phone}</p>
          <div className="flex flex-col gap-6">
            <OtpInput value={otp} onChange={setOtp} />
            <Button size="lg" variant="accent" loading={loading} onClick={handleVerifyOtp}>
              Verify OTP →
            </Button>
          </div>
        </>
      )}

      {step === 'aadhaar' && (
        <>
          <h1 className="text-2xl font-black font-heading text-slate-50 mb-2">Aadhaar Verification</h1>
          <p className="text-slate-400 mb-6">Enter your 12-digit Aadhaar number</p>
          <Input
            label="Aadhaar Number"
            placeholder="XXXX XXXX XXXX"
            type="tel"
            inputMode="numeric"
            maxLength={14}
            value={aadhaarNumber}
            onChange={e => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 12)
              setAadhaarNumber(digits.replace(/(\d{4})(?=\d)/g, '$1 '))
            }}
          />
          <p className="text-slate-600 text-xs mt-2 mb-4">Stored securely for admin verification only.</p>
          <Input
            label="UPI ID (for receiving payments)"
            placeholder="yourname@upi or phone@bank"
            value={upiId}
            onChange={e => setUpiId(e.target.value)}
          />
          <p className="text-slate-600 text-xs mt-2 mb-6">You can update this later in your profile.</p>
          <Button
            size="lg"
            variant="accent"
            onClick={() => {
              if (aadhaarNumber.replace(/\s/g, '').length !== 12) return toast.error('Enter valid 12-digit Aadhaar number')
              setStep('photo')
            }}
          >
            Continue →
          </Button>
        </>
      )}

      {step === 'photo' && (
        <>
          <h1 className="text-2xl font-black font-heading text-slate-50 mb-2">Profile Photo</h1>
          <p className="text-slate-400 mb-6">Upload a clear photo of yourself</p>

          <label className="block cursor-pointer mb-4">
            <div className="border-2 border-dashed border-slate-600 rounded-2xl p-6 text-center hover:border-orange-500 transition-colors">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-32 h-32 rounded-full object-cover mx-auto" />
              ) : (
                <>
                  <Camera className="mx-auto text-slate-500 mb-2" size={36} />
                  <p className="text-slate-400 font-semibold text-sm">Tap to take or upload photo</p>
                  <p className="text-slate-600 text-xs mt-1">JPG or PNG · Face clearly visible</p>
                </>
              )}
            </div>
            <input type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhotoSelect} />
          </label>

          {photoPreview && (
            <button
              onClick={() => { setPhotoFile(null); setPhotoPreview('') }}
              className="text-slate-500 text-xs text-center w-full mb-4"
            >
              Retake photo
            </button>
          )}

          <Button size="lg" variant="accent" loading={loading} onClick={handleComplete}>
            Complete Registration ✓
          </Button>
        </>
      )}
    </div>
  )
}
