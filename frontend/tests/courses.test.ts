import { strict as assert } from 'node:assert'
import { afterEach, test } from 'node:test'
import {
  getCourseNotifications,
  getCourses,
  setCourseDemoPassword,
} from '../src/features/courses/api.ts'
import {
  isPastDue,
  kstLabel,
  materialLabel,
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
        id: 'assignment-22',
        type: 'ASSIGNMENT',
        title: '9주차 과제',
        dueAt: '2026-11-03T14:59:00Z',
      },
    ],
    errors: [{ type: 'MATERIAL', code: 'LMS_CONNECTION_FAILED' }],
  })
  const result = await getCourseNotifications('12')
  assert.equal(requestedUrl, '/api/v1/courses/12/notifications')
  assert.equal(result.notifications[0].type, 'ASSIGNMENT')
  assert.deepEqual(result.errors, [
    { type: 'MATERIAL', code: 'LMS_CONNECTION_FAILED' },
  ])

  mockFetch({
    courseId: '12',
    notifications: [{ id: 'quiz-1', type: 'QUIZ', title: '퀴즈' }],
    errors: [],
  })
  await assert.rejects(getCourseNotifications('12'), /과목알림 응답/)
})
