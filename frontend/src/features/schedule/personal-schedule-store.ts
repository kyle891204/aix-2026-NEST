import { kstToday } from './academic-format.ts'
import type { AcademicEvent } from './api.ts'

// 학사일정, 전체공지(S07), 과목 공지·과제(S09)를 저장한다.
export type PersonalSource =
  'ACADEMIC' | 'NOTICE' | 'COURSE_ANNOUNCEMENT' | 'COURSE_ASSIGNMENT'
export type DeadlineSource = Exclude<PersonalSource, 'ACADEMIC'>

const SOURCES: readonly string[] = [
  'ACADEMIC',
  'NOTICE',
  'COURSE_ANNOUNCEMENT',
  'COURSE_ASSIGNMENT',
]

export interface PersonalSchedule {
  id: string
  title: string
  startDate: string
  endDate: string
  sourceType: PersonalSource
  // 학사일정의 scheduleId, 공지의 noticeId, 과제의 알림 ID. 같은 항목을 두 번 저장하지 않는 기준이다.
  sourceId: string
  sourceUrl: string
  // 공지·과제의 마감 일시(시간대가 붙은 ISO 8601). 날짜는 마감일의 한국 날짜다. 학사일정에는 없다.
  dueAt?: string
}

// 공지·과제처럼 마감 일시가 있는 항목. 마감이 없는 항목은 저장하지 않는다.
export interface DeadlineItem {
  sourceType: DeadlineSource
  sourceId: string
  title: string
  dueAt: string
  sourceUrl: string | null
}

type ScheduleStorage = Pick<Storage, 'getItem' | 'setItem'>

export type PersonalChange = (current: PersonalSchedule[]) => PersonalSchedule[]

export function storageKey(accountId: string) {
  return `nest:personal-schedules:v1:${encodeURIComponent(accountId)}`
}

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false
  const time = Date.parse(`${value}T00:00:00Z`)
  // 2026-02-30처럼 달력에 없는 날짜를 거른다.
  return (
    !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value
  )
}

function isDateTime(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function isPersonalSchedule(value: unknown): value is PersonalSchedule {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  // 공지·과제는 마감 일시가 있어야 하고, 학사일정은 날짜만 있다.
  const due =
    item.sourceType === 'ACADEMIC'
      ? item.dueAt === undefined
      : isDateTime(item.dueAt)
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    isDate(item.startDate) &&
    isDate(item.endDate) &&
    item.startDate <= item.endDate &&
    typeof item.sourceType === 'string' &&
    SOURCES.includes(item.sourceType) &&
    due &&
    typeof item.sourceId === 'string' &&
    typeof item.sourceUrl === 'string'
  )
}

function sorted(schedules: PersonalSchedule[]) {
  return [...schedules].sort(
    (a, b) =>
      a.startDate.localeCompare(b.startDate) ||
      a.endDate.localeCompare(b.endDate) ||
      a.id.localeCompare(b.id),
  )
}

// DB 없이 브라우저에 계정별로 저장한다. 손상되었거나 읽을 수 없는 항목은 빼고 읽는다.
export function loadPersonalSchedules(
  storage: ScheduleStorage,
  accountId: string,
): PersonalSchedule[] {
  const raw = storage.getItem(storageKey(accountId))
  if (raw === null) return []
  try {
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value) ? sorted(value.filter(isPersonalSchedule)) : []
  } catch {
    return []
  }
}

export function savePersonalSchedules(
  storage: ScheduleStorage,
  accountId: string,
  schedules: PersonalSchedule[],
) {
  storage.setItem(storageKey(accountId), JSON.stringify(schedules))
}

// 탭을 여러 개 열어도 다른 탭에서 저장한 일정을 덮어쓰지 않도록 저장 직전에 다시 읽고 바꾼다.
export function changePersonalSchedules(
  storage: ScheduleStorage,
  accountId: string,
  change: PersonalChange,
) {
  const current = loadPersonalSchedules(storage, accountId)
  const next = change(current)
  savePersonalSchedules(storage, accountId, next)
  return { current, next }
}

export function isSaved(
  schedules: PersonalSchedule[],
  sourceType: PersonalSource,
  sourceId: string,
) {
  return schedules.some(
    (item) => item.sourceType === sourceType && item.sourceId === sourceId,
  )
}

export function isAcademicSaved(
  schedules: PersonalSchedule[],
  scheduleId: string,
) {
  return isSaved(schedules, 'ACADEMIC', scheduleId)
}

// 공지·과제 여러 개를 한 번에 저장한다. 이미 저장한 항목과 마감 일시를 읽을 수 없는 항목은 건너뛴다.
export function addDeadlineSchedules(
  schedules: PersonalSchedule[],
  items: DeadlineItem[],
) {
  const added: PersonalSchedule[] = []
  for (const item of items) {
    if (!isDateTime(item.dueAt)) continue
    if (isSaved([...schedules, ...added], item.sourceType, item.sourceId))
      continue
    const date = kstToday(new Date(item.dueAt))
    added.push({
      id: `${item.sourceType.toLowerCase()}:${item.sourceId}`,
      title: item.title,
      startDate: date,
      endDate: date,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      sourceUrl: item.sourceUrl ?? '',
      dueAt: item.dueAt,
    })
  }
  return added.length === 0 ? schedules : sorted([...schedules, ...added])
}

// 저장할 때 제목과 날짜를 복사해 둔다. 학교가 일정을 바꿔도 자동으로 바뀌지 않으므로 출처 링크를 함께 남긴다.
export function addAcademicSchedule(
  schedules: PersonalSchedule[],
  event: AcademicEvent,
  sourceUrl: string,
) {
  if (isAcademicSaved(schedules, event.scheduleId)) return schedules
  return sorted([
    ...schedules,
    {
      id: `academic:${event.scheduleId}`,
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      sourceType: 'ACADEMIC',
      sourceId: event.scheduleId,
      sourceUrl,
    },
  ])
}

export function removeSchedule(schedules: PersonalSchedule[], id: string) {
  return schedules.filter((item) => item.id !== id)
}
