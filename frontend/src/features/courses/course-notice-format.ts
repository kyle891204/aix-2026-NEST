import type { NotificationType } from './api.ts'

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
