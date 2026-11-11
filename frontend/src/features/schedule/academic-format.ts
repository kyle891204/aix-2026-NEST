interface DateRange {
  startDate: string
  endDate: string
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const KST_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// 학사일정은 한국 날짜 기준이므로 사용자 기기의 시간대와 상관없이 오늘을 KST로 계산한다.
export function kstToday(now: Date = new Date()) {
  return KST_DATE.format(now)
}

const DAY_MS = 86_400_000
const KST_OFFSET_MS = 9 * 3_600_000

// 다음 KST 자정까지 남은 시간. 화면을 켜 둔 채 날짜가 바뀌면 오늘을 다시 계산하는 데 쓴다.
export function msUntilKstMidnight(now: number = Date.now()) {
  return DAY_MS - ((now + KST_OFFSET_MS) % DAY_MS)
}

// 학사일정은 학년도(3월~다음 해 2월) 단위로 나온다. 지난 일정도 볼 수 있게 학년도 전체를 조회한다.
export function academicYearRange(today: string) {
  const year = Number(today.slice(0, 4))
  const startYear = Number(today.slice(5, 7)) < 3 ? year - 1 : year
  // 3월 0일은 2월의 마지막 날이다. 윤년도 이렇게 계산한다.
  const lastDay = new Date(Date.UTC(startYear + 1, 2, 0)).getUTCDate()
  return { from: `${startYear}-03-01`, to: `${startYear + 1}-02-${lastDay}` }
}

// 이번 달 1일부터 학년도 끝까지 조회한다. 지난달의 일정은 보여주지 않는다.
export function upcomingRange(today: string) {
  return { from: `${today.slice(0, 7)}-01`, to: academicYearRange(today).to }
}

// 오늘이 들어 있는 주의 일요일부터 토요일까지.
export function weekDays(today: string) {
  const [year, month, day] = today.split('-').map(Number)
  const sunday = day - new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return WEEKDAYS.map((weekday, index) => {
    const date = new Date(Date.UTC(year, month - 1, sunday + index))
    return {
      date: date.toISOString().slice(0, 10),
      day: date.getUTCDate(),
      weekday,
    }
  })
}

function dateLabel(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
  return `${month}/${day}(${weekday})`
}

export function dateRangeLabel(event: DateRange) {
  const start = dateLabel(event.startDate)
  return event.startDate === event.endDate
    ? start
    : `${start} ~ ${dateLabel(event.endDate)}`
}

// 개인 저장 카드용. 연도를 함께 보여주고, 시간 없는 일정도 한국 날짜 기준임을 표시한다.
export function fullDateRangeLabel(event: DateRange) {
  const start = event.startDate.replaceAll('-', '.')
  const end = event.endDate.replaceAll('-', '.')
  return `${start === end ? start : `${start} ~ ${end}`} · KST`
}

export function eventTiming(event: DateRange, today: string) {
  if (event.endDate < today) return 'past'
  return event.startDate <= today ? 'ongoing' : 'upcoming'
}

// 시작일 순으로 정렬된 목록을 받아 순서를 유지한 채 시작 월별로 묶는다. 여러 달에 걸친 일정은 시작한 달에만 나온다.
// firstMonth를 주면 그 전에 시작해 아직 이어지는 일정을 그 달에 넣는다.
export function groupByStartMonth<T extends DateRange>(
  events: T[],
  firstMonth = '',
) {
  const groups: { month: string; events: T[] }[] = []
  for (const event of events) {
    const start = event.startDate.slice(0, 7)
    const month = start < firstMonth ? firstMonth : start
    const last = groups.at(-1)
    if (last?.month === month) last.events.push(event)
    else groups.push({ month, events: [event] })
  }
  return groups
}

export function monthLabel(month: string) {
  const [year, value] = month.split('-').map(Number)
  return `${year}년 ${value}월`
}
