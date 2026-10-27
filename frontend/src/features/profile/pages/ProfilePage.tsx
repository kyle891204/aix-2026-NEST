import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'
import { authErrorMessage } from '../../auth/auth-errors'
import { useDemoProfile } from '../demo-profile-context'
import { profileDetails } from '../profile-display'
import '../profile.css'

export function ProfilePage() {
  const { session, logout } = useAuth()
  const { savedProfile } = useDemoProfile()
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
        <dl className="account-profile-details">
          <div>
            <dt>닉네임</dt>
            <dd>{savedProfile?.profile.nickname ?? '미입력'}</dd>
          </div>
          {profileDetails(savedProfile?.profile ?? null).map(
            ({ label, value }) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ),
          )}
        </dl>
        <Link to="/signup/consent" state={{ from: '/profile' }}>
          프로필·동의 수정
        </Link>
        <p className="result-note">
          프로필은 계정별로 이 탭에만 저장됩니다. 로그아웃 후에도 같은 탭에서는
          다시 불러올 수 있어요.
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
