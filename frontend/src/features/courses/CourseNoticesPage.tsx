import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError } from '../../shared/api/client'
import {
  getCourseNotifications,
  getCourses,
  setCourseDemoPassword,
  type CourseList,
  type CourseNotification,
  type CourseNotifications,
  type NotificationType,
} from './api'
import {
  TYPE_LABELS,
  isPastDue,
  kstLabel,
  materialLabel,
} from './course-notice-format'
import './courses.css'

type Filter = 'ALL' | NotificationType
type Load<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string; code: string | null }
  | { status: 'ready'; data: T }

const FILTERS: Filter[] = ['ALL', 'ANNOUNCEMENT', 'ASSIGNMENT', 'MATERIAL']
const DEMO_PASSWORD_REQUIRED = 'LMS_DEMO_UNAUTHORIZED'

function failure(cause: unknown, fallback: string) {
  // 서버 메시지는 운영자용 안내가 섞여 있어 화면에는 공통 문구와 오류 코드만 보여준다.
  const code = cause instanceof ApiError ? cause.code : null
  return {
    status: 'error' as const,
    message: code ? `${fallback} (${code})` : fallback,
    code,
  }
}

export function CourseNoticesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('courseId')
  const [filter, setFilter] = useState<Filter>('ALL')
  const [courses, setCourses] = useState<Load<CourseList>>({
    status: 'loading',
  })
  const [coursesAttempt, setCoursesAttempt] = useState(0)
  const [noticesAttempt, setNoticesAttempt] = useState(0)
  const [passwordTried, setPasswordTried] = useState(false)
  // 결과에 요청 키(과목·재시도 횟수)를 붙여 두고, 현재 키와 다르면 불러오는 중으로 본다.
  const [noticesResult, setNoticesResult] = useState<{
    key: string
    load: Load<CourseNotifications>
  } | null>(null)
  const noticesKey = selectedId ? `${selectedId}#${noticesAttempt}` : null
  const notices: Load<CourseNotifications> | null =
    noticesKey === null
      ? null
      : noticesResult?.key === noticesKey
        ? noticesResult.load
        : { status: 'loading' }

  useEffect(() => {
    let active = true
    getCourses()
      .then((data) => {
        if (active) setCourses({ status: 'ready', data })
      })
      .catch((cause: unknown) => {
        if (active) setCourses(failure(cause, '과목 목록을 불러오지 못했어요.'))
      })
    return () => {
      active = false
    }
  }, [coursesAttempt])

  // 선택한 과목이 없으면 첫 과목을 고른다. 새로고침해도 유지되도록 주소에 남긴다.
  const firstCourseId =
    courses.status === 'ready' ? courses.data.courses[0]?.courseId : undefined
  useEffect(() => {
    if (!selectedId && firstCourseId)
      setSearchParams({ courseId: firstCourseId }, { replace: true })
  }, [selectedId, firstCourseId, setSearchParams])

  useEffect(() => {
    if (!selectedId) return
    const key = `${selectedId}#${noticesAttempt}`
    let active = true
    getCourseNotifications(selectedId)
      .then((data) => {
        if (active) setNoticesResult({ key, load: { status: 'ready', data } })
      })
      .catch((cause: unknown) => {
        if (active)
          setNoticesResult({
            key,
            load: failure(cause, '과목알림을 불러오지 못했어요.'),
          })
      })
    return () => {
      active = false
    }
  }, [selectedId, noticesAttempt])

  function submitPassword(password: string) {
    setCourseDemoPassword(password)
    setPasswordTried(true)
    setCourses({ status: 'loading' })
    setCoursesAttempt((value) => value + 1)
    setNoticesAttempt((value) => value + 1)
  }

  // 배포 서버는 데모 암호를 요구한다. 로컬 개발 서버는 암호 없이 바로 조회된다.
  const needsPassword =
    (courses.status === 'error' && courses.code === DEMO_PASSWORD_REQUIRED) ||
    (notices?.status === 'error' && notices.code === DEMO_PASSWORD_REQUIRED)
  if (needsPassword) {
    return (
      <div className="course-notices">
        <h1>과목알림</h1>
        <DemoPasswordForm wrong={passwordTried} onSubmit={submitPassword} />
      </div>
    )
  }

  return (
    <div className="course-notices">
      <h1>과목알림</h1>
      <p className="home-description">
        수강 과목의 공지·과제·학습자료를 한곳에서 확인해요.
      </p>

      {courses.status === 'loading' && (
        <p className="course-status">과목 목록을 불러오고 있어요…</p>
      )}
      {courses.status === 'error' && (
        <Retry
          message={courses.message}
          onRetry={() => {
            setCourses({ status: 'loading' })
            setCoursesAttempt((value) => value + 1)
          }}
        />
      )}
      {courses.status === 'ready' && courses.data.courses.length === 0 && (
        <p className="course-status">조회할 수 있는 수강 과목이 없어요.</p>
      )}

      {courses.status === 'ready' && courses.data.courses.length > 0 && (
        <>
          <label className="course-select">
            <span>과목</span>
            <select
              value={selectedId ?? ''}
              onChange={(event) =>
                setSearchParams({ courseId: event.target.value })
              }
            >
              {courses.data.courses.map((course) => (
                <option key={course.courseId} value={course.courseId}>
                  {course.courseCode
                    ? `${course.courseName} (${course.courseCode})`
                    : course.courseName}
                </option>
              ))}
            </select>
          </label>

          <div className="course-tabs" role="group" aria-label="알림 종류">
            {FILTERS.map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {value === 'ALL' ? '전체' : TYPE_LABELS[value]}
              </button>
            ))}
          </div>

          {notices?.status === 'loading' && (
            <p className="course-status">알림을 불러오고 있어요…</p>
          )}
          {notices?.status === 'error' && (
            <Retry
              message={notices.message}
              onRetry={() => setNoticesAttempt((value) => value + 1)}
            />
          )}
          {notices?.status === 'ready' && (
            <NoticeList data={notices.data} filter={filter} />
          )}
        </>
      )}

      <p className="home-description course-footnote">
        현재는 데모용 공통 LMS 계정의 과목을 보여줘요. 시간은 한국
        시간(KST)이에요.
        {courses.status === 'ready' && courses.data.truncated && (
          <> 과목이 많아 일부만 표시했어요.</>
        )}
      </p>
    </div>
  )
}

