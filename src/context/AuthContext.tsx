import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { StoredSession, Role } from '../types'

interface AuthContextValue {
  session: StoredSession | null
  loading: boolean
  signIn: (data: StoredSession) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const SESSION_KEY = 'gmp_session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function verifyAndLoad() {
      try {
        const raw = localStorage.getItem(SESSION_KEY)
        if (!raw) { setLoading(false); return }

        const stored = JSON.parse(raw) as StoredSession

        if (stored.role === 'admin') {
          // Admin sessions are backed by Supabase Auth — verify the token is still valid
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) {
            // Supabase Auth session expired or invalid — clear stored session
            localStorage.removeItem(SESSION_KEY)
            setLoading(false)
            return
          }
          // Extra check: confirm DB profile still has admin role
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()
          if (!profile || profile.role !== 'admin') {
            localStorage.removeItem(SESSION_KEY)
            await supabase.auth.signOut()
            setLoading(false)
            return
          }
        } else {
          // Customer / worker: verify their role from the profiles table
          // This prevents anyone from editing localStorage role to 'admin'
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', stored.id)
            .maybeSingle()
          if (!profile || profile.role !== stored.role) {
            localStorage.removeItem(SESSION_KEY)
            setLoading(false)
            return
          }
        }

        setSession(stored)
      } catch {
        localStorage.removeItem(SESSION_KEY)
      }
      setLoading(false)
    }

    verifyAndLoad()
  }, [])

  function signIn(data: StoredSession) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data))
    setSession(data)
  }

  async function signOut() {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
    // If admin session, also sign out of Supabase Auth
    await supabase.auth.signOut().catch(() => {})
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}

export function useRequireAuth(role?: Role) {
  const { session, loading } = useAuth()
  return { session, loading, allowed: !loading && !!session && (!role || session.role === role) }
}
