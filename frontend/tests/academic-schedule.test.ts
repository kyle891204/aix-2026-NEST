import { strict as assert } from 'node:assert'
import { afterEach, test } from 'node:test'
import { getAcademicSchedules } from '../src/features/schedule/api.ts'
import {
  academicYearRange,
  dateRangeLabel,
  eventTiming,
  fullDateRangeLabel,
  groupByStartMonth,
  kstToday,
  monthLabel,
  msUntilKstMidnight,
  upcomingRange,
  weekDays,
} from '../src/features/schedule/academic-format.ts'

const originalFetch = globalThis.fetch
let sentUrl: string | null = null

function mockFetch(body: unknown) {
  globalThis.fetch = (async (url: string) => {
    sentUrl = url
    return new Response(JSON.stringify(body), { status: 200 })
  }) as typeof fetch
}

afterEach(() => {
  globalThis.fetch = originalFetch
  sentUrl = null
})

function event(id: string, startDate: string, endDate = startDate) {
  return { scheduleId: id, title: `일정 ${id}`, startDate, endDate }
}

test('the whole academic year is requested', async () => {
  const { from, to } = academicYearRange('2026-11-04')
  assert.equal(from, '2026-03-01')
  assert.equal(to, '2027-02-28')

  mockFetch({
    sourceUrl: 'https://example.com',
    checkedAt: null,
    schedules: [],
  })
  const result = await getAcademicSchedules(from, to)
  assert.equal(
    sentUrl,
    '/api/v1/schedules/academic?from=2026-03-01&to=2027-02-28',
  )
  assert.deepEqual(result.schedules, [])
})

test('January and February belong to the previous academic year', () => {
  assert.deepEqual(academicYearRange('2027-02-28'), {
    from: '2026-03-01',
    to: '2027-02-28',
  })
  assert.equal(academicYearRange('2027-03-01').from, '2027-03-01')
  // 2028년은 윤년이다.
  assert.equal(academicYearRange('2027-03-01').to, '2028-02-29')
})

test('the screen starts from the current month until the academic year ends', () => {
  assert.deepEqual(upcomingRange('2026-11-04'), {
    from: '2026-11-01',
    to: '2027-02-28',
  })
  assert.deepEqual(upcomingRange('2027-01-15'), {
    from: '2027-01-01',
    to: '2027-02-28',
  })
})

test('the week runs from Sunday to Saturday across month boundaries', () => {
  const days = weekDays('2026-11-04')
  assert.deepEqual(
    days.map((item) => `${item.day} ${item.weekday}`),
    ['1 일', '2 월', '3 화', '4 수', '5 목', '6 금', '7 토'],
  )
  const crossing = weekDays('2026-12-30')
  assert.equal(crossing[0].date, '2026-12-27')
  assert.equal(crossing[6].date, '2027-01-02')
})

test('malformed responses are rejected', async () => {
  mockFetch({
    sourceUrl: 'https://example.com',
    schedules: [{ title: '개강' }],
  })
  await assert.rejects(getAcademicSchedules('2026-01-01', '2026-12-31'))
})

test('today follows Korean time regardless of the device time zone', () => {
  // UTC 15시는 한국의 다음 날 0시다.
  assert.equal(kstToday(new Date('2026-12-31T15:00:00Z')), '2027-01-01')
  assert.equal(kstToday(new Date('2026-12-31T14:59:00Z')), '2026-12-31')
})

test('date labels show the weekday without time zone shifts', () => {
  assert.equal(dateRangeLabel(event('a', '2026-11-04')), '11/4(수)')
  assert.equal(
    dateRangeLabel(event('a', '2026-12-23', '2027-02-28')),
    '12/23(수) ~ 2/28(일)',
  )
})

test('saved cards show full dates in Korean time', () => {
  assert.equal(fullDateRangeLabel(event('a', '2026-11-20')), '2026.11.20 · KST')
  assert.equal(
    fullDateRangeLabel(event('a', '2026-12-23', '2027-02-28')),
    '2026.12.23 ~ 2027.02.28 · KST',
  )
})

test('timing includes the first and last day as ongoing', () => {
  const range = event('a', '2026-11-02', '2026-11-06')
  assert.equal(eventTiming(range, '2026-11-01'), 'upcoming')
  assert.equal(eventTiming(range, '2026-11-02'), 'ongoing')
  assert.equal(eventTiming(range, '2026-11-06'), 'ongoing')
  assert.equal(eventTiming(range, '2026-11-07'), 'past')
})

test('events are grouped by start month keeping their order', () => {
  const groups = groupByStartMonth([
    event('a', '2026-09-01'),
    event('b', '2026-09-20', '2026-10-05'),
    event('c', '2026-10-01'),
  ])
  assert.deepEqual(
    groups.map((group) => [
      group.month,
      group.events.map((item) => item.scheduleId),
    ]),
    [
      ['2026-09', ['a', 'b']],
      ['2026-10', ['c']],
    ],
  )
  assert.equal(monthLabel('2026-09'), '2026년 9월')
})

test('events that began earlier are shown in the first month', () => {
  const groups = groupByStartMonth(
    [
      event('winter-break', '2026-12-23', '2027-02-28'),
      event('a', '2027-01-04'),
    ],
    '2027-01',
  )
  assert.deepEqual(
    groups.map((group) => [
      group.month,
      group.events.map((item) => item.scheduleId),
    ]),
    [['2027-01', ['winter-break', 'a']]],
  )
})

test('the next Korean midnight is counted in Korean time', () => {
  // 2026-11-05 23:59:00 KST
  assert.equal(msUntilKstMidnight(Date.parse('2026-11-05T14:59:00Z')), 60_000)
  // KST 자정 정각이면 다음 날 자정까지 하루가 남는다.
  assert.equal(
    msUntilKstMidnight(Date.parse('2026-11-05T15:00:00Z')),
    86_400_000,
  )
  assert.equal(kstToday(new Date('2026-11-05T15:00:00Z')), '2026-11-06')
})
