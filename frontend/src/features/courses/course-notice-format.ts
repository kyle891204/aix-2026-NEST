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

const KST_PARTS = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

// LMS의 ISO 8601 값을 "11/3(화) 23:59" 형태의 한국 시간으로 보여준다. 읽을 수 없으면 원본을 그대로 쓴다.
export function kstLabel(value: string | null) {
  if (!value) return null
  const time = Date.parse(value)
  if (Number.isNaN(time)) return value
  const parts = Object.fromEntries(
    KST_PARTS.formatToParts(time).map((part) => [part.type, part.value]),
  )
  return `${parts.month}/${parts.day}(${parts.weekday}) ${parts.hour}:${parts.minute}`
}

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
