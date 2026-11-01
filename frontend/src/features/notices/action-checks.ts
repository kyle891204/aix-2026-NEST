type CheckStorage = Pick<Storage, 'getItem' | 'setItem'>

function checksKey(accountId: string, noticeId: string) {
  return `nest:notice-actions:v1:${encodeURIComponent(accountId)}:${encodeURIComponent(noticeId)}`
}

// DB 없이 브라우저에 계정·공지별로 저장한다. 손상된 값은 미완료로 본다.
export function loadActionChecks(
  storage: CheckStorage,
  accountId: string,
  noticeId: string,
): string[] {
  const raw = storage.getItem(checksKey(accountId, noticeId))
  if (raw === null) return []
  try {
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

export function saveActionChecks(
  storage: CheckStorage,
  accountId: string,
  noticeId: string,
  completedIds: string[],
) {
  storage.setItem(checksKey(accountId, noticeId), JSON.stringify(completedIds))
}
