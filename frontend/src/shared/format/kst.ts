import type { Language } from '../types/language'
import { LANGUAGE_LOCALES } from '../i18n/language.ts'

const KST_PARTS = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

// ISO 8601 일시를 "11/3(화) 23:59" 형태의 한국 시간으로 보여준다. 읽을 수 없으면 원본을 그대로 쓴다.
export function kstLabel(value: string | null, language: Language = 'ko') {
  if (!value) return null
  const time = Date.parse(value)
  if (Number.isNaN(time)) return value
  if (language !== 'ko') {
    return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], {
      timeZone: 'Asia/Seoul',
      month: 'short',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(time)
  }
  const parts = Object.fromEntries(
    KST_PARTS.formatToParts(time).map((part) => [part.type, part.value]),
  )
  return `${parts.month}/${parts.day}(${parts.weekday}) ${parts.hour}:${parts.minute}`
}
