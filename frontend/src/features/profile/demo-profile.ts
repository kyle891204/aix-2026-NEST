import { ERICA_COLLEGES, ERICA_SCHOOL } from '../auth/erica-academics.ts'
import {
  SUPPORTED_LANGUAGES,
  type Language,
} from '../../shared/types/language.ts'

export interface SignupProfile {
  nickname: string
  language: Language
  schoolId: string
  collegeId: string
  department: string
  nationality: string
  degree: string
  year: string
}

export interface ProfileDraft {
  profile: SignupProfile
  basicConsent: boolean
  personalizedConsent: boolean
}

export interface StoredDemoProfile extends ProfileDraft {
  version: 1
  accountId: string
  basicConsent: true
}

type ProfileStorage = Pick<Storage, 'getItem' | 'setItem'>

export function createEmptyProfile(): SignupProfile {
  return {
    nickname: '',
    language: 'ko',
    schoolId: '',
    collegeId: '',
    department: '',
    nationality: '',
    degree: '',
    year: '',
  }
}

export function clearPersonalizedFields(profile: SignupProfile): SignupProfile {
  return {
    ...profile,
    schoolId: '',
    collegeId: '',
    department: '',
    nationality: '',
    degree: '',
    year: '',
  }
}

export function demoProfileKey(accountId: string) {
  if (!accountId) throw new Error('프로필을 저장하려면 로그인해 주세요.')
  return `nest:demo-profile:v1:${encodeURIComponent(accountId)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseProfile(value: unknown): SignupProfile | null {
  if (!isRecord(value)) return null
  const textFields = [
    'nickname',
    'language',
    'schoolId',
    'collegeId',
    'department',
    'nationality',
    'degree',
    'year',
  ] as const
  if (!textFields.every((field) => typeof value[field] === 'string'))
    return null
  const fields = value as Record<(typeof textFields)[number], string>
  if (!fields.nickname.trim()) return null
  const language = SUPPORTED_LANGUAGES.find((item) => item === fields.language)
  if (!language) return null
  if (fields.schoolId && fields.schoolId !== ERICA_SCHOOL.id) return null
  const college = ERICA_COLLEGES.find((item) => item.id === fields.collegeId)
  if (fields.collegeId && (!fields.schoolId || !college)) return null
  if (fields.department && !college?.departments.includes(fields.department))
    return null
  // Pick the supported fields explicitly; old demo fields (such as visa) stay out.
  return {
    nickname: fields.nickname.trim(),
    language,
    schoolId: fields.schoolId,
    collegeId: fields.collegeId,
    department: fields.department,
    nationality: fields.nationality,
    degree: fields.degree,
    year: fields.year,
  }
}

function readRecord(
  value: unknown,
  accountId: string,
): StoredDemoProfile | null {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    value.accountId !== accountId ||
    value.basicConsent !== true ||
    typeof value.personalizedConsent !== 'boolean'
  )
    return null
  const profile = parseProfile(value.profile)
  if (!profile) return null
  return {
    version: 1,
    accountId,
    basicConsent: true,
    personalizedConsent: value.personalizedConsent,
    profile: value.personalizedConsent
      ? profile
      : clearPersonalizedFields(profile),
  }
}

export function loadDemoProfile(storage: ProfileStorage, accountId: string) {
  const raw = storage.getItem(demoProfileKey(accountId))
  if (raw === null) return null
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  return readRecord(value, accountId)
}

export function saveDemoProfile(
  storage: ProfileStorage,
  accountId: string,
  draft: ProfileDraft,
): StoredDemoProfile {
  const record = readRecord({ ...draft, version: 1, accountId }, accountId)
  if (!record) throw new Error('필수 동의와 프로필 입력 내용을 확인해 주세요.')
  // Write before updating Context so a quota/permission failure cannot look saved.
  storage.setItem(demoProfileKey(accountId), JSON.stringify(record))
  return record
}