function DemoPasswordForm({
  wrong,
  onSubmit,
}: {
  wrong: boolean
  onSubmit: (password: string) => void
}) {
  const [password, setPassword] = useState('')
  return (
    <form
      className="course-password"
      onSubmit={(event) => {
        event.preventDefault()
        if (password) onSubmit(password)
      }}
    >
      <p className="home-description">
        과목알림은 데모용 공통 LMS 계정의 데이터라 데모 접근 암호가 필요해요.
        Canvas API 토큰을 넣지 마세요.
      </p>
      <label>
        <span>데모 접근 암호</span>
        <input
          type="password"
          autoComplete="off"
          value={password}
          placeholder="발표자에게 받은 데모 암호"
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {wrong && (
        <p className="course-error" role="alert">
          암호가 맞지 않아요. 다시 입력해 주세요.
        </p>
      )}
      <button type="submit" disabled={!password}>
        확인
      </button>
    </form>
  )
}

function Retry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="course-error" role="alert">
      <p>{message}</p>
      <button type="button" onClick={onRetry}>
        다시 시도
      </button>
    </div>
  )
}

function NoticeList({
  data,
  filter,
}: {
  data: CourseNotifications
  filter: Filter
}) {
  const errors = data.errors.filter(
    (error) => filter === 'ALL' || error.type === filter,
  )
  const items = data.notifications.filter(
    (item) => filter === 'ALL' || item.type === filter,
  )

  return (
    <>
      {errors.map((error) => (
        <p className="course-error" role="alert" key={error.type}>
          {TYPE_LABELS[error.type]}을(를) 불러오지 못했어요. 잠시 후 다시 시도해
          주세요. ({error.code})
        </p>
      ))}
      {items.length === 0 && errors.length === 0 && (
        <p className="course-status">
          표시할 {filter === 'ALL' ? '알림' : TYPE_LABELS[filter]}이(가) 없어요.
        </p>
      )}
      <ul className="course-list">
        {items.map((item) => (
          <li key={item.id}>
            <NoticeCard item={item} />
          </li>
        ))}
      </ul>
    </>
  )
}

function NoticeCard({ item }: { item: CourseNotification }) {
  const pastDue = item.type === 'ASSIGNMENT' && isPastDue(item.dueAt)
  const content = (
    <>
      <div className="course-badges">
        <span className={`course-badge course-badge--${item.type}`}>
          {TYPE_LABELS[item.type]}
        </span>
        {pastDue && (
          <span className="course-badge course-badge--past">마감 지남</span>
        )}
      </div>
      <h2>{item.title}</h2>
      <CardMeta item={item} />
    </>
  )

  // LMS 원문 링크가 있으면 새 탭으로 연다. 원문 권한은 LMS가 확인한다.
  return item.sourceUrl ? (
    <a
      className={`home-card course-card${pastDue ? ' course-card--past' : ''}`}
      href={item.sourceUrl}
      target="_blank"
      rel="noreferrer"
    >
      {content}
    </a>
  ) : (
    <div
      className={`home-card course-card${pastDue ? ' course-card--past' : ''}`}
    >
      {content}
    </div>
  )
}

function CardMeta({ item }: { item: CourseNotification }) {
  if (item.type === 'ASSIGNMENT') {
    const due = kstLabel(item.dueAt)
    const lock = kstLabel(item.lockAt)
    return (
      <>
        <p className="course-meta">{due ? `마감 ${due}` : '마감일 없음'}</p>
        {lock && <p className="course-meta">제출 차단 {lock}</p>}
      </>
    )
  }
  if (item.type === 'ANNOUNCEMENT') {
    const posted = kstLabel(item.publishedAt)
    return posted ? <p className="course-meta">게시 {posted}</p> : null
  }
  const details = [item.moduleName, materialLabel(item.materialType)].filter(
    Boolean,
  )
  return details.length > 0 ? (
    <p className="course-meta">{details.join(' · ')}</p>
  ) : null
}
