import { LanguageSwitcher } from '../../../shared/i18n/LanguageSwitcher'
import { useLanguage } from '../../../shared/i18n/language-context'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'
import { authErrorMessage } from '../../auth/auth-errors'
import { useDemoProfile } from '../demo-profile-context'
import { profileDetails } from '../profile-display'
import '../profile.css'

export function ProfilePage() {
  const { t, language } = useLanguage()

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
        <h1>{t('내 계정')}</h1>
        <p>{t('Google 계정으로 로그인했어요.')}</p>
      </section>
      <section className="status-card">
        <h2>{t('로그인 정보')}</h2>
        <p>{session?.user?.email}</p>
        <dl className="account-profile-details">
          <div>
            <dt>{t('닉네임')}</dt>
            <dd>{savedProfile?.profile.nickname ?? t('미입력')}</dd>
          </div>
          {profileDetails(savedProfile?.profile ?? null, language).map(
            ({ label, value }) => (
              <div key={label}>
                <dt>{t(label)}</dt>
                <dd>{value}</dd>
              </div>
            ),
          )}
        </dl>
        <h2>{t('선호 언어')}</h2>
        <LanguageSwitcher />
        <Link to="/signup/consent" state={{ from: '/profile' }}>
          {t('프로필·동의 수정')}
        </Link>
        <p className="result-note">
          {t(
            '프로필은 계정별로 이 탭에만 저장됩니다. 로그아웃 후에도 같은 탭에서는 다시 불러올 수 있어요.',
          )}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleLogout()}
        >
          {busy ? t('로그아웃 중…') : t('로그아웃')}
        </button>
        {error && (
          <p className="error-text" role="alert">
            {t(error)}
          </p>
        )}
      </section>
    </>
  )
}
