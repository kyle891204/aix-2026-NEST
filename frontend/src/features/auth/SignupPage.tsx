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
  const { session, loading, error, reload } = useAuth()
  if (loading || error) {
    return (
      <div className="auth-shell">
        <main className="auth-content" aria-live="polite">
          <h1>프로필 설정</h1>
          <p>{loading ? '로그인 정보를 확인하고 있습니다…' : error}</p>
          {!loading && <button onClick={() => void reload()}>다시 시도</button>}
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
    () => savedProfile?.profile ?? createEmptyProfile(),
  )

  function changePersonalizedConsent(checked: boolean) {
    setPersonalizedConsent(checked)

    if (!checked) {
      setProfile(clearPersonalizedFields)
    }
  }

  if (step === 'consent') {
    return (
      <ConsentPage
        basicConsent={basicConsent}
        personalizedConsent={personalizedConsent}
        onBasicConsentChange={setBasicConsent}
        onPersonalizedConsentChange={changePersonalizedConsent}
        onNext={() => {
          if (basicConsent) setStep('profile')
        }}
      />
    )
  }

  return (
    <>
      {(saveError || storageError) && (
        <p className="signup-storage-error error-text" role="alert">
          {saveError || storageError}
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
    </>
  )
}
