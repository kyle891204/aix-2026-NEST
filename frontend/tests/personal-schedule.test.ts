import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  addAcademicSchedule,
  isAcademicSaved,
  loadPersonalSchedules,
  removeSchedule,
  savePersonalSchedules,
} from '../src/features/schedule/personal-schedule-store.ts'

function memoryStorage() {
  const items = new Map<string, string>()
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  }
}

const SOURCE = 'https://example.com/calendar'
const event = {
  scheduleId: 'academic-1',
  title: '수강신청',
  startDate: '2026-11-09',
  endDate: '2026-11-12',
}

test('an academic schedule is copied once with its source', () => {
  const once = addAcademicSchedule([], event, SOURCE)
  assert.equal(once.length, 1)
  assert.equal(once[0].sourceType, 'ACADEMIC')
  assert.equal(once[0].sourceId, 'academic-1')
  assert.equal(once[0].sourceUrl, SOURCE)
  assert.equal(once[0].startDate, '2026-11-09')
  assert.ok(isAcademicSaved(once, 'academic-1'))
  assert.equal(addAcademicSchedule(once, event, SOURCE).length, 1)
})

test('a removed academic schedule can be saved again', () => {
  const saved = addAcademicSchedule([], event, SOURCE)
  const removed = removeSchedule(saved, saved[0].id)
  assert.equal(isAcademicSaved(removed, 'academic-1'), false)
  assert.equal(addAcademicSchedule(removed, event, SOURCE).length, 1)
})

test('schedules stay sorted by date', () => {
  const later = addAcademicSchedule(
    [],
    {
      ...event,
      scheduleId: 'academic-2',
      title: '나중',
      startDate: '2026-12-01',
      endDate: '2026-12-01',
    },
    SOURCE,
  )
  const both = addAcademicSchedule(later, event, SOURCE)
  assert.deepEqual(
    both.map((item) => item.title),
    ['수강신청', '나중'],
  )
})

test('schedules are stored separately per account', () => {
  const storage = memoryStorage()
  savePersonalSchedules(
    storage,
    'student a',
    addAcademicSchedule([], event, SOURCE),
  )
  assert.equal(loadPersonalSchedules(storage, 'student a').length, 1)
  assert.deepEqual(loadPersonalSchedules(storage, 'student-b'), [])
  assert.ok(storage.items.has('nest:personal-schedules:v1:student%20a'))
})

test('damaged storage is read as empty and bad items are left out', () => {
  const storage = memoryStorage()
  const key = 'nest:personal-schedules:v1:a'
  storage.items.set(key, '{not json')
  assert.deepEqual(loadPersonalSchedules(storage, 'a'), [])
  storage.items.set(key, '{"id":"not-a-list"}')
  assert.deepEqual(loadPersonalSchedules(storage, 'a'), [])

  const good = addAcademicSchedule([], event, SOURCE)[0]
  storage.items.set(
    key,
    JSON.stringify([
      good,
      null,
      { ...good, id: 'bad-date', startDate: '2026-13-01' },
      { ...good, id: 'reversed', endDate: '2026-11-01' },
      { ...good, id: 'bad-source', sourceType: 'OTHER' },
    ]),
  )
  assert.deepEqual(
    loadPersonalSchedules(storage, 'a').map((item) => item.id),
    [good.id],
  )
})
