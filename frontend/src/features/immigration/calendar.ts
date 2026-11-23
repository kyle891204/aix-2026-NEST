// 입출국 준비 날짜 선택 달력의 계산. 브라우저 시간대와 상관없이 같은 날짜가 나오도록 UTC 기준으로 다룬다.

const DAY_MS = 24 * 60 * 60 * 1000

export interface CalendarMonth {
  year: number
  /** 0이 1월이다. */
  month: number
}

export interface CalendarDay {
  iso: string
  day: number
  inMonth: boolean
}

export function parseIsoMonth(iso: string): CalendarMonth | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  const month = Number(match[2]) - 1
  if (month < 0 || month > 11) return null
  return { year: Number(match[1]), month }
}

export function shiftMonth(
  { year, month }: CalendarMonth,
  delta: number,
): CalendarMonth {
  const date = new Date(Date.UTC(year, month + delta, 1))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() }
}

/** 일요일부터 시작하는 주 단위 칸. 앞뒤 달 날짜로 빈 칸을 채우고, 필요한 주만큼만 만든다. */
export function monthGrid({ year, month }: CalendarMonth): CalendarDay[] {
  const first = new Date(Date.UTC(year, month, 1))
  const offset = first.getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const cells = Math.ceil((offset + daysInMonth) / 7) * 7
  const start = first.getTime() - offset * DAY_MS
  return Array.from({ length: cells }, (_, index) => {
    const date = new Date(start + index * DAY_MS)
    return {
      iso: date.toISOString().slice(0, 10),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month,
    }
  })
}

export function monthTitle({ year, month }: CalendarMonth, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month, 1)))
}

/** 일요일부터 토요일까지의 짧은 요일 이름. 2023-01-01은 일요일이다. */
export function weekdayNames(locale: string) {
  const format = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    timeZone: 'UTC',
  })
  return Array.from({ length: 7 }, (_, index) =>
    format.format(new Date(Date.UTC(2023, 0, 1 + index))),
  )
}

export function fullDateLabel(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'full',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`))
}

/** 사용자가 있는 곳의 오늘 날짜. */
export function todayIso(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
