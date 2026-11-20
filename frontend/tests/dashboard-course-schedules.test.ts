import { strict as assert } from 'node:assert'
import { afterEach, test } from 'node:test'
import {
  getDashboardCourseSchedules,
  upcomingCourseSchedules,
} from '../src/features/dashboard/course-schedules.ts'
import type {
  CourseNotification,
  CourseOverview,
  CourseSummary,
} from '../src/features/courses/api.ts'

const courses: CourseSummary[] = [
  { courseId: '1', courseName: 'AI 개론', courseCode: null, termName: null },
  { courseId: '2', courseName: '자료구조', courseCode: null, termName: null },
]
const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

function notification(
  courseId: string,
  id: string,
  type: CourseNotification['type'],
  dueAt: string | null,
): CourseNotification {
  return {
    courseId,
    id,
    type,
    title: id,
    publishedAt: null,
    dueAt,
    lockAt: null,
    materialType: null,
    moduleName: null,
    sourceUrl: null,
    savedScheduleId: null,
    content: null,
  }
}

function overview(
  notifications: CourseNotification[],
  errors: CourseOverview['errors'] = [],
): CourseOverview {
  return { courses, notifications, errors, truncated: false }
}

test('dashboard course schedules include only upcoming assignment deadlines', () => {
  const data = overview([
    notification('1', 'past', 'ASSIGNMENT', '2026-11-18T10:00:00+09:00'),
    notification('1', 'later', 'ASSIGNMENT', '2026-11-22T10:00:00+09:00'),
    notification('1', 'material', 'MATERIAL', '2026-11-20T10:00:00+09:00'),
    notification('2', 'soon', 'ANNOUNCEMENT', '2026-11-20T10:00:00+09:00'),
    notification('2', 'undated', 'ANNOUNCEMENT', null),
  ])

  assert.deepEqual(
    upcomingCourseSchedules(
      data.courses,
      data.notifications,
      Date.parse('2026-11-19T00:00:00+09:00'),
    ).map(({ id, courseName, notificationId }) => [
      id,
      courseName,
      notificationId,
    ]),
    [['1:later', 'AI 개론', 'later']],
  )
})

test('dashboard uses the new course overview and keeps available deadlines after partial errors', async () => {
  const requested: string[] = []
  globalThis.fetch = (async (url: string) => {
    requested.push(url)
    return new Response(
      JSON.stringify(
        overview(
          [
            notification(
              '2',
              'soon',
              'ASSIGNMENT',
              '2099-11-20T10:00:00+09:00',
            ),
          ],
          [{ courseId: '1', type: 'ASSIGNMENT', code: 'LMS_UNAVAILABLE' }],
        ),
      ),
    )
  }) as typeof fetch

  assert.deepEqual(
    (await getDashboardCourseSchedules(3)).map(({ id }) => id),
    ['2:soon'],
  )
  assert.deepEqual(requested, ['/api/v1/courses/notifications'])
})

test('a partial outage without deadlines is not reported as an empty schedule', async () => {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify(
        overview(
          [],
          [{ courseId: '1', type: 'ASSIGNMENT', code: 'LMS_UNAVAILABLE' }],
        ),
      ),
    )) as typeof fetch

  await assert.rejects(getDashboardCourseSchedules(3))
})

test('announcement errors do not affect the assignment deadline filter', async () => {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify(
        overview(
          [],
          [{ courseId: '1', type: 'ANNOUNCEMENT', code: 'LMS_UNAVAILABLE' }],
        ),
      ),
    )) as typeof fetch

  assert.deepEqual(await getDashboardCourseSchedules(3), [])
})
