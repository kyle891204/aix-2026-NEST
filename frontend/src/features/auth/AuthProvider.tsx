import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ApiError } from '../../shared/api/client'
import {
  checkSession,
  getSession,
  signIn,
  signOut,
  type AuthSession,
} from './api'
import { AuthContext } from './auth-context'
import { authErrorMessage } from './auth-errors'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSession(await getSession())
    } catch (cause) {
      setError(authErrorMessage(cause))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    void getSession()
      .then((value) => {
        if (active) setSession(value)
      })
      .catch((cause: unknown) => {
        if (active) setError(authErrorMessage(cause))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!session?.user) return
    let active = true
    const verify = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        await checkSession()
      } catch (cause) {
        if (active && cause instanceof ApiError && cause.status === 401) {
          setSession(null)
          void reload()
        }
      }
    }
    const timer = window.setInterval(() => void verify(), 60_000)
    window.addEventListener('focus', verify)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', verify)
    }
  }, [session?.user, reload])

  async function login(credential: string) {
    if (!session) throw new Error('로그인 화면을 다시 불러와 주세요.')
    setSession(await signIn(credential, session.csrfToken))
    setError(null)
  }

  async function logout() {
    if (!session) return
    try {
      await signOut(session.csrfToken)
    } catch (cause) {
      if (
        !(cause instanceof ApiError) ||
        !['AUTH_REQUIRED', 'AUTH_CSRF_INVALID'].includes(cause.code ?? '')
      )
        throw cause
      // Another tab may have rotated the cookie. Refresh CSRF and revoke that session too.
      const current = await getSession()
      if (current.user) await signOut(current.csrfToken)
    }
    window.google?.accounts.id.disableAutoSelect()
    setSession(null)
    await reload()
  }

  return (
    <AuthContext.Provider
      value={{ session, loading, error, reload, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}
