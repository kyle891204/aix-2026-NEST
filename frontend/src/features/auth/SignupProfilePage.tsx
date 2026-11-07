import { LanguageSwitcher } from '../../shared/i18n/LanguageSwitcher'
import { useLanguage } from '../../shared/i18n/language-context'
import { SUPPORTED_LANGUAGES, type Language } from '../../shared/types/language'
import { ERICA_SCHOOL, ERICA_COLLEGES } from './erica-academics'
import type { SignupProfile } from '../profile/demo-profile'
import { getCountries } from '../../shared/data/countries'

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
  {
    key: 'degree',
    label: '학위과정',
    options: ['학사', '석사', '박사', '석박사통합'],
  },
  {
    key: 'year',
    label: '학년',
    options: ['1학년', '2학년', '3학년', '4학년', '5학년 이상'],
  },
] as const

export function SignupProfilePage({
  profile,
  personalizedConsent,
  onChange,
  onBack,
  onNext,
}: SignupProfilePageProps) {
  const { t, language } = useLanguage()
  const COUNTRIES = getCountries(language)

  const canContinue = profile.nickname.trim().length > 0

  const colleges = profile.schoolId === ERICA_SCHOOL.id ? ERICA_COLLEGES : []

  const selectedCollege = colleges.find(
    (college) => college.id === profile.collegeId,
  )

  const departments = selectedCollege?.departments ?? []

  return (
    <div className="auth-shell">
      <main className="auth-content">
        <LanguageSwitcher />
        <p className="auth-eyebrow">{t('NEST 회원가입 · 프로필 설정')}</p>
        <h1>{t('어떻게 불러드릴까요?')}</h1>
        <p>{t('이름과 사용할 언어를 설정해 주세요.')}</p>

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
            <span>{t('이름 · 필수')}</span>
            <input
              type="text"
              value={profile.nickname}
              onChange={(event) =>
                onChange({
                  ...profile,
                  nickname: event.target.value,
                })
              }
              placeholder={t('사용할 이름')}
              required
            />
          </label>

          <label className="signup-field">
            <span>{t('선호 언어 · 필수')}</span>
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
              <legend>{t('맞춤정보 · 선택')}</legend>
              <p>{t('입력하지 않아도 다음 단계로 진행할 수 있어요.')}</p>

              <label className="signup-field">
                <span>{t('학교')}</span>
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
                  <option value="">{t('학교 선택')}</option>
                  <option value={ERICA_SCHOOL.id}>
                    {t(ERICA_SCHOOL.name)}
                  </option>
                </select>
              </label>

              <label className="signup-field">
                <span>{t('단과대학')}</span>
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
                      ? t('단과대학 선택')
                      : t('학교를 먼저 선택해 주세요')}
                  </option>

                  {colleges.map((college) => (
                    <option key={college.id} value={college.id}>
                      {t(college.name)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="signup-field">
                <span>{t('학과·학부')}</span>
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
                      ? t('학과·학부 선택')
                      : t('단과대학을 먼저 선택해 주세요')}
                  </option>

                  {departments.map((department) => (
                    <option key={department} value={department}>
                      {t(department)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="signup-field">
                <span>{t('국적')}</span>

                <select
                  value={profile.nationality}
                  onChange={(event) =>
                    onChange({
                      ...profile,
                      nationality: event.target.value,
                    })
                  }
                >
                  <option value="">{t('국적 선택 · 선택 입력')}</option>

                  {profile.nationality &&
                    !COUNTRIES.some(
                      (country) => country.code === profile.nationality,
                    ) && (
                      <option value={profile.nationality} disabled>
                        {profile.nationality}{' '}
                        {t('· 목록에서 다시 선택해 주세요')}
                      </option>
                    )}

                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </label>

              {optionalFields.map((field) => (
                <label className="signup-field" key={field.key}>
                  <span>{t(field.label)}</span>

                  <select
                    value={profile[field.key]}
                    onChange={(event) =>
                      onChange({
                        ...profile,
                        [field.key]: event.target.value,
                      })
                    }
                  >
                    <option value="">
                      {t(field.label)} {t('선택 · 선택 입력')}
                    </option>

                    {profile[field.key] &&
                      !field.options.some(
                        (option) => option === profile[field.key],
                      ) && (
                        <option value={profile[field.key]} disabled>
                          {profile[field.key]}{' '}
                          {t('· 목록에서 다시 선택해 주세요')}
                        </option>
                      )}

                    {field.options.map((option) => (
                      <option key={option} value={option}>
                        {t(option)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </fieldset>
          )}

          <p aria-live="polite">
            {canContinue
              ? t('입력 내용을 확인한 뒤 다음으로 이동해 주세요.')
              : t('이름을 입력해 주세요.')}
          </p>

          <div className="signup-actions">
            <button type="button" onClick={onBack}>
              {t('이전')}
            </button>
            <button type="submit" disabled={!canContinue}>
              {t('다음')}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
