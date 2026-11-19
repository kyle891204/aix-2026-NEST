import {
  getCourseOverview,
  type CourseNotification,
  type CourseSummary,
} from '../courses/api.ts'

export interface DashboardCourseSchedule {
  id: string
  courseId: string
  notificationId: string
  courseName: string
  title: string
  dueAt: string
}

// 과제와 본문에서 마감이 확인된 과목 공지만 일정으로 보여준다.
export function upcomingCourseSchedules(
  courses: CourseSummary[],
  notifications: CourseNotification[],
  now = Date.now(),
): DashboardCourseSchedule[] {
  const names = new Map(
    courses.map((course) => [course.courseId, course.courseName]),
  )
  return notifications
    .filter((item) => {
      const due = item.dueAt ? Date.parse(item.dueAt) : NaN
      return item.type !== 'MATERIAL' && Number.isFinite(due) && due >= now
    })
    .map((item) => ({
      id: `${item.courseId}:${item.id}`,
      courseId: item.courseId,
      notificationId: item.id,
      courseName: names.get(item.courseId) ?? '',
      title: item.title,
      dueAt: item.dueAt!,
    }))
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))
}

export async function getDashboardCourseSchedules(limit: number) {
  const overview = await getCourseOverview()
  const schedules = upcomingCourseSchedules(
    overview.courses,
    overview.notifications,
  )
  // 일부 과목 조회가 실패했고 표시할 일정도 없다면 빈 목록이라고 단정하지 않는다.
  if (overview.errors.length > 0 && schedules.length === 0)
    throw new Error('과목일정을 불러오지 못했어요.')
  return schedules.slice(0, limit)
}
