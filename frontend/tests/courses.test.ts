import { strict as assert } from 'node:assert'
import { afterEach, test } from 'node:test'
import {
  getCourseNotifications,
  getCourseOverview,
  getCourses,
  setCourseDemoPassword,
} from '../src/features/courses/api.ts'
import {
  courseLabel,
  shortName,
  splitByTerm,
} from '../src/features/courses/course-names.ts'
import {
  canSave,
  detailPath,
  isPastDue,
  kstLabel,
  materialLabel,
  safeLinkUrl,
} from '../src/features/courses/course-notice-format.ts'

const originalFetch = globalThis.fetch
let requestedUrl = ''
let sentPassword: string | null = null

function mockFetch(body: unknown) {
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    requestedUrl = url
    sentPassword = new Headers(init.headers).get('X-LMS-Demo-Password')
    return new Response(JSON.stringify(body), { status: 200 })
  }) as typeof fetch
}

afterEach(() => {
  globalThis.fetch = originalFetch
  setCourseDemoPassword('')
})

test('the demo password header is sent only after it is entered', async () => {
  const empty = { courses: [], truncated: false }
  mockFetch(empty)
  await getCourses()
  assert.equal(sentPassword, null)

  setCourseDemoPassword('demo-fixture')
  mockFetch(empty)
  await getCourses()
  assert.equal(sentPassword, 'demo-fixture')
})

test('LMS times are shown in Korean time regardless of the original offset', () => {
  assert.equal(kstLabel('2026-11-03T14:59:00Z'), '11/3(화) 23:59')
  assert.equal(kstLabel('2026-11-03T23:59:00+09:00'), '11/3(화) 23:59')
  assert.equal(kstLabel(null), null)
  assert.equal(kstLabel('not-a-date'), 'not-a-date')
})

test('only assignments whose due time has passed are past due', () => {
  const now = Date.parse('2026-11-01T00:00:00Z')
  assert.equal(isPastDue('2026-10-31T14:59:00Z', now), true)
  assert.equal(isPastDue('2026-11-02T00:00:00+09:00', now), false)
  assert.equal(isPastDue(null, now), false)
  assert.equal(isPastDue('not-a-date', now), false)
})

test('material types get Korean labels and unknown types stay as is', () => {
  assert.equal(materialLabel('File'), '파일')
  assert.equal(materialLabel('ExternalUrl'), '링크')
  assert.equal(materialLabel('SubHeader'), 'SubHeader')
  assert.equal(materialLabel(null), null)
})

test('course list is read from /courses and validated', async () => {
  mockFetch({
    courses: [
      {
        courseId: '12',
        courseName: '자료구조',
        courseCode: 'CSE2010',
        termName: null,
      },
    ],
    truncated: false,
  })
  const result = await getCourses()
  assert.equal(requestedUrl, '/api/v1/courses')
  assert.equal(result.courses[0].courseName, '자료구조')

  mockFetch({ courses: [{ id: 12 }], truncated: false })
  await assert.rejects(getCourses(), /과목 목록 응답/)
})

test('notifications keep partial errors and reject unknown types', async () => {
  mockFetch({
    courseId: '12',
    notifications: [
      {
        courseId: '12',
        id: 'assignment-22',
        type: 'ASSIGNMENT',
        title: '9주차 과제',
        dueAt: '2026-11-03T14:59:00Z',
      },
    ],
    errors: [{ type: 'MATERIAL', code: 'LMS_CONNECTION_FAILED' }],
    truncated: true,
  })
  const result = await getCourseNotifications('12')
  assert.equal(requestedUrl, '/api/v1/courses/12/notifications')
  assert.equal(result.notifications[0].type, 'ASSIGNMENT')
  assert.deepEqual(result.errors, [
    { type: 'MATERIAL', code: 'LMS_CONNECTION_FAILED' },
  ])
  assert.equal(result.truncated, true)

  mockFetch({
    courseId: '12',
    notifications: [
      { courseId: '12', id: 'quiz-1', type: 'QUIZ', title: '퀴즈' },
    ],
    errors: [],
    truncated: false,
  })
  await assert.rejects(getCourseNotifications('12'), /과목알림 응답/)

  mockFetch({ courseId: '12', notifications: [], errors: [] })
  await assert.rejects(getCourseNotifications('12'), /과목알림 응답/)
})

