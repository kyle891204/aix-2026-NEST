import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../shared/api/client'
import { kstLabel } from '../../shared/format/kst'
import { useAuth } from '../auth/auth-context'
import { noticeProfile } from '../notices/api'
import type { SignupProfile } from '../profile/demo-profile'
import {
  dashboardErrorMessage,
  getDashboard,
  type DashboardNotice,
  type DashboardRequest,
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
  | { status: 'signed-out' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: DashboardResult }

export function DashboardNotices({
  profile,
}: {
  profile: SignupProfile | null
}) {
  // 로그인 세션(게스트 포함)과 CSRF 토큰을 먼저 받은 뒤 요청한다. 동시에 보내면 게스트 세션이 둘 생길 수 있다.
  const { loading: authLoading } = useAuth()
  // 전체공지와 같은 값을 보내 같은 공지 중에서 고른다.
  const requestKey = JSON.stringify(noticeProfile(profile))
  const [attempt, setAttempt] = useState(0)
  // 결과에 요청 키(프로필·재시도 횟수)를 붙여 두고, 현재 키와 다르면 불러오는 중으로 본다.
  const [result, setResult] = useState<{ key: string; load: Load } | null>(null)
  const key = `${requestKey}#${attempt}`
  const load: Load =
    !authLoading && result?.key === key ? result.load : { status: 'loading' }

  useEffect(() => {
    if (authLoading) return
    let active = true
    const current = `${requestKey}#${attempt}`
    getDashboard(JSON.parse(requestKey) as DashboardRequest, HOME_LIMIT)
      .then((data) => {
        if (active) setResult({ key: current, load: { status: 'ready', data } })
      })
      .catch((cause: unknown) => {
        const code = cause instanceof ApiError ? cause.code : null
        // 로그인하지 않은 미리보기에서는 다시 시도해도 성공할 수 없으므로 로그인 안내만 보여준다.
        const load: Load =
          code === 'AUTH_REQUIRED'
            ? { status: 'signed-out' }
            : { status: 'error', message: dashboardErrorMessage(cause) }
        if (active) setResult({ key: current, load })
      })
    return () => {
      active = false
    }
  }, [authLoading, requestKey, attempt])

  return (
    <section className="school-notices">
      <div className="home-section-heading">
        <h2>나에게 해당하는 공지</h2>
        <Link to="/notices">모두 보기 ›</Link>
      </div>

      {load.status === 'loading' && (
        <p className="home-description">맞춤 공지를 고르고 있어요…</p>
      )}
      {load.status === 'signed-out' && (
        <p className="dashboard-profile-hint">
          로그인하면 나에게 해당하는 공지를 볼 수 있어요.{' '}
          <Link to="/login">로그인하기 ›</Link>
        </p>
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
  // 앱의 공지 상세로 연다. 쉬운 설명·번역을 볼 수 있고, 처음 열면 공지 대상도 분석한다.
  return (
    <Link
      className="home-card dashboard-notice"
      to={`/notices/${encodeURIComponent(notice.noticeId)}`}
    >
      <div className="notice-badges">
        <span
          className={`dashboard-status dashboard-status--${notice.matchStatus}`}
        >
          {STATUS_LABELS[notice.matchStatus]}
        </span>
        <span>{CATEGORY_LABELS[notice.category] ?? notice.category}</span>
        {notice.sample && <span>예시 데이터</span>}
      </div>
      <h3>{notice.title}</h3>
      <ul className="dashboard-reasons">
        {notice.matchReasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <p>{deadline ? `마감 ${deadline} · KST` : '마감일 없음'}</p>
    </Link>
  )
}
