import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
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
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) setSession(JSON.parse(raw))
    } catch {
      // ignore
    }
    setLoading(false)
  }, [])

  function signIn(data: StoredSession) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data))
    setSession(data)
  }

  function signOut() {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
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