test('only http and https source links become clickable', () => {
  assert.equal(
    safeLinkUrl('https://learning.hanyang.ac.kr/courses/12'),
    'https://learning.hanyang.ac.kr/courses/12',
  )
  assert.equal(safeLinkUrl('http://lms.test/a/1'), 'http://lms.test/a/1')
  assert.equal(safeLinkUrl('javascript:alert(1)'), null)
  assert.equal(safeLinkUrl('data:text/html,hi'), null)
  assert.equal(safeLinkUrl('/relative/path'), null)
  assert.equal(safeLinkUrl(null), null)
})

test('the overview of every course is read from /courses/notifications', async () => {
  const course = {
    courseId: '12',
    courseName: '자료구조',
    courseCode: null,
    termName: null,
  }
  mockFetch({
    courses: [course],
    notifications: [
      {
        courseId: '12',
        id: 'announcement-1',
        type: 'ANNOUNCEMENT',
        title: '중간 발표',
        content: '발표를 준비하세요.',
      },
    ],
    errors: [{ courseId: '12', type: 'ASSIGNMENT', code: 'LMS_HTTP_ERROR' }],
    truncated: false,
  })
  const result = await getCourseOverview()
  assert.equal(requestedUrl, '/api/v1/courses/notifications')
  assert.equal(result.notifications[0].content, '발표를 준비하세요.')
  assert.equal(result.errors[0].courseId, '12')

  // 어느 과목의 오류인지 모르면 화면에 안내할 수 없어 형식 오류로 본다.
  mockFetch({
    courses: [course],
    notifications: [],
    errors: [{ type: 'ASSIGNMENT', code: 'LMS_HTTP_ERROR' }],
    truncated: false,
  })
  await assert.rejects(getCourseOverview(), /과목알림 응답/)
})

test('LMS course names are split into name, term and a short card label', () => {
  const label = (courseName: string) =>
    courseLabel({ courseId: '1', courseName, courseCode: null, termName: null })
  assert.deepEqual(label('202620HY23658_AI+X공학융합프로젝트'), {
    name: 'AI+X공학융합프로젝트',
    term: '2026-2',
    termKey: '202620',
    short: 'AIX',
  })
  assert.equal(label('202510HY20287_CORE기초통계').term, '2025-1')
  assert.equal(
    label('202620HY20027_프로젝트관리입문(CPMS)(클러스터)').short,
    'CPMS',
  )
  assert.equal(label('202620HY23657_데이터베이스').short, '데이터베')
  // 형식이 다른 이름은 그대로 쓴다.
  assert.deepEqual(label('자료구조'), {
    name: '자료구조',
    term: null,
    termKey: '',
    short: '자료구조',
  })
  assert.equal(shortName('ICT창업캡스톤디자인'), 'ICT')
})

test('only the latest semester courses are shown first', () => {
  const course = (courseId: string, courseName: string) => ({
    courseId,
    courseName,
    courseCode: null,
    termName: null,
  })
  const { current, past } = splitByTerm([
    course('1', '202510HY20287_CORE기초통계'),
    course('2', '202620HY23657_데이터베이스'),
    course('3', '자료구조'),
  ])
  assert.deepEqual(
    current.map((item) => item.course.courseId),
    ['2', '3'],
  )
  assert.deepEqual(
    past.map((item) => item.course.courseId),
    ['1'],
  )
})

test('only announcements and assignments before the deadline can be saved or opened in the app', () => {
  const now = Date.parse('2026-11-01T00:00:00Z')
  const item = (
    type: 'ANNOUNCEMENT' | 'ASSIGNMENT' | 'MATERIAL',
    dueAt: string | null,
  ) => ({
    courseId: '12',
    id: `${type}-1`,
    type,
    dueAt,
  })
  assert.equal(canSave(item('ASSIGNMENT', '2026-11-03T14:59:00Z'), now), true)
  assert.equal(canSave(item('ANNOUNCEMENT', '2026-11-03T14:59:00Z'), now), true)
  assert.equal(canSave(item('ASSIGNMENT', '2026-10-30T14:59:00Z'), now), false)
  assert.equal(canSave(item('ASSIGNMENT', null), now), false)
  assert.equal(canSave(item('MATERIAL', '2026-11-03T14:59:00Z'), now), false)

  assert.equal(
    detailPath(item('ANNOUNCEMENT', null)),
    '/course-notices/12/ANNOUNCEMENT-1',
  )
  assert.equal(detailPath(item('MATERIAL', null)), null)
})
