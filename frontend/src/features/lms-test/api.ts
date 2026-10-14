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
