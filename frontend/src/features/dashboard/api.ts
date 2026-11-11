import { requestJson } from '../../shared/api/client.ts'

export type MatchStatus = 'APPLICABLE' | 'NEEDS_REVIEW'

export interface DashboardProfile {
  nationality: string | null
  visaType: string | null
  degree: string | null
  year: string | null
}

export interface DashboardNotice {
  noticeId: string
  title: string
  category: string
  postedAt: string
  deadline: string | null
  sourceUrl: string | null
  matchReasons: string[]
  matchStatus: MatchStatus
  analysisStatus: string
  savedScheduleId: string | null
}

// collegeId가 있으면 ERICA 전체 공지와 그 단과대 공지 중에서 고른다.
export type DashboardRequest = DashboardProfile & { collegeId: string | null }

export interface DashboardResult {
  profileCompleted: boolean
  missingProfileFields: string[]
  matchedNotices: DashboardNotice[]
}

const STATUSES: readonly string[] = ['APPLICABLE', 'NEEDS_REVIEW']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isNotice(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.noticeId === 'string' &&
    typeof value.title === 'string' &&
    typeof value.matchStatus === 'string' &&
    STATUSES.includes(value.matchStatus) &&
    isStringArray(value.matchReasons)
  )
}

// 프로필은 브라우저에만 있어 조회지만 POST 본문으로 보낸다. 서버는 저장하지 않는다.
export async function getDashboard(
  profile: DashboardRequest,
  limit: number,
): Promise<DashboardResult> {
  const value = await requestJson(`/dashboard?limit=${limit}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
    cache: 'no-store',
  })
  if (
    !isRecord(value) ||
    typeof value.profileCompleted !== 'boolean' ||
    !isStringArray(value.missingProfileFields) ||
    !Array.isArray(value.matchedNotices) ||
    !value.matchedNotices.every(isNotice)
  )
    throw new Error('대시보드 응답 형식이 올바르지 않습니다.')
  return value as unknown as DashboardResult
}
