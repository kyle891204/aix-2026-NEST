import { useLanguage } from '../../shared/i18n/language-context'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../shared/api/client'
import { schoolMessage } from '../../shared/i18n/school-message'
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
import {
  getDashboardCourseSchedules,
  type DashboardCourseSchedule,
} from './course-schedules'
import './dashboard.css'

const HOME_LIMIT = 3
type NoticeFilter = 'all' | 'school' | 'course'

const STATUS_LABELS: Record<DashboardNotice['matchStatus'], string> = {
  APPLICABLE: '해당',
  NEEDS_REVIEW: '확인 필요',
}

const CATEGORY_LABELS: Record<string, string> = {
  VISA: '비자',
  SCHOLARSHIP: '장학',
  ACADEMIC: '학사 안내',
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
  const { t, language } = useLanguage()

  // 로그인 세션(게스트 포함)과 CSRF 토큰을 먼저 받은 뒤 요청한다. 동시에 보내면 게스트 세션이 둘 생길 수 있다.
  const { loading: authLoading } = useAuth()
  const [filter, setFilter] = useState<NoticeFilter>('all')
  // 전체공지와 같은 값을 보내 같은 공지 중에서 고른다.
  const requestKey = JSON.stringify(noticeProfile(profile))
  const [attempt, setAttempt] = useState(0)
  // 결과에 요청 키(프로필·재시도 횟수)를 붙여 두고, 현재 키와 다르면 불러오는 중으로 본다.
  const [result, setResult] = useState<{ key: string; load: Load } | null>(null)
  const key = `${requestKey}#${attempt}`
  const load: Load =
    !authLoading && result?.key === key ? result.load : { status: 'loading' }
  const [courseAttempt, setCourseAttempt] = useState(0)
  const [courseResult, setCourseResult] = useState<{
    attempt: number
    load:
      | { status: 'ready'; items: DashboardCourseSchedule[] }
      | { status: 'error'; code: string | null }
  } | null>(null)
  const courseLoad =
    !authLoading && courseResult?.attempt === courseAttempt
      ? courseResult.load
      : { status: 'loading' as const }

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

  useEffect(() => {
    if (authLoading) return
    let active = true
    getDashboardCourseSchedules(HOME_LIMIT)
      .then((items) => {
        if (active)
          setCourseResult({
            attempt: courseAttempt,
            load: { status: 'ready', items },
          })
      })
      .catch((cause: unknown) => {
        if (active)
          setCourseResult({
            attempt: courseAttempt,
            load: {
              status: 'error',
              code: cause instanceof ApiError ? cause.code : null,
            },
          })
      })
    return () => {
      active = false
    }
  }, [authLoading, courseAttempt])

  const showSchool = filter !== 'course'
  const showCourse = filter !== 'school'
  const schoolNotices = load.status === 'ready' ? load.data.matchedNotices : []
  const courseSchedules = courseLoad.status === 'ready' ? courseLoad.items : []
  const entries = [
    ...(showSchool
      ? schoolNotices.map((notice) => ({
          kind: 'school' as const,
          notice,
          dueAt: notice.deadline,
        }))
      : []),
    ...(showCourse
      ? courseSchedules.map((schedule) => ({
          kind: 'course' as const,
          schedule,
          dueAt: schedule.dueAt,
        }))
      : []),
  ].sort((a, b) => {
    const first = a.dueAt ? Date.parse(a.dueAt) : Infinity
    const second = b.dueAt ? Date.parse(b.dueAt) : Infinity
    return first - second
  })
  const loading =
    (showSchool && load.status === 'loading') ||
    (showCourse && courseLoad.status === 'loading')

  return (
    <section className="school-notices">
      <div className="home-section-heading">
        <h2>{t('나에게 해당하는 공지')}</h2>
        <Link to={filter === 'course' ? '/course-notices' : '/notices'}>
          {t('모두 보기 ›')}
        </Link>
      </div>

      <div
        className="dashboard-filters"
        role="group"
        aria-label={t('공지 종류')}
      >
        <button
          type="button"
          aria-pressed={filter === 'school'}
          onClick={() => setFilter(filter === 'school' ? 'all' : 'school')}
        >
          {t('학교공지')}
        </button>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          aria-pressed={filter === 'course'}
          onClick={() => setFilter(filter === 'course' ? 'all' : 'course')}
        >
          {t('과목일정')}
        </button>
      </div>

      {loading && entries.length === 0 && (
        <p className="home-description">{t('맞춤 공지를 고르고 있어요…')}</p>
      )}
      {showSchool && load.status === 'signed-out' && (
        <p className="dashboard-profile-hint">
          {t('로그인하면 나에게 해당하는 공지를 볼 수 있어요.')}{' '}
          <Link to="/login">{t('로그인하기 ›')}</Link>
        </p>
      )}
      {showSchool && load.status === 'error' && (
        <div className="dashboard-error" role="alert">
          <p>{schoolMessage(language, load.message)}</p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            {t('다시 시도')}
          </button>
        </div>
      )}
      {showCourse && courseLoad.status === 'error' && (
        <div className="dashboard-course-message" role="status">
          <p>
            {t(
              courseLoad.code === 'LMS_DEMO_UNAUTHORIZED'
                ? '과목일정을 보려면 과목알림에서 데모 암호를 입력해 주세요.'
                : '과목일정을 불러오지 못했어요.',
            )}
          </p>
          <Link to="/course-notices">{t('과목알림 보기 ›')}</Link>
          <button
            type="button"
            onClick={() => setCourseAttempt((value) => value + 1)}
          >
            {t('다시 시도')}
          </button>
        </div>
      )}
      {showSchool && load.status === 'ready' && (
        <ProfileHint data={load.data} />
      )}
      {!loading &&
        entries.length === 0 &&
        (!showSchool || load.status === 'ready') &&
        (!showCourse || courseLoad.status === 'ready') && (
          <p className="home-description">
            {t(
              filter === 'course'
                ? '지금 표시할 과목일정이 없어요.'
                : '지금 나에게 해당하는 공지가 없어요.',
            )}
          </p>
        )}
      {entries.length > 0 && (
        <div className="dashboard-notice-list">
          {entries.map((entry) =>
            entry.kind === 'school' ? (
              <NoticeCard
                key={`school:${entry.notice.noticeId}`}
                notice={entry.notice}
              />
            ) : (
              <CourseScheduleCard
                key={`course:${entry.schedule.id}`}
                schedule={entry.schedule}
              />
            ),
          )}
        </div>
      )}
    </section>
  )
}

