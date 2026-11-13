import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '../../shared/api/client'
import { useAuth } from '../auth/auth-context'
import {
  addDeadlineSchedules,
  isSaved,
  type PersonalSchedule,
} from '../schedule/personal-schedule-store'
import { usePersonalSchedules } from '../schedule/usePersonalSchedules'
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
  safeLinkUrl,
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
  const { session } = useAuth()
  const accountId = session?.user?.id ?? null
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>('ALL')
  const [courses, setCourses] = useState<Load<CourseList>>({
    status: 'loading',
  })
  const [coursesAttempt, setCoursesAttempt] = useState(0)
  const [noticesAttempt, setNoticesAttempt] = useState(0)
  const [passwordTried, setPasswordTried] = useState(false)
  // 주소의 courseId는 과목 목록에 있을 때만 쓴다. 목록에 없는 값은 아래에서 첫 과목으로 바꾼다.
  const requestedId = searchParams.get('courseId')
  const selectedId =
    courses.status === 'ready' &&
    courses.data.courses.some((course) => course.courseId === requestedId)
      ? requestedId
      : null
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

  // 선택한 과목이 없거나 목록에 없는 과목이면 첫 과목을 고른다. 새로고침해도 유지되도록 주소에 남긴다.
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
          {/* 과목이나 계정이 바뀌면 선택과 저장 목록을 다시 만든다. */}
          {notices?.status === 'ready' && (
            <NoticeList
              key={`${accountId ?? 'signed-out'}#${notices.data.courseId}`}
              accountId={accountId}
              data={notices.data}
              filter={filter}
            />
          )}
        </>
      )}

      <p className="home-description course-footnote">
        현재는 데모용 공통 LMS 계정의 과목을 보여줘요. 공지는 최근 90일 것만
        보여주고, 시간은 한국 시간(KST)이에요.
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

// 마감이 지나지 않은 과제만 개인 일정에 저장할 수 있다. LMS 공지·학습자료에는 마감 일시가 없다.
function canSave(item: CourseNotification) {
  return hasDeadlineField(item) && !!item.dueAt && !isPastDue(item.dueAt)
}

// 과제는 LMS 마감일, 공지는 서버가 본문의 "까지·마감" 문구에서 찾은 마감일을 쓴다. 학습자료는 마감이 없다.
function hasDeadlineField(item: CourseNotification) {
  return item.type === 'ANNOUNCEMENT' || item.type === 'ASSIGNMENT'
}

function sourceType(item: CourseNotification) {
  return item.type === 'ANNOUNCEMENT'
    ? 'COURSE_ANNOUNCEMENT'
    : 'COURSE_ASSIGNMENT'
}

function NoticeList({
  accountId,
  data,
  filter,
}: {
  accountId: string | null
  data: CourseNotifications
  filter: Filter
}) {
  const navigate = useNavigate()
  const personal = usePersonalSchedules(accountId)
  const [selected, setSelected] = useState<string[]>([])
  const errors = data.errors.filter(
    (error) => filter === 'ALL' || error.type === filter,
  )
  const items = data.notifications.filter(
    (item) => filter === 'ALL' || item.type === filter,
  )
  const saved = (item: CourseNotification) =>
    isSaved(personal.schedules, sourceType(item), item.id)
  const selectable = data.notifications.some(
    (item) => canSave(item) && !saved(item),
  )

  function toggle(id: string, checked: boolean) {
    setSelected((ids) =>
      checked ? [...ids, id] : ids.filter((value) => value !== id),
    )
  }

  // 저장에 성공하면 개인 저장 탭으로 이동해 이번에 저장한 일정을 보여준다(S10-A·B·AB).
  function save() {
    const picked = data.notifications.filter(
      (item) => selected.includes(item.id) && item.dueAt,
    )
    let added: PersonalSchedule[] = []
    const ok = personal.update((current) => {
      const next = addDeadlineSchedules(
        current,
        picked.map((item) => ({
          sourceType: sourceType(item),
          sourceId: item.id,
          title: item.title,
          dueAt: item.dueAt as string,
          sourceUrl: safeLinkUrl(item.sourceUrl),
        })),
      )
      added = next.filter((item) => !current.includes(item))
      return next
    })
    if (!ok) return
    setSelected([])
    navigate('/schedule?tab=mine', {
      state: { savedIds: added.map((item) => item.id) },
    })
  }

  return (
    <>
      {data.truncated && (
        <p className="course-status">
          LMS 조회 상한 때문에 일부 항목만 표시했어요.
        </p>
      )}
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
      {selectable && (
        <div className="course-selection">
          <strong>
            {selected.length > 0
              ? `${selected.length}개 선택`
              : '마감 있는 공지·과제를 골라 개인 일정에 저장하세요.'}
          </strong>
          {selected.length > 0 && (
            <button type="button" onClick={() => setSelected([])}>
              전체 해제
            </button>
          )}
        </div>
      )}
      <ul className="course-list">
        {items.map((item) => (
          <li key={item.id}>
            {canSave(item) && !saved(item) ? (
              <SelectableCard
                item={item}
                checked={selected.includes(item.id)}
                onToggle={(checked) => toggle(item.id, checked)}
              />
            ) : hasDeadlineField(item) && !item.dueAt ? (
              // 마감을 찾지 못한 공지·과제는 체크를 끄고 "마감 없음"으로 보여준다.
              <SelectableCard item={item} checked={false} />
            ) : (
              <NoticeCard item={item} saved={saved(item)} />
            )}
          </li>
        ))}
      </ul>
      {personal.saveFailed && (
        <p className="course-error" role="alert">
          브라우저에 저장하지 못했어요. 저장 공간이나 브라우저 설정을 확인해
          주세요.
        </p>
      )}
      {/* 목록이 길어도 바로 누를 수 있게 하단 메뉴 위에 띄운다. */}
      {selected.length > 0 && (
        <button type="button" className="course-save" onClick={save}>
          선택한 {selected.length}개 일정 저장
        </button>
      )}
    </>
  )
}

