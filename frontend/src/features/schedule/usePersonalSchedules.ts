import { useEffect, useState } from 'react'
import {
  changePersonalSchedules,
  loadPersonalSchedules,
  storageKey,
  type PersonalChange,
} from './personal-schedule-store'

function loadInitial(accountId: string | null) {
  if (!accountId) return []
  try {
    return loadPersonalSchedules(window.localStorage, accountId)
  } catch {
    return []
  }
}

// 계정이 바뀌면 호출하는 쪽에서 key로 다시 만들어 이전 계정의 일정이 남지 않게 한다.
export function usePersonalSchedules(accountId: string | null) {
  const [schedules, setSchedules] = useState(() => loadInitial(accountId))
  const [saveFailed, setSaveFailed] = useState(false)
  // 지금 화면을 연 뒤 저장한 일정. 저장 안내에만 쓰므로 브라우저에 남기지 않는다.
  const [recentIds, setRecentIds] = useState<string[]>([])

  // 다른 탭에서 저장·삭제하면 이 탭의 목록도 바꿔 "저장됨" 표시를 맞춘다.
  useEffect(() => {
    if (!accountId) return
    const key = storageKey(accountId)
    function sync(event: StorageEvent) {
      if (event.key === key || event.key === null)
        setSchedules(loadInitial(accountId))
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [accountId])

  // 브라우저 저장에 성공한 경우에만 화면을 바꾼다. 저장되지 않은 일정을 저장된 것처럼 보여주지 않는다.
  function update(change: PersonalChange) {
    if (!accountId) return false
    try {
      const { current, next } = changePersonalSchedules(
        window.localStorage,
        accountId,
        change,
      )
      // 다른 탭에서 저장한 일정은 이번에 저장한 일정으로 세지 않는다.
      const before = current.map((item) => item.id)
      const added = next
        .map((item) => item.id)
        .filter((id) => !before.includes(id))
      setRecentIds((ids) => [
        ...ids.filter((id) => next.some((item) => item.id === id)),
        ...added,
      ])
      setSchedules(next)
      setSaveFailed(false)
      return true
    } catch {
      setSaveFailed(true)
      return false
    }
  }

  return { schedules, recentIds, saveFailed, update }
}
