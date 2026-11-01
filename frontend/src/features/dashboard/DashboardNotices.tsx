import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../shared/api/client'
import { kstLabel } from '../../shared/format/kst'
import type { SignupProfile } from '../profile/demo-profile'
import {
  getDashboard,
  type DashboardNotice,
  type DashboardProfile,
  type DashboardResult,
} from './api'
import './dashboard.css'

const HOME_LIMIT = 3

const STATUS_LABELS: Record<DashboardNotice['matchStatus'], string> = {
  APPLICABLE: '해당',
  NEEDS_REVIEW: '확인 필요',
}

const CATEGORY_LABELS: Record<string, string> = {
  VISA: '비자',
  SCHOLARSHIP: '장학',
  ACADEMIC: '학사',
  EVENT: '행사',
  ETC: '기타',
}

// 비자는 아직 프로필에서 입력받지 않으므로 채워 달라고 안내하지 않는다.
const ASKABLE_FIELDS = ['nationality', 'degree', 'year']

type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: DashboardResult }

function toRequest(profile: SignupProfile | null): DashboardProfile {
  return {
    nationality: profile?.nationality || null,
    visaType: null,
    degree: profile?.degree || null,
    year: profile?.year || null,
  }
}

export function DashboardNotices({
  profile,
}: {
  profile: SignupProfile | null
}) {
  const request = toRequest(profile)
  const requestKey = JSON.stringify(request)
  const [attempt, setAttempt] = useState(0)
  // 결과에 요청 키(프로필·재시도 횟수)를 붙여 두고, 현재 키와 다르면 불러오는 중으로 본다.
  const [result, setResult] = useState<{ key: string; load: Load } | null>(null)
  const key = `${requestKey}#${attempt}`
  const load: Load = result?.key === key ? result.load : { status: 'loading' }

  useEffect(() => {
    let active = true
    const current = `${requestKey}#${attempt}`
    getDashboard(JSON.parse(requestKey) as DashboardProfile, HOME_LIMIT)
      .then((data) => {
        if (active) setResult({ key: current, load: { status: 'ready', data } })
      })
      .catch((cause: unknown) => {
        const code = cause instanceof ApiError ? cause.code : null
        const message = code
          ? `맞춤 공지를 불러오지 못했어요. (${code})`
          : '맞춤 공지를 불러오지 못했어요.'
        if (active)
          setResult({ key: current, load: { status: 'error', message } })
      })
    return () => {
      active = false
    }
  }, [requestKey, attempt])

  return (
    <section className="school-notices">
      <div className="home-section-heading">
        <h2>나에게 해당하는 공지</h2>
        <Link to="/notices">모두 보기 ›</Link>
      </div>

      {load.status === 'loading' && (
        <p className="home-description">맞춤 공지를 고르고 있어요…</p>
      )}
      {load.status === 'error' && (
        <div className="dashboard-error" role="alert">
          <p>{load.message}</p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            다시 시도
          </button>
        </div>
      )}
      {load.status === 'ready' && <NoticeCards data={load.data} />}

      <p className="dashboard-description">
        검토용 예시 공지 · 실제 학교 공지는 연결 전
      </p>
    </section>
  )
}

function NoticeCards({ data }: { data: DashboardResult }) {
  const askProfile = data.missingProfileFields.some((field) =>
    ASKABLE_FIELDS.includes(field),
  )
  return (
    <>
      {askProfile && (
        <p className="dashboard-profile-hint">
          프로필에 국적·학위과정·학년을 입력하면 더 정확하게 골라드려요.{' '}
          <Link to="/profile">입력하기 ›</Link>
        </p>
      )}
      {data.matchedNotices.length === 0 && (
        <p className="home-description">지금 나에게 해당하는 공지가 없어요.</p>
      )}
      <div className="dashboard-notice-list">
        {data.matchedNotices.map((notice) => (
          <NoticeCard key={notice.noticeId} notice={notice} />
        ))}
      </div>
    </>
  )
}

function NoticeCard({ notice }: { notice: DashboardNotice }) {
  const deadline = kstLabel(notice.deadline)
  const content = (
    <>
      <div className="notice-badges">
        <span
          className={`dashboard-status dashboard-status--${notice.matchStatus}`}
        >
          {STATUS_LABELS[notice.matchStatus]}
        </span>
        <span>{CATEGORY_LABELS[notice.category] ?? notice.category}</span>
      </div>
      <h3>{notice.title}</h3>
      <ul className="dashboard-reasons">
        {notice.matchReasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <p>{deadline ? `마감 ${deadline} · KST` : '마감일 없음'}</p>
    </>
  )
  return notice.sourceUrl ? (
    <a
      className="home-card dashboard-notice"
      href={notice.sourceUrl}
      target="_blank"
      rel="noreferrer"
    >
      {content}
    </a>
  ) : (
    <article className="home-card dashboard-notice">{content}</article>
  )
}
