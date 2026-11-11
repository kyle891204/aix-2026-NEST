import { ERICA_COLLEGES, ERICA_SCHOOL } from '../auth/erica-academics'
import type { Language } from '../../shared/types/language'
import type { SignupProfile } from './demo-profile'
import { getCountryName } from '../../shared/data/countries'
import { translate } from '../../shared/i18n/language'

const languageLabels: Record<Language, string> = {
  ko: '한국어',
  en: 'English',
  zh: '中文',
}

export function profileDetails(
  profile: SignupProfile | null,
  language: Language = 'ko',
) {
  const t = (key: string) => translate(language, key)
  const college = ERICA_COLLEGES.find((item) => item.id === profile?.collegeId)
  return [
    {
      label: '학교',
      value: t(
        profile?.schoolId === ERICA_SCHOOL.id ? ERICA_SCHOOL.name : '미입력',
      ),
    },
    { label: '단과대학', value: t(college?.name ?? '미입력') },
    { label: '학과·학부', value: t(profile?.department || '미입력') },
    {
      label: '과정·학년',
      value:
        [profile?.degree, profile?.year]
          .filter(Boolean)
          .map((value) => t(value!))
          .join(' · ') || t('미입력'),
    },
    {
      label: '국적',
      value: getCountryName(profile?.nationality ?? '', language),
    },
    {
      label: '선호 언어',
      value: profile ? languageLabels[profile.language] : t('미입력'),
    },
  ]
}
