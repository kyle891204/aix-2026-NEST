import { requestJson } from '../../shared/api/client'

export interface LmsProfile {
  id: number
  name: string
  locale: string | null
}
export interface LmsCourse {
  id: number
  name: string
  course_code: string | null
}
export interface LmsAnnouncement {
  id: number
  title: string
  message: string
  posted_at: string | null
  html_url: string | null
  context_code: string | null
}
export interface LmsCourseDetail extends LmsCourse {
  syllabus_body: string | null
  public_description: string | null
  time_zone: string | null
  workflow_state: string | null
}
export interface LmsAssignment {
  id: number
  name: string
  description: string | null
  course_id: number
  due_at: string | null
  unlock_at: string | null
  lock_at: string | null
  html_url: string | null
  submission_types: string[] | null
  points_possible: number | null
  locked_for_user: boolean | null
}
export interface LmsModule {
  id: number
  name: string
  position: number | null
  items_count: number | null
  state: string | null
}
export interface LmsModuleItem {
  id: number
  title: string
  type: string
  position: number | null
  html_url: string | null
  content_id: number | null
  content_details: {
    due_at: string | null
    unlock_at: string | null
    lock_at: string | null
    locked_for_user: boolean | null
  } | null
}
export interface LmsPage<T> {
  items: T[]
  pagesFetched: number
  truncated: boolean
}

export async function getLmsProfile(): Promise<LmsProfile> {
  return (await requestJson('/dev/lms/profile')) as LmsProfile
}
export async function getLmsCourses(): Promise<LmsPage<LmsCourse>> {
  return (await requestJson('/dev/lms/courses')) as LmsPage<LmsCourse>
}
export async function getLmsCourse(courseId: number): Promise<LmsCourseDetail> {
  return (await requestJson(`/dev/lms/courses/${courseId}`)) as LmsCourseDetail
}
export async function getLmsAssignments(
  courseId: number,
): Promise<LmsPage<LmsAssignment>> {
  return (await requestJson(
    `/dev/lms/courses/${courseId}/assignments`,
  )) as LmsPage<LmsAssignment>
}
export async function getLmsModules(
  courseId: number,
): Promise<LmsPage<LmsModule>> {
  return (await requestJson(
    `/dev/lms/courses/${courseId}/modules`,
  )) as LmsPage<LmsModule>
}
export async function getLmsModuleItems(
  courseId: number,
  moduleId: number,
): Promise<LmsPage<LmsModuleItem>> {
  return (await requestJson(
    `/dev/lms/courses/${courseId}/modules/${moduleId}/items`,
  )) as LmsPage<LmsModuleItem>
}
export async function getLmsAnnouncements(
  courseId: number,
  startDate: string,
  endDate: string,
): Promise<LmsPage<LmsAnnouncement>> {
  const query = new URLSearchParams({
    courseId: String(courseId),
    startDate,
    endDate,
  })
  return (await requestJson(
    `/dev/lms/announcements?${query}`,
  )) as LmsPage<LmsAnnouncement>
}
