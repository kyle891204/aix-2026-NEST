import type { CourseNotification, NotificationType } from './api.ts'

export const TYPE_LABELS: Record<NotificationType, string> = {
  ANNOUNCEMENT: '공지',
  ASSIGNMENT: '과제',
  MATERIAL: '자료',
}

const MATERIAL_LABELS: Record<string, string> = {
  File: '파일',
  Page: '페이지',
  ExternalUrl: '링크',
  ExternalTool: '외부 도구',
}

export function materialLabel(materialType: string | null) {
  if (!materialType) return null
  return MATERIAL_LABELS[materialType] ?? materialType
}

// 한국 시간 표시는 대시보드와 같은 공용 함수를 쓴다.
export { kstLabel } from '../../shared/format/kst.ts'

// javascript: 같은 주소가 링크로 실행되지 않도록 http·https만 허용한다. LMS 테스트 화면의 OriginalLink와 같은 기준이다.
export function safeLinkUrl(url: string | null) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return ['https:', 'http:'].includes(parsed.protocol) ? url : null
  } catch {
    return null
  }
}

export function isPastDue(dueAt: string | null, now = Date.now()) {
  if (!dueAt) return false
  const time = Date.parse(dueAt)
  return !Number.isNaN(time) && time < now
}

// 과제는 LMS 마감일, 공지는 서버가 본문의 "까지·마감" 문구에서 찾은 마감일을 쓴다. 학습자료는 마감이 없다.
export function hasDeadlineField(item: { type: NotificationType }) {
  return item.type === 'ANNOUNCEMENT' || item.type === 'ASSIGNMENT'
}

// 마감이 지나지 않은 과제·공지를 개인 일정에 저장할 수 있다.
export function canSave(
  item: { type: NotificationType; dueAt: string | null },
  now = Date.now(),
) {
  return hasDeadlineField(item) && !!item.dueAt && !isPastDue(item.dueAt, now)
}

export function scheduleSource(item: { type: NotificationType }) {
  return item.type === 'ANNOUNCEMENT'
    ? ('COURSE_ANNOUNCEMENT' as const)
    : ('COURSE_ASSIGNMENT' as const)
}

// 공지·과제는 앱의 상세(S09-N·S09-T)로, 학습자료는 상세가 없어 LMS 원문으로 연다.
export function detailPath(item: {
  courseId: string
  id: string
  type: NotificationType
}) {
  return hasDeadlineField(item)
    ? `/course-notices/${encodeURIComponent(item.courseId)}/${encodeURIComponent(item.id)}`
    : null
}

// 상세 화면이 목록을 다시 불러오지 않고 바로 보이도록 목록에서 항목과 과목 이름을 넘긴다.
export interface CourseItemState {
  item: CourseNotification
  courseName: string | null
}
