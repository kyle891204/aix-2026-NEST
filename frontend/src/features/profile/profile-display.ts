import { ERICA_COLLEGES, ERICA_SCHOOL } from '../auth/erica-academics'
import type { Language } from '../../shared/types/language'
import type { SignupProfile } from './demo-profile'

const languageLabels: Record<Language, string> = {
  ko: '한국어',
  en: 'English',
  zh: '中文',
}

export function profileDetails(profile: SignupProfile | null) {
  const college = ERICA_COLLEGES.find((item) => item.id === profile?.collegeId)
  return [
    {
      label: '학교',
      value:
        profile?.schoolId === ERICA_SCHOOL.id ? ERICA_SCHOOL.name : '미입력',
    },
    { label: '단과대학', value: college?.name ?? '미입력' },
    { label: '학과·학부', value: profile?.department || '미입력' },
    {
      label: '과정·학년',
      value:
        [profile?.degree, profile?.year].filter(Boolean).join(' · ') ||
        '미입력',
    },
    { label: '국적', value: profile?.nationality || '미입력' },
    {
      label: '선호 언어',
      value: profile ? languageLabels[profile.language] : '미입력',
    },
  ]
}
