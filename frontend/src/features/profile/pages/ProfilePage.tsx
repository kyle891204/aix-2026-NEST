import { useState } from 'react'
import { useAuth } from '../../auth/auth-context'
import { authErrorMessage } from '../../auth/auth-errors'

export function ProfilePage() {
  const { session, logout } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogout() {
    setBusy(true)
    setError(null)
    try {
      await logout()
    } catch (cause) {
      setError(authErrorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className="page-intro">
        <h1>내 계정</h1>
        <p>Google 계정으로 로그인했어요.</p>
      </section>
      <section className="status-card">
        <h2>로그인 정보</h2>
        <p>{session?.user?.email}</p>
        <p className="result-note">
          학교·Canvas 연결과 프로필 설정은 준비 중입니다.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleLogout()}
        >
          {busy ? '로그아웃 중…' : '로그아웃'}
        </button>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
      </section>
    </>
  )
}