function ProfileHint({ data }: { data: DashboardResult }) {
  const { t } = useLanguage()

  const askProfile = data.missingProfileFields.some((field) =>
    ASKABLE_FIELDS.includes(field),
  )
  return askProfile ? (
    <p className="dashboard-profile-hint">
      {t('프로필에 국적·학위과정·학년을 입력하면 더 정확하게 골라드려요.')}{' '}
      <Link to="/profile">{t('입력하기 ›')}</Link>
    </p>
  ) : null
}

function CourseScheduleCard({
  schedule,
}: {
  schedule: DashboardCourseSchedule
}) {
  const { t, language } = useLanguage()
  return (
    <Link
      className="home-card dashboard-notice"
      to={`/course-notices?courseId=${encodeURIComponent(schedule.courseId)}`}
    >
      <div className="notice-badges">
        <span>{t('과목일정')}</span>
        <span>{schedule.courseName}</span>
      </div>
      <h3>{schedule.title}</h3>
      <p>
        {t('마감 {date} · KST', {
          date: kstLabel(schedule.dueAt, language) ?? '',
        })}
      </p>
    </Link>
  )
}

function NoticeCard({ notice }: { notice: DashboardNotice }) {
  const { t, language } = useLanguage()

  const deadline = kstLabel(notice.deadline, language)
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
          {t(STATUS_LABELS[notice.matchStatus])}
        </span>
        <span>
          {notice.category === 'ACADEMIC' && language === 'ko'
            ? '학사'
            : t(CATEGORY_LABELS[notice.category] ?? notice.category)}
        </span>
        {notice.sample && <span>{t('예시 데이터')}</span>}
      </div>
      <h3>{notice.title}</h3>
      <ul className="dashboard-reasons">
        {notice.matchReasons.map((reason) => (
          <li key={reason}>{schoolMessage(language, reason)}</li>
        ))}
      </ul>
      <p>
        {deadline
          ? t('마감 {date} · KST', { date: deadline })
          : t('마감일 없음')}
      </p>
    </Link>
  )
}
