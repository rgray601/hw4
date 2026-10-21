import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { clearSession, fetchMe, loginAccount, registerAccount } from './api.ts'
import type { Shopper } from './types.ts'

type RegisterInput = {
  firstName: string
  lastName: string
  email: string
  password: string
}

type AuthContextValue = {
  shopper: Shopper | null
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [shopper, setShopper] = useState<Shopper | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetchMe()
      .then((user) => setShopper(user))
      .catch(() => setShopper(null))
      .finally(() => setReady(true))
  }, [])

  const value: AuthContextValue = {
    shopper,
    ready,
    async login(email, password) {
      setShopper(await loginAccount(email, password))
    },
    async register(input) {
      setShopper(await registerAccount(input))
    },
    logout() {
      clearSession()
      setShopper(null)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return value
}
