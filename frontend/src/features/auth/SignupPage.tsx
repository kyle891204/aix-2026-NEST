import { LanguageScope } from '../../shared/i18n/LanguageProvider'
import { useLanguage } from '../../shared/i18n/language-context'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ConsentPage } from './ConsentPage'
import { SignupProfilePage } from './SignupProfilePage'
import { useAuth } from './auth-context'
import { authReturnPath } from './return-path'
import { useDemoProfile } from '../profile/demo-profile-context'
import {
  clearPersonalizedFields,
  createEmptyProfile,
} from '../profile/demo-profile'
import './auth.css'

type SignupStep = 'consent' | 'profile'

export function SignupPage() {
  const { t } = useLanguage()

  const { session, loading, error, reload } = useAuth()
  if (loading || error) {
    return (
      <div className="auth-shell">
        <main className="auth-content" aria-live="polite">
          <h1>{t('프로필 설정')}</h1>
          <p>
            {loading ? t('로그인 정보를 확인하고 있습니다…') : t(error ?? '')}
          </p>
          {!loading && (
            <button onClick={() => void reload()}>{t('다시 시도')}</button>
          )}
        </main>
      </div>
    )
  }
  if (!session?.user) {
    return <Navigate to="/login" state={{ from: '/signup/consent' }} replace />
  }
  return <SignupForm />
}

function SignupForm() {
  const { language } = useLanguage()

  const { savedProfile, storageError, saveProfile } = useDemoProfile()
  const location = useLocation()
  const navigate = useNavigate()
  const target = authReturnPath(location.state?.from)
  const [step, setStep] = useState<SignupStep>(
    savedProfile ? 'profile' : 'consent',
  )
  const [saveError, setSaveError] = useState<string | null>(null)
  const [basicConsent, setBasicConsent] = useState(
    savedProfile?.basicConsent ?? false,
  )
  const [personalizedConsent, setPersonalizedConsent] = useState(
    savedProfile?.personalizedConsent ?? false,
  )

  const [profile, setProfile] = useState(
    () => savedProfile?.profile ?? createEmptyProfile(language),
  )

  function changePersonalizedConsent(checked: boolean) {
    setPersonalizedConsent(checked)

    if (!checked) {
      setProfile(clearPersonalizedFields)
    }
  }

  const changeLanguage = (next: typeof language) =>
    setProfile((current) => ({ ...current, language: next }))

  if (step === 'consent') {
    return (
      <LanguageScope language={profile.language} onChange={changeLanguage}>
        <ConsentPage
          basicConsent={basicConsent}
          personalizedConsent={personalizedConsent}
          onBasicConsentChange={setBasicConsent}
          onPersonalizedConsentChange={changePersonalizedConsent}
          onNext={() => {
            if (basicConsent) setStep('profile')
          }}
        />
      </LanguageScope>
    )
  }

  return (
    <LanguageScope language={profile.language} onChange={changeLanguage}>
      {(saveError || storageError) && (
        <p className="signup-storage-error error-text" role="alert">
          <SignupError message={saveError || storageError || ''} />
        </p>
      )}
      <SignupProfilePage
        profile={profile}
        personalizedConsent={personalizedConsent}
        onChange={setProfile}
        onBack={() => setStep('consent')}
        onNext={() => {
          if (!basicConsent || !profile.nickname.trim()) return
          setSaveError(null)
          try {
            saveProfile({ profile, basicConsent, personalizedConsent })
            navigate(target, { replace: true })
          } catch (cause) {
            setSaveError(
              cause instanceof Error
                ? cause.message
                : '프로필 저장을 다시 시도해 주세요.',
            )
          }
        }}
      />
    </LanguageScope>
  )
}

function SignupError({ message }: { message: string }) {
  const { t } = useLanguage()
  return t(message)
}
