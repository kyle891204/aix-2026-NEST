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

const UNKNOWN_DATE = '날짜 알 수 없음 · 본문에서 확인'

// 게시판에서 게시일을 읽지 못한 공지는 날짜를 비우지 않고 본문 확인을 안내한다.
export function postedLabel(postedAt: string | null) {
  return postedAt ? postedAt.replaceAll('-', '.') : UNKNOWN_DATE
}

// 목록에는 마감일을 먼저 보여주고, 없으면 게시일을 보여준다.
export function dateLine(deadline: string | null, postedAt: string | null) {
  return (
    formatDeadline(deadline) ??
    (postedAt ? `게시 ${postedLabel(postedAt)}` : UNKNOWN_DATE)
  )
}

export function needsTranslation(language: string, originalLanguage: string) {
  return language !== originalLanguage
}
