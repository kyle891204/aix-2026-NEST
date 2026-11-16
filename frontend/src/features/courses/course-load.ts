import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { ApiError } from '../../shared/api/client'

export type Load<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string; code: string | null }
  | { status: 'ready'; data: T }

const DEMO_PASSWORD_REQUIRED = 'LMS_DEMO_UNAUTHORIZED'

function failure(cause: unknown, fallback: string) {
  // 서버 메시지는 운영자용 안내가 섞여 있어 화면에는 공통 문구와 오류 코드만 보여준다.
  const code = cause instanceof ApiError ? cause.code : null
  return {
    status: 'error' as const,
    message: code ? `${fallback} (${code})` : fallback,
    code,
  }
}

// 배포 서버는 데모 암호를 요구한다. 로컬 개발 서버는 암호 없이 바로 조회된다.
export function needsDemoPassword(...loads: (Load<unknown> | null)[]) {
  return loads.some(
    (load) => load?.status === 'error' && load.code === DEMO_PASSWORD_REQUIRED,
  )
}

// 최근에 읽은 결과. 상세를 보고 목록으로 돌아올 때 LMS를 다시 읽지 않고 바로 보여준다.
// 공통 데모 계정 데이터라 계정별로 나누지 않는다. 5분이 지나거나 "다시 시도"하면 새로 읽어 새 공지가 오래 숨지 않게 한다.
const loaded = new Map<string, { data: unknown; at: number }>()
const LOADED_FOR_MS = 5 * 60 * 1000

function recentlyLoaded(key: string | null) {
  if (key === null) return undefined
  const entry = loaded.get(key)
  return entry && Date.now() - entry.at < LOADED_FOR_MS ? entry : undefined
}

/**
 * key가 바뀌거나 retry를 부르면 다시 요청한다. 결과에 요청 키를 붙여 두고, 현재 키와 다르면 불러오는 중으로 본다.
 * key가 null이면 요청하지 않는다.
 */
export function useCourseLoad<T>(
  key: string | null,
  request: () => Promise<T>,
  fallback: string,
) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ key: string; load: Load<T> } | null>(
    null,
  )
  // 요청 함수는 렌더마다 새로 만들어지므로 최신 것만 기억하고, 다시 요청할지는 key로만 정한다.
  const latest = useRef({ request, fallback })
  useEffect(() => {
    latest.current = { request, fallback }
  })
  const fullKey = key === null ? null : `${key}#${attempt}`
  // 화면을 연 순간의 판단을 유지한다. 보는 도중 5분이 지났다고 다시 불러오는 중으로 바뀌지 않게 한다.
  const [entry] = useState(() =>
    attempt === 0 ? recentlyLoaded(key) : undefined,
  )
  const cached =
    attempt === 0 && entry !== undefined && loaded.get(key ?? '') === entry

  useEffect(() => {
    if (fullKey === null || cached) return
    let active = true
    latest.current
      .request()
      .then((data) => {
        if (key !== null) loaded.set(key, { data, at: Date.now() })
        if (active) setResult({ key: fullKey, load: { status: 'ready', data } })
      })
      .catch((cause: unknown) => {
        if (active)
          setResult({
            key: fullKey,
            load: failure(cause, latest.current.fallback),
          })
      })
    return () => {
      active = false
    }
  }, [fullKey, key, cached])

  const load: Load<T> | null =
    fullKey === null
      ? null
      : cached
        ? { status: 'ready', data: entry.data as T }
        : result?.key === fullKey
          ? result.load
          : { status: 'loading' }
  return { load, retry: () => setAttempt((value) => value + 1) }
}

/**
 * 고른 항목·펼침처럼 상세를 보고 돌아와도 남아 있어야 하는 화면 상태. 이 화면의 방문 기록(history state)에 두므로
 * 뒤로 가기로 돌아오면 그대로 살아나고, 새로 들어오면 처음 값이다. 브라우저에 따로 저장하지 않는다.
 */
export function useHistoryState<T>(key: string, initial: T) {
  const location = useLocation()
  const navigate = useNavigate()
  const state = isRecord(location.state) ? location.state : {}
  const value = key in state ? (state[key] as T) : initial
  function setValue(next: T) {
    navigate(
      { pathname: location.pathname, search: location.search },
      { replace: true, state: { ...state, [key]: next } },
    )
  }
  return [value, setValue] as const
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// 상세를 보고 돌아왔을 때 보던 위치로 되돌리기 위한 화면별(방문 기록 항목별) 스크롤 위치.
const scrollPositions = new Map<string, number>()

/**
 * 목록 화면의 스크롤 위치를 기억한다. 화면 안을 누를 때마다(상세로 가는 화살표 포함) 위치를 남기고,
 * 뒤로 가기로 같은 방문 기록에 돌아와 목록이 준비되면 그 위치로 되돌린다.
 */
export function useScrollMemory(ready: boolean) {
  const { key } = useLocation()
  useScrollTopOnOpen()
  useEffect(() => {
    if (!ready) return
    const top = scrollPositions.get(key)
    if (top === undefined) return
    scrollPositions.delete(key)
    window.scrollTo(0, top)
  }, [ready, key])
  return () => {
    scrollPositions.set(key, window.scrollY)
  }
}

// 새로 연 화면(링크로 이동)은 맨 위에서 시작한다. 앞 화면의 스크롤이 남아 상세가 중간부터 보이지 않게 한다.
// 뒤로 가기(POP)는 useScrollMemory가, 같은 화면 안의 상태 저장(REPLACE)은 위치를 그대로 둔다.
export function useScrollTopOnOpen() {
  const { key } = useLocation()
  const type = useNavigationType()
  useEffect(() => {
    if (type === 'PUSH') window.scrollTo(0, 0)
  }, [key, type])
}
