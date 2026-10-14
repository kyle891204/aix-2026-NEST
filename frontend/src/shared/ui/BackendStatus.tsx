import { useEffect, useState } from 'react'
import { getHealth } from '../api/health'

type Connection =
  | { status: 'checking' }
  | { status: 'connected'; service: string }
  | { status: 'error'; message: string }

export function BackendStatus() {
  const [connection, setConnection] = useState<Connection>({
    status: 'checking',
  })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 5000)
    let active = true

    getHealth(controller.signal)
      .then((result) => {
        if (active)
          setConnection({ status: 'connected', service: result.service })
      })
      .catch(() => {
        if (active)
          setConnection({
            status: 'error',
            message: '백엔드가 실행 중인지 확인하고 다시 시도하세요.',
          })
      })
      .finally(() => window.clearTimeout(timeout))

    return () => {
      active = false
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [attempt])

  function retry() {
    setConnection({ status: 'checking' })
    setAttempt((value) => value + 1)
  }

  return (
    <section className="status-card" aria-label="서버 연결 상태">
      <div aria-live="polite">
        <p className="eyebrow">FRONTEND ↔ BACKEND</p>
        <h2>
          {connection.status === 'checking'
            ? '연결 확인 중'
            : connection.status === 'connected'
              ? '백엔드 연결 완료'
              : '백엔드 연결을 확인해 주세요'}
        </h2>
        <p>
          {connection.status === 'connected'
            ? `${connection.service}의 상태 API에 연결했습니다.`
            : connection.status === 'error'
              ? connection.message
              : '서버 응답을 기다리고 있습니다.'}
        </p>
      </div>
      <button onClick={retry} disabled={connection.status === 'checking'}>
        다시 확인
      </button>
    </section>
  )
}
