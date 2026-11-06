export type Direction = 'entry' | 'exit'

export const CHECKLIST_ITEMS: Record<
  Direction,
  { key: string; label: string }[]
> = {
  entry: [
    { key: 'PASSPORT_VISA', label: '여권·비자 정보 확인' },
    { key: 'ENTRY_DATE_HOUSING', label: '입국일·숙소 정보 확인' },
    { key: 'SCHOOL_DOCUMENTS', label: '학교에서 요청한 서류 확인' },
    { key: 'OFFICIAL_GUIDE', label: '학교·공식기관 안내 원문 확인' },
  ],
  exit: [
    { key: 'EXIT_DATE_TRANSPORT', label: '출국일·교통편 확인' },
    { key: 'ACADEMIC_DOCUMENTS', label: '학교의 학적·서류 처리사항 확인' },
    { key: 'HOUSING_CLEANUP', label: '기숙사·숙소 정리사항 확인' },
    { key: 'OFFICIAL_GUIDE', label: '개인 조건에 맞는 공식 안내 확인' },
  ],
}

export interface Checklist {
  plannedDate: string
  completedKeys: string[]
}

type ChecklistStorage = Pick<Storage, 'getItem' | 'setItem'>

function checklistKey(accountId: string, direction: Direction) {
  return `nest:immigration-checklist:v1:${encodeURIComponent(accountId)}:${direction}`
}

// DB 없이 브라우저에 계정·구분별로 저장한다. 손상되었거나 없는 항목은 비어 있는 값으로 본다.
export function loadChecklist(
  storage: ChecklistStorage,
  accountId: string,
  direction: Direction,
): Checklist {
  const empty = { plannedDate: '', completedKeys: [] }
  const raw = storage.getItem(checklistKey(accountId, direction))
  if (raw === null) return empty
  try {
    const value = JSON.parse(raw) as Partial<Checklist> | null
    const allowed = CHECKLIST_ITEMS[direction].map((item) => item.key)
    return {
      plannedDate:
        typeof value?.plannedDate === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(value.plannedDate)
          ? value.plannedDate
          : '',
      completedKeys: Array.isArray(value?.completedKeys)
        ? value.completedKeys.filter((key) => allowed.includes(key))
        : [],
    }
  } catch {
    return empty
  }
}

export function saveChecklist(
  storage: ChecklistStorage,
  accountId: string,
  direction: Direction,
  checklist: Checklist,
) {
  storage.setItem(checklistKey(accountId, direction), JSON.stringify(checklist))
}
