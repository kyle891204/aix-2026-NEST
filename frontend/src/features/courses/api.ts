import { requestJson } from '../../shared/api/client.ts'

export type NotificationType = 'ANNOUNCEMENT' | 'ASSIGNMENT' | 'MATERIAL'

export interface CourseSummary {
  courseId: string
  courseName: string
  courseCode: string | null
  termName: string | null
}

export interface CourseList {
  courses: CourseSummary[]
  truncated: boolean
}

export interface CourseNotification {
  id: string
  type: NotificationType
  title: string
  publishedAt: string | null
  dueAt: string | null
  lockAt: string | null
  materialType: string | null
  moduleName: string | null
  sourceUrl: string | null
  savedScheduleId: string | null
}

export interface NotificationError {
  type: NotificationType
  code: string
}

export interface CourseNotifications {
  courseId: string
  notifications: CourseNotification[]
  errors: NotificationError[]
  truncated: boolean
}

const TYPES: readonly string[] = ['ANNOUNCEMENT', 'ASSIGNMENT', 'MATERIAL']

// 배포 서버는 공통 LMS 계정 데이터를 데모 암호로 보호한다. Canvas 토큰이 아니며 새로고침 전까지 메모리에만 둔다.
let demoPassword = ''

export function setCourseDemoPassword(value: string) {
  demoPassword = value
}

function requestCourses(path: string) {
  return requestJson(path, {
    headers: demoPassword ? { 'X-LMS-Demo-Password': demoPassword } : {},
    cache: 'no-store',
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCourse(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.courseId === 'string' &&
    typeof value.courseName === 'string'
  )
}

function isNotification(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.type === 'string' &&
    TYPES.includes(value.type) &&
    typeof value.title === 'string'
  )
}

function isNotificationError(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.type === 'string' &&
    TYPES.includes(value.type) &&
    typeof value.code === 'string'
  )
}

export async function getCourses(): Promise<CourseList> {
  const value = await requestCourses('/courses')
  if (
    !isRecord(value) ||
    typeof value.truncated !== 'boolean' ||
    !Array.isArray(value.courses) ||
    !value.courses.every(isCourse)
  )
    throw new Error('과목 목록 응답 형식이 올바르지 않습니다.')
  return value as unknown as CourseList
}

export async function getCourseNotifications(
  courseId: string,
): Promise<CourseNotifications> {
  const value = await requestCourses(
    `/courses/${encodeURIComponent(courseId)}/notifications`,
  )
  if (
    !isRecord(value) ||
    typeof value.courseId !== 'string' ||
    !Array.isArray(value.notifications) ||
    !value.notifications.every(isNotification) ||
    !Array.isArray(value.errors) ||
    !value.errors.every(isNotificationError) ||
    typeof value.truncated !== 'boolean'
  )
    throw new Error('과목알림 응답 형식이 올바르지 않습니다.')
  return value as unknown as CourseNotifications
}
