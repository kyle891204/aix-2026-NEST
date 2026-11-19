import {
  getCourseNotifications,
  getCourses,
  type CourseNotifications,
  type CourseSummary,
} from '../courses/api.ts'

export interface DashboardCourseSchedule {
  id: string
  courseId: string
  courseName: string
  title: string
  dueAt: string
}

// 과제와 본문에서 마감이 확인된 과목 공지만 일정으로 보여준다.
export function upcomingCourseSchedules(
  courses: CourseSummary[],
  results: CourseNotifications[],
  now = Date.now(),
): DashboardCourseSchedule[] {
  const names = new Map(
    courses.map((course) => [course.courseId, course.courseName]),
  )
  return results
    .flatMap((result) =>
      result.notifications
        .filter((item) => {
          const due = item.dueAt ? Date.parse(item.dueAt) : NaN
          return item.type !== 'MATERIAL' && Number.isFinite(due) && due >= now
        })
        .map((item) => ({
          id: `${result.courseId}:${item.id}`,
          courseId: result.courseId,
          courseName: names.get(result.courseId) ?? '',
          title: item.title,
          dueAt: item.dueAt!,
        })),
    )
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))
}

export async function getDashboardCourseSchedules(limit: number) {
  const { courses } = await getCourses()
  if (courses.length === 0) return []
  const results = await Promise.allSettled(
    courses.flatMap((course) => [
      getCourseNotifications(course.courseId, 'ASSIGNMENT'),
      getCourseNotifications(course.courseId, 'ANNOUNCEMENT'),
    ]),
  )
  const available = results
    .filter(
      (result): result is PromiseFulfilledResult<CourseNotifications> =>
        result.status === 'fulfilled',
    )
    .map((result) => result.value)
  const schedules = upcomingCourseSchedules(courses, available)
  // 일부 조회가 실패했고 표시할 일정도 없다면 빈 목록이라고 단정하지 않는다.
  if (available.length < results.length && schedules.length === 0) {
    const failure = results.find((result) => result.status === 'rejected')
    throw failure?.reason ?? new Error('과목일정을 불러오지 못했어요.')
  }
  return schedules.slice(0, limit)
}
