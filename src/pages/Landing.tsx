import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect } from 'react'
import { Wrench, User, ChevronRight } from 'lucide-react'

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
    <div className="min-h-dvh flex flex-col px-5 py-10 bg-[#09090B]">

      {/* ── Logo + Brand ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <img
              src="/logo.png"
              alt="GetMyPro"
              className="w-24 h-28 object-contain drop-shadow-2xl"
              onError={e => { e.currentTarget.src = '/logo.svg' }}
            />
          </div>
        </div>

        {/* Heading — PDF: text-5xl 800 weight, tight line-height */}
        <div className="text-center mb-3">
          <h1 className="text-5xl font-black font-heading leading-tight">
            <span className="gradient-text">GetMyPro</span>
          </h1>
          {/* PDF: text-base 400 weight body */}
          <p className="text-[#9CA3AF] mt-3 text-base font-body">
            Trusted home services, on demand.
          </p>
        </div>

        {/* ── Service tag strip ────────────────────────────────────── */}
        <div className="flex justify-center gap-2 flex-wrap mt-4 mb-10">
          {['Plumbing', 'Electrical', 'Carpentry', 'Cleaning'].map(s => (
            <span
              key={s}
              className="text-xs font-semibold px-3 py-1 rounded-full border border-[#1F2937] text-[#9CA3AF]"
            >
              {s}
            </span>
          ))}
        </div>

        {/* ── CTAs ─────────────────────────────────────────────────── */}
        {/* PDF: Large button = prominent CTA, define all states */}
        <div className="flex flex-col gap-3">

          {/* Primary CTA — gradient brand button */}
          <button
            onClick={() => navigate('/customer/login')}
            className="w-full gradient-brand text-white font-bold rounded-2xl py-4 px-5 flex items-center justify-between btn-press shadow-brand hover:opacity-95 transition-opacity"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <User size={18} />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-semibold text-white/70 uppercase tracking-widest">Customer</p>
                <p className="text-lg font-black font-heading leading-tight">I need a service</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-white/60" />
          </button>

          {/* Secondary CTA — ghost with orange accent */}
          <button
            onClick={() => navigate('/worker/login')}
            className="w-full bg-[#111318] border border-[#1F2937] hover:border-orange-500/40 text-white font-bold rounded-2xl py-4 px-5 flex items-center justify-between btn-press transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
                <Wrench size={18} className="text-orange-400" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-semibold text-orange-400 uppercase tracking-widest">Pro / Worker</p>
                <p className="text-lg font-black font-heading leading-tight">I want to find jobs</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-[#9CA3AF]" />
          </button>

        </div>


      </div>

      {/* ── Admin link — subtle, bottom ──────────────────────────── */}
      <div className="text-center pt-6">
        <button
          onClick={() => navigate('/admin/login')}
          className="text-[#374151] text-xs hover:text-[#6B7280] transition-colors"
        >
          Admin login
        </button>
      </div>

    </div>
  )
}
