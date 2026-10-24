import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { ApiError } from '../../shared/api/client'
import {
  getLmsAnnouncements,
  getLmsAssignments,
  getLmsCourse,
  getLmsCourses,
  getLmsModuleItems,
  getLmsModules,
  getLmsProfile,
} from './api'
import type {
  LmsAnnouncement,
  LmsAssignment,
  LmsCourse,
  LmsCourseDetail,
  LmsModule,
  LmsModuleItem,
  LmsPage,
  LmsProfile,
} from './api'

type Result<T> =
  { data: T; error?: never } | { data?: never; error: string } | null

function settled<T>(result: PromiseSettledResult<T>): Result<T> {
  if (result.status === 'rejected' && result.reason instanceof ApiError) {
    const error = result.reason
    return {
      error: `${error.message} (${error.code ?? 'API_ERROR'} · 서버 HTTP ${error.status}${error.upstreamStatus == null ? '' : ` · LMS HTTP ${error.upstreamStatus}`})`,
    }
  }
  return result.status === 'fulfilled'
    ? { data: result.value }
    : {
        error:
          result.reason instanceof Error
            ? result.reason.message
            : '조회에 실패했습니다.',
      }
}

function dateLabel(value: string | null | undefined) {
  if (!value) return 'API에 날짜가 제공되지 않음'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? `날짜 형식 확인 필요: ${value}`
    : `${new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)} (한국 시간) · 원본 ${value}`
}

function OriginalLink({ url }: { url: string | null }) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (!['https:', 'http:'].includes(parsed.protocol)) return null
  } catch {
    return null
  }
  return (
    <a href={url} target="_blank" rel="noreferrer">
      LMS 원문 열기
    </a>
  )
}

function PageInfo({ page }: { page: LmsPage<unknown> }) {
  return (
    <p className="result-note">
      반환 {page.items.length}건 · {page.pagesFetched}페이지
      {page.truncated && ' · 5페이지 제한으로 일부만 조회됨'}
    </p>
  )
}

function Panel<T>({
  title,
  result,
  children,
}: {
  title: string
  result: Result<T>
  children: (data: T) => ReactNode
}) {
  if (!result) return null
  return (
    <section className="lms-panel">
      <h2>{title}</h2>
      {result.error !== undefined ? (
        <p role="alert" className="error-text">
          {result.error}
        </p>
      ) : (
        children(result.data as T)
      )}
    </section>
  )
}

