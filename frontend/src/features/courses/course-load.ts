import { useEffect, useRef, useState } from 'react'
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

  useEffect(() => {
    if (fullKey === null) return
    let active = true
    latest.current
      .request()
      .then((data) => {
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
  }, [fullKey])

  const load: Load<T> | null =
    fullKey === null
      ? null
      : result?.key === fullKey
        ? result.load
        : { status: 'loading' }
  return { load, retry: () => setAttempt((value) => value + 1) }
}
