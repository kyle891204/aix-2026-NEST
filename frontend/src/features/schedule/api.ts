import { requestJson } from '../../shared/api/client.ts'

export interface AcademicEvent {
  scheduleId: string
  title: string
  startDate: string
  endDate: string
}

export interface AcademicSchedules {
  sourceUrl: string
  checkedAt: string | null
  schedules: AcademicEvent[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isEvent(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.scheduleId === 'string' &&
    typeof value.title === 'string' &&
    typeof value.startDate === 'string' &&
    typeof value.endDate === 'string'
  )
}

export async function getAcademicSchedules(
  from: string,
  to: string,
): Promise<AcademicSchedules> {
  const query = new URLSearchParams({ from, to })
  const value = await requestJson(`/schedules/academic?${query}`, {
    cache: 'no-store',
  })
  if (
    !isRecord(value) ||
    typeof value.sourceUrl !== 'string' ||
    !Array.isArray(value.schedules) ||
    !value.schedules.every(isEvent)
  )
    throw new Error('학사일정 응답 형식이 올바르지 않습니다.')
  return value as unknown as AcademicSchedules
}
