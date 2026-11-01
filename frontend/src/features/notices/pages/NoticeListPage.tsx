import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDemoProfile } from '../../profile/demo-profile-context'
import {
  noticeProfile,
  searchNotices,
  type MatchFilter,
  type NoticeSource,
  type NoticeSummary,
} from '../api'
import { formatDeadline, matchLabel, sourceLabel } from '../notice-display'
import '../notices.css'

const SOURCE_FILTERS: { label: string; value: NoticeSource | null }[] = [
  { label: '전체', value: null },
  { label: '학교', value: 'UNIVERSITY' },
  { label: '국제처', value: 'INTERNATIONAL' },
  { label: '단과대', value: 'COLLEGE' },
]

const MATCH_FILTERS: { label: string; value: MatchFilter | null }[] = [
  { label: '나에게 해당', value: 'APPLICABLE' },
  { label: '확인 필요', value: 'NEEDS_REVIEW' },
  { label: '전체 대상', value: null },
]

function selected<T extends string>(
  value: string | null,
  options: { value: T | null }[],
) {
  return options.find((option) => option.value === value)?.value ?? null
}

export function NoticeListPage() {
  // 상세에서 뒤로 돌아와도 필터가 유지되도록 주소에 저장한다.
  const [params, setParams] = useSearchParams()
  const source = selected(params.get('source'), SOURCE_FILTERS)
  const match = selected(params.get('match'), MATCH_FILTERS)
  const { savedProfile } = useDemoProfile()
  const profile = JSON.stringify(noticeProfile(savedProfile?.profile ?? null))
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState<{
    key: string
    items: NoticeSummary[] | null
    error: string | null
  } | null>(null)

  // 응답의 key가 현재 조건과 다르면 아직 불러오는 중으로 본다.
  const key = `${source}:${match}:${profile}:${attempt}`
  const current = loaded?.key === key ? loaded : null
  const notices = current?.items ?? null
  const error = current?.error ?? null

  useEffect(() => {
    let active = true
    searchNotices(source, match, JSON.parse(profile))
      .then((items) => {
        if (active) setLoaded({ key, items, error: null })
      })
      .catch(() => {
        if (active)
          setLoaded({ key, items: null, error: '공지를 불러오지 못했어요.' })
      })
    return () => {
      active = false
    }
  }, [source, match, profile, key])

  function setFilter(name: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    setParams(next, { replace: true })
  }

  return (
    <div className="notice-page">
      <h1>전체공지</h1>

      <div className="notice-total">
        <strong>총 {notices?.length ?? 0}건</strong>
        {notices?.some((notice) => notice.sample) && <span>예시 데이터</span>}
      </div>

      <div className="notice-segment" role="group" aria-label="공지 출처">
        {SOURCE_FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            aria-pressed={source === filter.value}
            onClick={() => setFilter('source', filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="notice-segment" role="group" aria-label="해당 여부">
        {MATCH_FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            aria-pressed={match === filter.value}
            onClick={() => setFilter('match', filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="notice-message" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            다시 시도
          </button>
        </div>
      )}
      {!error && !notices && (
        <p className="notice-hint" aria-live="polite">
          공지를 불러오고 있어요…
        </p>
      )}
      {notices?.length === 0 && (
        <p className="notice-hint">조건에 맞는 공지가 없어요.</p>
      )}

      {notices?.map((notice) => {
        const badge = matchLabel(notice.matchStatus)
        return (
          <Link
            key={notice.noticeId}
            className="notice-card"
            to={`/notices/${encodeURIComponent(notice.noticeId)}`}
          >
            <span className="notice-badges">
              {badge && (
                <span className={`notice-badge is-${notice.matchStatus}`}>
                  {badge}
                </span>
              )}
              <span className="notice-badge">{sourceLabel(notice.source)}</span>
            </span>
            <strong>{notice.title}</strong>
            {notice.matchReasons.length > 0 && (
              <span className="notice-hint">
                {notice.matchReasons.join(' · ')}
              </span>
            )}
            <span className="notice-hint">
              {formatDeadline(notice.deadline) ?? '마감일 없음'}
            </span>
          </Link>
        )
      })}

      <p className="notice-hint">학교 전체공지는 과목알림과 구분합니다.</p>
    </div>
  )
}
