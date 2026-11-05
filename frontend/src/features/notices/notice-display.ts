const SOURCE_LABELS: Record<string, string> = {
  UNIVERSITY: '학교',
  INTERNATIONAL: '국제처',
  COLLEGE: '단과대',
}

const MATCH_LABELS: Record<string, string> = {
  APPLICABLE: '해당',
  NEEDS_REVIEW: '확인 필요',
}

export function sourceLabel(source: string) {
  return SOURCE_LABELS[source] ?? source
}

export function matchLabel(status: string) {
  return MATCH_LABELS[status] ?? null
}

// 원본 시간대와 무관하게 한국 시간으로 표시한다. 형식을 읽을 수 없으면 원본을 보여준다.
export function formatDeadline(deadline: string | null) {
  if (!deadline) return null
  const date = new Date(deadline)
  if (Number.isNaN(date.getTime())) return deadline
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  )
  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute} · KST`
}

export function needsTranslation(language: string, originalLanguage: string) {
  return language !== originalLanguage
}
