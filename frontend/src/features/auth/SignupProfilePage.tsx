import { SUPPORTED_LANGUAGES, type Language } from '../../shared/types/language'
import { ERICA_SCHOOL, ERICA_COLLEGES } from './erica-academics'
import type { SignupProfile } from '../profile/demo-profile'

export type { SignupProfile } from '../profile/demo-profile'

interface SignupProfilePageProps {
  profile: SignupProfile
  personalizedConsent: boolean
  onChange: (profile: SignupProfile) => void
  onBack: () => void
  onNext: () => void
}

const languageLabels: Record<Language, string> = {
  ko: '한국어',
  en: 'English',
  zh: '中文',
}

const optionalFields = [
  { key: 'nationality', label: '국적' },
  { key: 'degree', label: '학위과정' },
  { key: 'year', label: '학년' },
] as const

export function SignupProfilePage({
  profile,
  personalizedConsent,
  onChange,
  onBack,
  onNext,
}: SignupProfilePageProps) {
  const canContinue = profile.nickname.trim().length > 0

  const colleges = profile.schoolId === ERICA_SCHOOL.id ? ERICA_COLLEGES : []

  const selectedCollege = colleges.find(
    (college) => college.id === profile.collegeId,
  )

  const departments = selectedCollege?.departments ?? []

  return (
    <div className="auth-shell">
      <main className="auth-content">
        <p className="auth-eyebrow">NEST 회원가입 · 프로필 설정</p>
        <h1>어떻게 불러드릴까요?</h1>
        <p>닉네임과 사용할 언어를 설정해 주세요.</p>

        <form
          className="signup-form"
          onSubmit={(event) => {
            event.preventDefault()

            if (!canContinue) return

            onChange({
              ...profile,
              nickname: profile.nickname.trim(),
            })
            onNext()
          }}
        >
          <label className="signup-field">
            <span>닉네임 · 필수</span>
            <input
              type="text"
              value={profile.nickname}
              onChange={(event) =>
                onChange({
                  ...profile,
                  nickname: event.target.value,
                })
              }
              placeholder="사용할 닉네임"
              required
            />
          </label>

          <label className="signup-field">
            <span>선호 언어 · 필수</span>
            <select
              value={profile.language}
              onChange={(event) =>
                onChange({
                  ...profile,
                  language: event.target.value as Language,
                })
              }
            >
              {SUPPORTED_LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {languageLabels[language]}
                </option>
              ))}
            </select>
          </label>

          {personalizedConsent && (
            <fieldset className="signup-optional">
              <legend>맞춤정보 · 선택</legend>
              <p>입력하지 않아도 다음 단계로 진행할 수 있어요.</p>

              <label className="signup-field">
                <span>학교</span>
                <select
                  value={profile.schoolId}
                  onChange={(event) =>
                    onChange({
                      ...profile,
                      schoolId: event.target.value,
                      collegeId: '',
                      department: '',
                    })
                  }
                >
                  <option value="">학교 선택</option>
                  <option value={ERICA_SCHOOL.id}>{ERICA_SCHOOL.name}</option>
                </select>
              </label>

              <label className="signup-field">
                <span>단과대학</span>
                <select
                  value={profile.collegeId}
                  disabled={!profile.schoolId}
                  onChange={(event) =>
                    onChange({
                      ...profile,
                      collegeId: event.target.value,
                      department: '',
                    })
                  }
                >
                  <option value="">
                    {profile.schoolId
                      ? '단과대학 선택'
                      : '학교를 먼저 선택해 주세요'}
                  </option>

                  {colleges.map((college) => (
                    <option key={college.id} value={college.id}>
                      {college.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="signup-field">
                <span>학과·학부</span>
                <select
                  value={profile.department}
                  disabled={!selectedCollege}
                  onChange={(event) =>
                    onChange({
                      ...profile,
                      department: event.target.value,
                    })
                  }
                >
                  <option value="">
                    {selectedCollege
                      ? '학과·학부 선택'
                      : '단과대학을 먼저 선택해 주세요'}
                  </option>

                  {departments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </label>

              {optionalFields.map((field) => (
                <label className="signup-field" key={field.key}>
                  <span>{field.label}</span>
                  <input
                    type="text"
                    value={profile[field.key]}
                    onChange={(event) =>
                      onChange({
                        ...profile,
                        [field.key]: event.target.value,
                      })
                    }
                    placeholder="선택 입력"
                  />
                </label>
              ))}
            </fieldset>
          )}

          <p aria-live="polite">
            {canContinue
              ? '입력 내용을 확인한 뒤 다음으로 이동해 주세요.'
              : '닉네임을 입력해 주세요.'}
          </p>

          <div className="signup-actions">
            <button type="button" onClick={onBack}>
              이전
            </button>
            <button type="submit" disabled={!canContinue}>
              다음
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
