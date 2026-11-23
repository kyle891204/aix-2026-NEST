import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addDays,
  monthGrid,
  monthTitle,
  parseIsoMonth,
  shiftMonth,
  todayIso,
  weekdayNames,
} from '../src/features/immigration/calendar.ts'

test('month title and weekdays follow the selected language', () => {
  const view = { year: 2027, month: 1 }
  assert.equal(monthTitle(view, 'ko-KR'), '2027년 2월')
  assert.equal(monthTitle(view, 'en-US'), 'February 2027')
  assert.equal(monthTitle(view, 'zh-CN'), '2027年2月')
  assert.equal(weekdayNames('ko-KR')[0], '일')
  assert.equal(weekdayNames('en-US')[0], 'Sun')
  assert.equal(weekdayNames('zh-CN')[0], '周日')
})

test('month grid starts on Sunday and only fills the weeks it needs', () => {
  // 2027년 2월 1일은 월요일이고 28일까지 있다.
  const days = monthGrid({ year: 2027, month: 1 })
  assert.equal(days.length, 35)
  assert.deepEqual(days[0], { iso: '2027-01-31', day: 31, inMonth: false })
  assert.deepEqual(days[1], { iso: '2027-02-01', day: 1, inMonth: true })
  assert.equal(days.filter((day) => day.inMonth).length, 28)
  assert.equal(days.at(-1)!.iso, '2027-03-06')
})

test('month moves across years and bad dates are ignored', () => {
  assert.deepEqual(shiftMonth({ year: 2026, month: 11 }, 1), {
    year: 2027,
    month: 0,
  })
  assert.deepEqual(shiftMonth({ year: 2027, month: 0 }, -1), {
    year: 2026,
    month: 11,
  })
  assert.deepEqual(parseIsoMonth('2027-02-20'), { year: 2027, month: 1 })
  assert.equal(parseIsoMonth(''), null)
  assert.equal(parseIsoMonth('2027-13-01'), null)
  assert.equal(todayIso(new Date(2027, 1, 5)), '2027-02-05')
})

test('arrow moves cross month and year ends', () => {
  assert.equal(addDays('2026-11-30', 1), '2026-12-01')
  assert.equal(addDays('2026-11-01', -1), '2026-10-31')
  assert.equal(addDays('2026-11-24', 7), '2026-12-01')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(addDays('2028-02-28', 1), '2028-02-29')
})
