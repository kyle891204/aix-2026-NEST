import type { AcademicEvent } from './api.ts'

// 공지·과제 저장을 붙일 때 종류를 추가한다.
export type PersonalSource = 'ACADEMIC'

export interface PersonalSchedule {
  id: string
  title: string
  startDate: string
  endDate: string
  sourceType: PersonalSource
  // 학사일정의 scheduleId. 같은 일정을 두 번 저장하지 않는 기준이다.
  sourceId: string
  sourceUrl: string
}

type ScheduleStorage = Pick<Storage, 'getItem' | 'setItem'>

function storageKey(accountId: string) {
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

function isPersonalSchedule(value: unknown): value is PersonalSchedule {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    isDate(item.startDate) &&
    isDate(item.endDate) &&
    item.startDate <= item.endDate &&
    item.sourceType === 'ACADEMIC' &&
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

export function isAcademicSaved(
  schedules: PersonalSchedule[],
  scheduleId: string,
) {
  return schedules.some(
    (item) => item.sourceType === 'ACADEMIC' && item.sourceId === scheduleId,
  )
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
