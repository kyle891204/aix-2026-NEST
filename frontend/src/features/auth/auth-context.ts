import { createContext, useContext } from 'react'
import type { AuthSession } from './api'

export interface AuthContextValue {
  session: AuthSession | null
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  login: (credential: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider가 필요합니다.')
  return value
}
