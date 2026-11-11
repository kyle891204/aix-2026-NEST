import { ApiError, requestJson } from '../../shared/api/client.ts'

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
  // 공지 수집을 끈 환경(로컬·자동 테스트)의 예시 공지
  sample: boolean
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

// 학교 공지를 하나도 읽지 못했으면 서버 안내(잠시 후 다시 시도)를 그대로 보여주고, 그 밖의 오류는 코드만 붙인다.
export function dashboardErrorMessage(cause: unknown) {
  const code = cause instanceof ApiError ? cause.code : null
  if (cause instanceof ApiError && code === 'NOTICE_SOURCE_UNAVAILABLE')
    return cause.message
  return code
    ? `맞춤 공지를 불러오지 못했어요. (${code})`
    : '맞춤 공지를 불러오지 못했어요.'
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
