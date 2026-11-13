import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { deadlineLabel } from '../src/features/schedule/academic-format.ts'
import {
  addAcademicSchedule,
  addDeadlineSchedules,
  changePersonalSchedules,
  isAcademicSaved,
  isSaved,
  loadPersonalSchedules,
  removeSchedule,
  savePersonalSchedules,
  type DeadlineItem,
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

test('saving in two tabs keeps both schedules', () => {
  const storage = memoryStorage()
  const second = { ...event, scheduleId: 'academic-2', title: '종강' }
  // 두 탭이 같은 빈 목록을 연 뒤 각각 저장한다.
  const tab1 = loadPersonalSchedules(storage, 'student')
  const tab2 = loadPersonalSchedules(storage, 'student')
  changePersonalSchedules(storage, 'student', (current) =>
    addAcademicSchedule(current, event, SOURCE),
  )
  const { current, next } = changePersonalSchedules(
    storage,
    'student',
    (latest) => addAcademicSchedule(latest, second, SOURCE),
  )
  assert.deepEqual([tab1, tab2], [[], []])
  assert.equal(current.length, 1)
  assert.deepEqual(
    next.map((item) => item.sourceId),
    ['academic-1', 'academic-2'],
  )
  assert.equal(loadPersonalSchedules(storage, 'student').length, 2)
})

test('deleting in one tab does not bring back a schedule removed in another', () => {
  const storage = memoryStorage()
  const saved = changePersonalSchedules(storage, 'student', (current) =>
    addAcademicSchedule(current, event, SOURCE),
  ).next
  changePersonalSchedules(storage, 'student', (current) =>
    removeSchedule(current, saved[0].id),
  )
  // 다른 탭이 예전 목록으로 저장해도 지운 일정이 되살아나지 않는다.
  const { next } = changePersonalSchedules(storage, 'student', (current) =>
    removeSchedule(current, 'academic:none'),
  )
  assert.deepEqual(next, [])
})

const assignment: DeadlineItem = {
  sourceType: 'COURSE_ASSIGNMENT',
  sourceId: 'assignment-7',
  title: '프로젝트 제안서 제출',
  // UTC 15시는 한국 시간으로 다음 날 0시다. 날짜는 한국 날짜로 저장한다.
  dueAt: '2026-10-26T15:00:00Z',
  sourceUrl: 'https://learning.example/assignments/7',
}
const notice: DeadlineItem = {
  sourceType: 'NOTICE',
  sourceId: 'erica-global-258',
  title: '단기파견 모집',
  dueAt: '2026-11-08T23:59:00+09:00',
  sourceUrl: null,
}

test('notices and assignments are saved once with their deadline time', () => {
  const once = addDeadlineSchedules([], [assignment, notice, assignment])
  assert.deepEqual(
    once.map((item) => [item.id, item.startDate, item.endDate]),
    [
      ['course_assignment:assignment-7', '2026-10-27', '2026-10-27'],
      ['notice:erica-global-258', '2026-11-08', '2026-11-08'],
    ],
  )
  assert.equal(once[1].sourceUrl, '')
  assert.ok(isSaved(once, 'NOTICE', 'erica-global-258'))
  assert.equal(isSaved(once, 'COURSE_ASSIGNMENT', 'erica-global-258'), false)
  assert.equal(addDeadlineSchedules(once, [notice]), once)
})

test('items without a readable deadline are not saved', () => {
  assert.deepEqual(
    addDeadlineSchedules([], [{ ...assignment, dueAt: '마감 미정' }]),
    [],
  )
})

test('saved notices and assignments are read back with academic schedules', () => {
  const storage = memoryStorage()
  const saved = addDeadlineSchedules(addAcademicSchedule([], event, SOURCE), [
    assignment,
  ])
  savePersonalSchedules(storage, 'a', saved)
  assert.deepEqual(
    loadPersonalSchedules(storage, 'a').map((item) => item.sourceType),
    ['COURSE_ASSIGNMENT', 'ACADEMIC'],
  )

  // 마감 일시가 없는 과제나 마감 일시가 붙은 학사일정은 손상된 값으로 보고 뺀다.
  storage.items.set(
    'nest:personal-schedules:v1:a',
    JSON.stringify([
      { ...saved[0], dueAt: undefined },
      { ...saved[1], dueAt: '2026-11-12T00:00:00Z' },
    ]),
  )
  assert.deepEqual(loadPersonalSchedules(storage, 'a'), [])
})

test('deadline cards show the Korean date and time', () => {
  assert.equal(deadlineLabel('2026-10-27T14:59:00Z'), '2026.10.27 23:59 · KST')
  assert.equal(
    deadlineLabel('2026-11-08T23:59:00+09:00'),
    '2026.11.08 23:59 · KST',
  )
})
