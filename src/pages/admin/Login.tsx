import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../context/AuthContext'
import { ADMIN_EMAIL } from '../../constants'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin1234'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleLogin() {
    if (!email || !password) return toast.error('Fill in all fields')
    setLoading(true)
    await new Promise(r => setTimeout(r, 500))
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      signIn({ id: 'admin', name: 'Admin', phone: '', role: 'admin' })
      navigate('/admin')
    } else {
      toast.error('Invalid credentials')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex flex-col px-5 py-8">
      <button onClick={() => navigate('/')} className="text-slate-400 mb-8">← Back</button>

      <div className="mb-8">
        <h1 className="text-3xl font-black font-heading text-slate-50">Admin ⚙️</h1>
        <p className="text-slate-400 mt-1">Sign in to manage GetMyPro</p>
      </div>

      <div className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder={ADMIN_EMAIL}
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />
        <Button size="lg" loading={loading} onClick={handleLogin}>
          Sign In →
        </Button>
      </div>
    </div>
  )
}
