import { ApiError, requestJson } from '../../shared/api/client.ts'
import type { Language } from '../../shared/types/language'
import type { DashboardProfile } from '../dashboard/api.ts'

export type NoticeSource = 'UNIVERSITY' | 'INTERNATIONAL' | 'COLLEGE'
export type MatchStatus = 'APPLICABLE' | 'NEEDS_REVIEW' | 'NOT_APPLICABLE'
export type MatchFilter = 'APPLICABLE' | 'NEEDS_REVIEW'

// 프로필은 브라우저에만 있어 판별에 필요한 값만 요청 본문으로 보낸다. 값 변환은 #6과 같은 코드를 쓴다.
export type NoticeProfile = DashboardProfile

export interface NoticeSummary {
  noticeId: string
  source: NoticeSource
  title: string
  matchStatus: MatchStatus
  matchReasons: string[]
  deadline: string | null
  sample: boolean
}

export interface NoticeDetail extends NoticeSummary {
  target: string | null
  actions: { id: string; text: string }[]
  documents: string[]
  originalContent: string
  originalLanguage: string
  sourceUrl: string | null
  savedScheduleId: string | null
}

export interface TranslatedNotice {
  title: string
  target: string | null
  actions: { id: string; text: string }[]
  documents: string[]
  content: string
}

export interface NoticeTranslation {
  translationStatus: 'SUCCEEDED' | 'FAILED'
  translated: TranslatedNotice | null
  retryable: boolean
  message: string | null
}

// 로그인하지 않은 미리보기에서는 다시 시도해도 성공하지 않으므로 로그인 안내를 보여준다.
export function isSignedOut(cause: unknown) {
  return cause instanceof ApiError && cause.code === 'AUTH_REQUIRED'
}

function postJson(path: string, body: unknown) {
  return requestJson(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function searchNotices(
  source: NoticeSource | null,
  match: MatchFilter | null,
  profile: NoticeProfile,
) {
  const query = new URLSearchParams()
  if (source) query.set('source', source)
  if (match) query.set('match', match)
  const suffix = query.size > 0 ? `?${query}` : ''
  const body = (await postJson(`/notices/search${suffix}`, profile)) as {
    items: NoticeSummary[]
  }
  return body.items
}

export async function viewNotice(noticeId: string, profile: NoticeProfile) {
  return (await postJson(
    `/notices/${encodeURIComponent(noticeId)}/view`,
    profile,
  )) as NoticeDetail
}

export async function translateNotice(
  noticeId: string,
  targetLanguage: Language,
) {
  return (await postJson(
    `/notices/${encodeURIComponent(noticeId)}/translations`,
    { targetLanguage },
  )) as NoticeTranslation
}
