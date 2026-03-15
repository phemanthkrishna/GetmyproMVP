import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect } from 'react'

export default function Landing() {
  const { session } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (session) {
      if (session.role === 'customer') navigate('/customer')
      else if (session.role === 'worker') navigate('/worker')
      else if (session.role === 'admin') navigate('/admin')
    }
  }, [session])

  return (
    <div className="min-h-dvh flex flex-col px-5 py-12">
      {/* Header */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="mb-12">
          <h1 className="text-5xl font-black font-heading text-slate-50 leading-tight">
            Get<span className="text-blue-500">My</span>Pro
          </h1>
          <p className="text-slate-400 mt-2 text-base">Home services in Hyderabad, on demand.</p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/customer/login')}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl py-4 px-5 text-left btn-press transition-colors"
          >
            <p className="text-xs font-semibold text-blue-200 mb-0.5 tracking-wide uppercase">Customer</p>
            <p className="text-lg font-black">I need a service</p>
          </button>

          <button
            onClick={() => navigate('/worker/login')}
            className="w-full bg-slate-800 border border-slate-700 hover:border-orange-500/50 text-white font-bold rounded-2xl py-4 px-5 text-left btn-press transition-colors"
          >
            <p className="text-xs font-semibold text-orange-400 mb-0.5 tracking-wide uppercase">Pro / Worker</p>
            <p className="text-lg font-black">I want to find jobs</p>
          </button>
        </div>
      </div>

      {/* Admin link — subtle */}
      <div className="text-center mt-6">
        <button
          onClick={() => navigate('/admin/login')}
          className="text-slate-600 text-xs hover:text-slate-400 transition-colors"
        >
          Admin login
        </button>
      </div>
    </div>
  )
}