export function LmsTestPage() {
  const [profile, setProfile] = useState<Result<LmsProfile>>(null)
  const [courses, setCourses] = useState<Result<LmsPage<LmsCourse>>>(null)
  const [course, setCourse] = useState<Result<LmsCourseDetail>>(null)
  const [notices, setNotices] = useState<Result<LmsPage<LmsAnnouncement>>>(null)
  const [assignments, setAssignments] =
    useState<Result<LmsPage<LmsAssignment>>>(null)
  const [modules, setModules] = useState<Result<LmsPage<LmsModule>>>(null)
  const [items, setItems] = useState<Result<LmsPage<LmsModuleItem>>>(null)
  const [courseId, setCourseId] = useState('')
  const [moduleName, setModuleName] = useState('')
  const [busy, setBusy] = useState(false)
  const [defaultDates] = useState(() => {
    const today = new Date()
    const earlier = new Date(today)
    earlier.setDate(today.getDate() - 90)
    const format = (date: Date) =>
      new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date)
    return { start: format(earlier), end: format(today) }
  })
  const [startDate, setStartDate] = useState(defaultDates.start)
  const [endDate, setEndDate] = useState(defaultDates.end)

  function clearCourse() {
    setCourse(null)
    setNotices(null)
    setAssignments(null)
    setModules(null)
    setItems(null)
  }

  async function loadCourses() {
    setBusy(true)
    setProfile(null)
    setCourses(null)
    setCourseId('')
    clearCourse()
    try {
      const [owner, list] = await Promise.allSettled([
        getLmsProfile(),
        getLmsCourses(),
      ])
      setProfile(settled(owner))
      setCourses(settled(list))
      if (list.status === 'fulfilled' && list.value.items[0])
        setCourseId(String(list.value.items[0].id))
    } finally {
      setBusy(false)
    }
  }

  async function loadCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    clearCourse()
    try {
      const id = Number(courseId)
      const [detail, news, tasks, units] = await Promise.allSettled([
        getLmsCourse(id),
        getLmsAnnouncements(id, startDate, endDate),
        getLmsAssignments(id),
        getLmsModules(id),
      ])
      setCourse(settled(detail))
      setNotices(settled(news))
      setAssignments(settled(tasks))
      setModules(settled(units))
    } finally {
      setBusy(false)
    }
  }

  async function loadItems(module: LmsModule) {
    setBusy(true)
    setItems(null)
    setModuleName(module.name)
    try {
      const [result] = await Promise.allSettled([
        getLmsModuleItems(Number(courseId), module.id),
      ])
      setItems(settled(result))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="page-intro">
      <h1>LMS 연동 테스트</h1>
      <p>개발자 본인의 과목·공지·과제·학습 항목을 읽기 전용으로 검사합니다.</p>
      <p className="result-note">
        backend/.env에 LMS_API_TOKEN을 설정하고 서버를 재시작하세요. 토큰 입력은
        서버 설정에서만 합니다.
      </p>
      <button onClick={loadCourses} disabled={busy}>
        본인 정보·수강 과목 조회
      </button>
      <p role="status" aria-live="polite">
        {busy ? 'LMS 조회 중…' : ''}
      </p>
      <Panel title="연결 계정" result={profile}>
        {(data) => (
          <p>
            {data.name} (ID {data.id})
          </p>
        )}
      </Panel>
      <Panel title="수강 과목" result={courses}>
        {(data) => (
          <>
            <PageInfo page={data} />
            {!data.items.length ? (
              <p>활성 수강 과목이 반환되지 않았습니다.</p>
            ) : (
              <form onSubmit={loadCourse}>
                <label>
                  과목
                  <select
                    aria-label="과목"
                    value={courseId}
                    disabled={busy}
                    required
                    onChange={(e) => {
                      setCourseId(e.target.value)
                      clearCourse()
                    }}
                  >
                    {data.items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                        {item.course_code ? ` (${item.course_code})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  공지 시작일
                  <input
                    type="date"
                    value={startDate}
                    disabled={busy}
                    required
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      setNotices(null)
                    }}
                  />
                </label>
                <label>
                  공지 종료일
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    disabled={busy}
                    required
                    onChange={(e) => {
                      setEndDate(e.target.value)
                      setNotices(null)
                    }}
                  />
                </label>
                <p className="result-note">
                  기간은 공지에만 적용됩니다. 과제는 반환된 전체 목록을
                  조회합니다.
                </p>
                <button disabled={busy}>
                  선택 과목의 설명·공지·과제·학습 목록 조회
                </button>
              </form>
            )}
          </>
        )}
      </Panel>
      <Panel title="과목 설명" result={course}>
        {(data) => (
          <>
            <h3>{data.name}</h3>
            <p>과목 코드: {data.course_code ?? '제공되지 않음'}</p>
            <p>
              과목 시간대: {data.time_zone ?? '제공되지 않음'} · 상태:{' '}
              {data.workflow_state ?? '제공되지 않음'}
            </p>
            <p>
              {data.public_description ||
                '공개 과목 설명이 제공되지 않았습니다.'}
            </p>
            <details>
              <summary>강의계획 원본 HTML 확인</summary>
              <pre>
                {data.syllabus_body ||
                  '강의계획 본문이 제공되지 않았습니다. LMS 화면에서 확인하세요.'}
              </pre>
            </details>
          </>
        )}
      </Panel>
      <Panel title="과목 공지" result={notices}>
        {(data) => (
          <>
            <PageInfo page={data} />
            {!data.items.length && (
              <p>
                기간 내 공지가 반환되지 않았습니다. 과목·기간을 바꿔 확인하세요.
              </p>
            )}
            <ul className="result-list">
              {data.items.map((item) => (
                <li key={item.id}>
                  <h3>{item.title}</h3>
                  <p className="result-note">
                    게시: {dateLabel(item.posted_at)} ·{' '}
                    {item.context_code ?? `course_${courseId}`}
                  </p>
                  <pre>{item.message || '본문이 제공되지 않음'}</pre>
                  <OriginalLink url={item.html_url} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
      <Panel title="과제와 마감일" result={assignments}>
        {(data) => (
          <>
            <PageInfo page={data} />
            <p className="result-note">
              조회 계정에 적용되는 날짜를 요청합니다. 개인 연장·분반별 기한은
              본인의 LMS 화면과 대조하세요. 날짜 누락은 ‘마감 없음’으로 확정하지
              않습니다.
            </p>
            {!data.items.length && (
              <p>
                과제가 반환되지 않았습니다. 공개 여부·과목·별도 LearningX 도구를
                확인하세요.
              </p>
            )}
            <ul className="result-list">
              {data.items.map((item) => (
                <li key={item.id}>
                  <h3>{item.name}</h3>
                  <p>마감: {dateLabel(item.due_at)}</p>
                  <p>제출 가능 시작: {dateLabel(item.unlock_at)}</p>
                  <p>제출 차단: {dateLabel(item.lock_at)}</p>
                  <p>
                    제출 방식:{' '}
                    {item.submission_types?.join(', ') || '제공되지 않음'} ·
                    배점: {item.points_possible ?? '제공되지 않음'}
                  </p>
                  <p>
                    현재 계정 잠금:{' '}
                    {item.locked_for_user == null
                      ? '제공되지 않음'
                      : item.locked_for_user
                        ? '잠김'
                        : '잠기지 않음'}
                  </p>
                  <details>
                    <summary>과제 설명 원본 HTML</summary>
                    <pre>{item.description || '설명이 제공되지 않음'}</pre>
                  </details>
                  <OriginalLink url={item.html_url} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
      <Panel title="주차별 학습 목록" result={modules}>
        {(data) => (
          <>
            <PageInfo page={data} />
            {!data.items.length && (
              <p>
                모듈이 반환되지 않았습니다. 주차별 화면이 별도 도구인지
                확인하세요.
              </p>
            )}
            <ul className="result-list">
              {data.items.map((item) => (
                <li key={item.id}>
                  <h3>{item.name}</h3>
                  <p>
                    {item.items_count ?? '?'}개 항목 ·{' '}
                    {item.state ?? '상태 미제공'}
                  </p>
                  <button disabled={busy} onClick={() => loadItems(item)}>
                    학습 항목 조회
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
      <Panel title={`${moduleName} · 학습 항목`} result={items}>
        {(data) => (
          <>
            <PageInfo page={data} />
            {!data.items.length && <p>학습 항목이 반환되지 않았습니다.</p>}
            <ul className="result-list">
              {data.items.map((item) => (
                <li key={item.id}>
                  <h3>{item.title}</h3>
                  <p>종류: {item.type}</p>
                  {item.content_details && (
                    <p>마감: {dateLabel(item.content_details.due_at)}</p>
                  )}
                  <OriginalLink url={item.html_url} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
      <p className="result-note">
        HTML은 실행하지 않고 텍스트로 표시합니다. 빈 목록·조회 실패·일부 조회를
        구분해 실제 LMS와 대조하세요.
      </p>
    </section>
  )
}
