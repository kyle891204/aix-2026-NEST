import { useState } from 'react'
import type { FormEvent } from 'react'
import { getLmsAnnouncements, getLmsCourses, getLmsProfile } from './api'
import type { LmsAnnouncement, LmsCourse, LmsPage, LmsProfile } from './api'

export function LmsTestPage() {
  const [profile, setProfile] = useState<LmsProfile | null>(null)
  const [courses, setCourses] = useState<LmsPage<LmsCourse> | null>(null)
  const [notices, setNotices] = useState<LmsPage<LmsAnnouncement> | null>(null)
  const [courseId, setCourseId] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [defaultDates] = useState(() => {
    const today = new Date()
    const earlier = new Date(today)
    earlier.setDate(today.getDate() - 90)
    const format = (date: Date) =>
      [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-')
    return { start: format(earlier), end: format(today) }
  })
  const [startDate, setStartDate] = useState(defaultDates.start)
  const [endDate, setEndDate] = useState(defaultDates.end)

  async function loadCourses() {
    setBusy(true)
    setError('')
    setNotices(null)
    setCourses(null)
    setProfile(null)
    setCourseId('')
    try {
      const owner = await getLmsProfile()
      setProfile(owner)
      const result = await getLmsCourses()
      setCourses(result)
      if (result.items[0]) setCourseId(String(result.items[0].id))
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'LMS 조회에 실패했습니다.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function loadNotices(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotices(null)
    try {
      setNotices(
        await getLmsAnnouncements(Number(courseId), startDate, endDate),
      )
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : '공지 조회에 실패했습니다.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="page-intro">
      <h1>LMS 연동 테스트</h1>
      <p>
        backend/.env에 토큰을 넣고 백엔드를 재시작한 후 테스트하세요. 화면에서
        토큰을 입력하거나 표시하지 않습니다.
      </p>
      <button onClick={loadCourses} disabled={busy}>
        {busy ? '조회 중…' : '본인 정보·수강 과목 조회'}
      </button>
      <p aria-live="polite" className="error-text">
        {error}
      </p>
      {profile && (
        <p>
          연결된 계정: {profile.name} (ID {profile.id})
        </p>
      )}
      {courses && (
        <>
          <p>
            조회된 과목: {courses.items.length}개 · {courses.pagesFetched}페이지
          </p>
          {courses.truncated && (
            <p className="result-note">5페이지 제한으로 일부만 표시합니다.</p>
          )}
          {courses.items.length === 0 ? (
            <p>활성 수강 과목이 없습니다.</p>
          ) : (
            <form onSubmit={loadNotices}>
              <label>
                과목
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  disabled={busy}
                  required
                >
                  {courses.items.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                시작일
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  disabled={busy}
                />
              </label>
              <label>
                종료일
                <input
                  type="date"
                  min={startDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  disabled={busy}
                />
              </label>
              <button disabled={busy}>과목 공지 조회</button>
            </form>
          )}
        </>
      )}
      {notices && (
        <>
          <h2>과목 공지 {notices.items.length}건</h2>
          {notices.truncated && (
            <p className="result-note">5페이지 제한으로 일부만 표시합니다.</p>
          )}
          {!notices.items.length && (
            <p>
              선택한 기간에 반환된 공지가 없습니다. 기간이나 과목을 변경해
              보세요.
            </p>
          )}
          <ul className="result-list">
            {notices.items.map((notice) => (
              <li key={notice.id}>
                <h2>{notice.title}</h2>
                <p className="result-note">{notice.posted_at}</p>
                <pre>{notice.message}</pre>
              </li>
            ))}
          </ul>
          <p className="result-note">
            본문 HTML은 실행하지 않고 텍스트로 표시합니다. LMS 화면의 실제
            공지와 대조하세요.
          </p>
        </>
      )}
    </section>
  )
}
