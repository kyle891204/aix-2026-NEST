import { useState } from 'react'
import { ConsentPage } from './ConsentPage'
import { SignupProfilePage, type SignupProfile } from './SignupProfilePage'
import './auth.css'

type SignupStep = 'consent' | 'profile' | 'complete'

export function SignupPage() {
  const [step, setStep] = useState<SignupStep>('consent')

  const [basicConsent, setBasicConsent] = useState(false)
  const [personalizedConsent, setPersonalizedConsent] = useState(false)

  const [profile, setProfile] = useState<SignupProfile>({
    nickname: '',
    language: 'ko',
    schoolId: '',
    collegeId: '',
    department: '',
    nationality: '',
    degree: '',
    year: '',
  })

  function changePersonalizedConsent(checked: boolean) {
    setPersonalizedConsent(checked)

    if (!checked) {
      setProfile((previous) => ({
        ...previous,
        schoolId: '',
        collegeId: '',
        department: '',
        nationality: '',
        degree: '',
        year: '',
        visa: '',
      }))
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
      <SignupProfilePage
        profile={profile}
        personalizedConsent={personalizedConsent}
        onChange={setProfile}
        onBack={() => setStep('consent')}
        onNext={() => {
          if (basicConsent && profile.nickname.trim()) {
            setStep('complete')
          }
        }}
      />
    )
  }

  return (
    <div className="auth-shell">
      <main className="auth-content">
        <h1>프로필 입력 데모 완료</h1>
        <p>{profile.nickname}님, 입력 흐름을 확인했어요.</p>
        <p>현재 입력값은 서버에 저장되지 않습니다.</p>

        <button type="button" onClick={() => setStep('profile')}>
          입력 내용 수정
        </button>
      </main>
    </div>
  )
}