// 왼쪽(체크·내용)을 누르면 선택하고, 오른쪽 화살표는 LMS 원문을 연다(S09 검토 안내).
function SelectableCard({
  item,
  checked,
  onToggle,
}: {
  item: CourseNotification
  checked: boolean
  // 없으면 마감이 없어 고를 수 없는 카드다.
  onToggle?: (checked: boolean) => void
}) {
  const href = safeLinkUrl(item.sourceUrl)
  const due = kstLabel(item.dueAt)
  const posted = kstLabel(item.publishedAt)
  const announcement = item.type === 'ANNOUNCEMENT'
  return (
    <div
      className={`home-card course-card course-card--selectable${checked ? ' is-selected' : ''}${onToggle ? '' : ' is-disabled'}`}
    >
      <label>
        <input
          type="checkbox"
          checked={checked}
          disabled={!onToggle}
          onChange={(event) => onToggle?.(event.target.checked)}
        />
        <span className="course-card-content">
          <span className="course-badges">
            <span className={`course-badge course-badge--${item.type}`}>
              {TYPE_LABELS[item.type]}
            </span>
            <span className="course-due-tag">
              {due
                ? '마감 있음'
                : announcement
                  ? '마감 확인 필요'
                  : '마감 없음'}
            </span>
          </span>
          <strong>{item.title}</strong>
          <span className="course-meta">
            {due
              ? `마감 ${due} · KST${announcement ? ' · 공지 본문 기준' : ''}`
              : announcement && posted
                ? `게시 ${posted}`
                : '마감일 없음'}
          </span>
          {/* 공지 마감은 본문을 읽어 찾으므로, 못 찾았다고 마감이 없다고 단정하지 않는다. */}
          {!due && announcement && (
            <span className="course-meta course-meta--hint">
              본문에서 마감을 찾지 못했어요. 혹시 모르니 원문을 확인해 주세요.
            </span>
          )}
        </span>
      </label>
      {href && (
        <a
          className="course-card-open"
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={`${item.title} 원문 보기`}
        >
          ›
        </a>
      )}
    </div>
  )
}

function NoticeCard({
  item,
  saved,
}: {
  item: CourseNotification
  saved: boolean
}) {
  const pastDue = hasDeadlineField(item) && isPastDue(item.dueAt)
  const content = (
    <>
      <div className="course-badges">
        <span className={`course-badge course-badge--${item.type}`}>
          {TYPE_LABELS[item.type]}
        </span>
        {pastDue && (
          <span className="course-badge course-badge--past">마감 지남</span>
        )}
        {saved && <span className="course-badge">저장됨</span>}
      </div>
      <h2>{item.title}</h2>
      <CardMeta item={item} />
    </>
  )

  // http·https 원문 링크만 새 탭으로 연다. 원문 권한은 LMS가 확인한다.
  const href = safeLinkUrl(item.sourceUrl)
  return href ? (
    <a
      className={`home-card course-card${pastDue ? ' course-card--past' : ''}`}
      href={href}
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
