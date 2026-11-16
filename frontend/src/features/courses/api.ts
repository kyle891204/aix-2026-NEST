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
  courseId: string
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
  // 공지 본문·과제 설명을 줄바꿈만 살린 글. 학습자료와 본문이 없는 항목은 null이다.
  content: string | null
}

export interface NotificationError {
  type: NotificationType
  code: string
}

export interface CourseError {
  courseId: string
  type: NotificationType
  code: string
}

// S08 전체 과목 화면. 모든 과목의 공지와 마감 전 과제를 마감 임박순 → 최근 게시순으로 받는다.
export interface CourseOverview {
  courses: CourseSummary[]
  notifications: CourseNotification[]
  errors: CourseError[]
  truncated: boolean
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
    typeof value.courseId === 'string' &&
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

// 과목별 응답은 한 과목 것이라, 알림에 과목 ID·본문이 없는 이전 서버 응답이어도 응답의 과목 ID로 채워 쓴다.
// 화면과 서버가 따로 배포되는 동안 과목별 화면이 오류로 막히지 않게 한다.
function withCourseIds(value: unknown) {
  if (
    !isRecord(value) ||
    typeof value.courseId !== 'string' ||
    !Array.isArray(value.notifications)
  )
    return value
  const courseId = value.courseId
  return {
    ...value,
    notifications: value.notifications.map((item: unknown) =>
      isRecord(item)
        ? {
            content: null,
            ...item,
            courseId:
              typeof item.courseId === 'string' ? item.courseId : courseId,
          }
        : item,
    ),
  }
}

export async function getCourseNotifications(
  courseId: string,
): Promise<CourseNotifications> {
  const value = withCourseIds(
    await requestCourses(
      `/courses/${encodeURIComponent(courseId)}/notifications`,
    ),
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

export async function getCourseOverview(): Promise<CourseOverview> {
  const value = await requestCourses('/courses/notifications')
  if (
    !isRecord(value) ||
    !Array.isArray(value.courses) ||
    !value.courses.every(isCourse) ||
    !Array.isArray(value.notifications) ||
    !value.notifications.every(isNotification) ||
    !Array.isArray(value.errors) ||
    !value.errors.every(
      (error) =>
        isRecord(error) &&
        typeof error.courseId === 'string' &&
        isNotificationError(error),
    ) ||
    typeof value.truncated !== 'boolean'
  )
    throw new Error('과목알림 응답 형식이 올바르지 않습니다.')
  return value as unknown as CourseOverview
}
