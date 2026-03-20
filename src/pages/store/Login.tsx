import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { useStoreAuth } from '../../context/StoreAuthContext'
import type { StoreSession } from '../../context/StoreAuthContext'

export default function StoreLogin() {
  const { signIn } = useStoreAuth()
  const navigate = useNavigate()
  const [storeId, setStoreId] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    const cleaned = storeId.trim().toUpperCase()
    if (!cleaned) return toast.error('Enter your Store ID')
    if (!cleaned.startsWith('STR-')) return toast.error('Store ID must start with STR-')
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, store_type, contact, commission_pct, store_id, is_active')
        .eq('store_id', cleaned)
        .eq('is_active', true)
        .maybeSingle()
      if (error || !data) {
        toast.error('Store ID not found. Contact GetMyPro for help.')
        setLoading(false)
        return
      }
      const session: StoreSession = {
        id: data.id,
        store_id: data.store_id,
        name: data.name,
        store_type: data.store_type,
        contact: data.contact,
        commission_pct: data.commission_pct,
      }
      signIn(session)
      navigate('/store')
    } catch {
      toast.error('Something went wrong. Try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-slate-950">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4 text-3xl font-black text-white">
          G
        </div>
        <h1 className="text-3xl font-black font-heading gradient-text">GetMyPro</h1>
        <p className="text-slate-400 text-sm font-medium mt-1">Store Partners</p>
      </div>

      <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <p className="text-slate-400 text-sm text-center mb-4">Enter your Store ID</p>
        <input
          value={storeId}
          onChange={e => setStoreId(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="STR-000000"
          maxLength={10}
          autoCapitalize="characters"
          className="w-full bg-slate-800 border-2 border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-center text-2xl font-mono font-bold text-slate-50 outline-none tracking-widest mb-4"
          style={{ letterSpacing: '4px' }}
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full gradient-brand text-white font-bold text-base py-3.5 rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading
            ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : 'Login →'}
        </button>
      </div>

      <p className="text-slate-600 text-xs text-center mt-6 leading-relaxed">
        Your Store ID was provided by GetMyPro.<br />Contact us if you need help.
      </p>
    </div>
  )
}
