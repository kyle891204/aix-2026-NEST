import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'
import { useDemoProfile } from '../../profile/demo-profile-context'
import {
  isSignedOut,
  noticeProfile,
  searchNotices,
  type MatchFilter,
  type NoticeSource,
  type NoticeSummary,
} from '../api'
import { dateLine, matchLabel, sourceLabel } from '../notice-display'
import { NoticeLoading } from '../NoticeLoading'
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
  // 세션과 CSRF 토큰을 받기 전에 요청하면 게스트 세션이 둘 생길 수 있어 세션 확인을 기다린다.
  const { loading: authLoading } = useAuth()
  const profile = JSON.stringify(noticeProfile(savedProfile?.profile ?? null))
  const [loaded, setLoaded] = useState<{
    key: string
    items: NoticeSummary[] | null
    error: string | null
    signedOut?: boolean
  } | null>(null)

  // 응답의 key가 현재 조건과 다르면 아직 불러오는 중으로 본다.
  const key = `${source}:${match}:${profile}`
  const current = !authLoading && loaded?.key === key ? loaded : null
  const notices = current?.items ?? null
  const error = current?.error ?? null
  const signedOut = current?.signedOut ?? false

  useEffect(() => {
    if (authLoading) return
    let active = true
    searchNotices(source, match, JSON.parse(profile))
      .then((items) => {
        if (active) setLoaded({ key, items, error: null })
      })
      .catch((cause: unknown) => {
        if (!active) return
        setLoaded(
          isSignedOut(cause)
            ? { key, items: null, error: null, signedOut: true }
            : { key, items: null, error: '공지를 불러오지 못했어요.' },
        )
      })
    return () => {
      active = false
    }
  }, [authLoading, source, match, profile, key])

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
        {/* 불러오는 동안 0건으로 보이지 않도록 다 불러온 뒤에만 건수를 보여준다. */}
        {notices && <strong>총 {notices.length}건</strong>}
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
        </div>
      )}
      {signedOut && (
        <p className="notice-hint">
          로그인하면 공지를 볼 수 있어요. <Link to="/login">로그인하기 ›</Link>
        </p>
      )}
      {!error && !signedOut && !notices && <NoticeLoading />}
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
              <span className="notice-badge">
                {notice.sourceName ?? sourceLabel(notice.source)}
              </span>
            </span>
            <strong>{notice.title}</strong>
            {notice.matchReasons.length > 0 && (
              <span className="notice-hint">
                {notice.matchReasons.join(' · ')}
              </span>
            )}
            <span className="notice-hint">
              {dateLine(notice.deadline, notice.postedAt)}
            </span>
          </Link>
        )
      })}

      <p className="notice-hint">학교 전체공지는 과목알림과 구분합니다.</p>
    </div>
  )
}
