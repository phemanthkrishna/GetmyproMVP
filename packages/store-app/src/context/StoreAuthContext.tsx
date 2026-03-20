import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { StoreSession } from '../types'

interface StoreAuthContextValue {
  store: StoreSession | null
  loading: boolean
  signIn: (data: StoreSession) => void
  signOut: () => void
}

const StoreAuthContext = createContext<StoreAuthContextValue | null>(null)
const SESSION_KEY = 'gmp_store'

export function StoreAuthProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<StoreSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function verify() {
      try {
        const raw = localStorage.getItem(SESSION_KEY)
        if (!raw) { setLoading(false); return }
        const stored = JSON.parse(raw) as StoreSession
        // Verify store still exists and is active
        const { data } = await supabase
          .from('stores')
          .select('id, name, store_type, contact, commission_pct, store_id, is_active')
          .eq('id', stored.id)
          .eq('is_active', true)
          .maybeSingle()
        if (!data) { localStorage.removeItem(SESSION_KEY); setLoading(false); return }
        setStore(stored)
      } catch {
        localStorage.removeItem(SESSION_KEY)
      }
      setLoading(false)
    }
    verify()
  }, [])

  function signIn(data: StoreSession) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data))
    setStore(data)
  }

  function signOut() {
    localStorage.removeItem(SESSION_KEY)
    setStore(null)
  }

  return (
    <StoreAuthContext.Provider value={{ store, loading, signIn, signOut }}>
      {children}
    </StoreAuthContext.Provider>
  )
}

export function useStoreAuth() {
  const ctx = useContext(StoreAuthContext)
  if (!ctx) throw new Error('useStoreAuth must be inside StoreAuthProvider')
  return ctx
}
