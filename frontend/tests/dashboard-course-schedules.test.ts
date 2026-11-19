import { strict as assert } from 'node:assert'
import { afterEach, test } from 'node:test'
import {
  getDashboardCourseSchedules,
  upcomingCourseSchedules,
} from '../src/features/dashboard/course-schedules.ts'
import type {
  CourseNotifications,
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
  id: string,
  type: 'ASSIGNMENT' | 'ANNOUNCEMENT' | 'MATERIAL',
  dueAt: string | null,
) {
  return {
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
  }
}

test('dashboard course schedules include only upcoming deadlines across courses', () => {
  const results: CourseNotifications[] = [
    {
      courseId: '1',
      notifications: [
        notification('past', 'ASSIGNMENT', '2026-11-18T10:00:00+09:00'),
        notification('later', 'ASSIGNMENT', '2026-11-22T10:00:00+09:00'),
        notification('material', 'MATERIAL', '2026-11-20T10:00:00+09:00'),
      ],
      errors: [],
      truncated: false,
    },
    {
      courseId: '2',
      notifications: [
        notification('soon', 'ANNOUNCEMENT', '2026-11-20T10:00:00+09:00'),
        notification('undated', 'ANNOUNCEMENT', null),
      ],
      errors: [],
      truncated: false,
    },
  ]

  assert.deepEqual(
    upcomingCourseSchedules(
      courses,
      results,
      Date.parse('2026-11-19T00:00:00+09:00'),
    ).map(({ id, courseName }) => [id, courseName]),
    [
      ['2:soon', '자료구조'],
      ['1:later', 'AI 개론'],
    ],
  )
})

test('dashboard keeps available deadlines when one course feed fails', async () => {
  const requested: string[] = []
  globalThis.fetch = (async (url: string) => {
    requested.push(url)
    if (url === '/api/v1/courses')
      return new Response(JSON.stringify({ courses, truncated: false }))
    if (url.includes('/courses/1/'))
      return new Response(JSON.stringify({ code: 'LMS_UNAVAILABLE' }), {
        status: 503,
      })
    return new Response(
      JSON.stringify({
        courseId: '2',
        notifications: url.endsWith('?type=ASSIGNMENT')
          ? [notification('soon', 'ASSIGNMENT', '2099-11-20T10:00:00+09:00')]
          : [],
        errors: [],
        truncated: false,
      }),
    )
  }) as typeof fetch

  const result = await getDashboardCourseSchedules(3)
  assert.deepEqual(
    result.map(({ id }) => id),
    ['2:soon'],
  )
  assert.ok(requested.some((url) => url.endsWith('?type=ASSIGNMENT')))
  assert.ok(requested.some((url) => url.endsWith('?type=ANNOUNCEMENT')))
})

test('a partial outage without deadlines is not reported as an empty schedule', async () => {
  globalThis.fetch = (async (url: string) => {
    if (url === '/api/v1/courses')
      return new Response(
        JSON.stringify({ courses: courses.slice(0, 1), truncated: false }),
      )
    if (url.endsWith('?type=ASSIGNMENT'))
      return new Response(JSON.stringify({ code: 'LMS_UNAVAILABLE' }), {
        status: 503,
      })
    return new Response(
      JSON.stringify({
        courseId: '1',
        notifications: [],
        errors: [],
        truncated: false,
      }),
    )
  }) as typeof fetch

  await assert.rejects(getDashboardCourseSchedules(3))
})
