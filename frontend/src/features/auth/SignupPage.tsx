import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
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

type SignupStep = 'consent' | 'profile' | 'complete'

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

  if (step === 'profile') {
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
              setStep('complete')
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

  return (
    <div className="auth-shell">
      <main className="auth-content">
        <h1>프로필 설정 완료</h1>
        <p>{savedProfile?.profile.nickname}님, 이 탭에 프로필을 저장했어요.</p>
        <p>
          같은 탭에서는 로그아웃 후 다시 로그인해도 불러올 수 있어요. 서버에는
          저장되지 않습니다.
        </p>

        <Link className="signup-home-link" to={target}>
          {target === '/' ? '학교 홈으로 이동' : '요청한 화면으로 이동'}
        </Link>

        <button type="button" onClick={() => setStep('profile')}>
          입력 내용 수정
        </button>
      </main>
    </div>
  )
}
