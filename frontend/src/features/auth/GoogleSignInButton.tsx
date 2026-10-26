import { useEffect, useRef, useState } from 'react'

interface GoogleIdentity {
  initialize: (options: {
    client_id: string
    nonce: string
    callback: (response: { credential: string }) => void
    auto_select: boolean
  }) => void
  renderButton: (
    element: HTMLElement,
    options: {
      type: string
      theme: string
      size: string
      text: string
      shape: string
      width: number
      locale: string
    },
  ) => void
  cancel: () => void
  disableAutoSelect: () => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } }
  }
}

let googleScript: Promise<GoogleIdentity> | null = null

function loadGoogle() {
  if (window.google?.accounts.id)
    return Promise.resolve(window.google.accounts.id)
  googleScript ??= new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    const timer = window.setTimeout(() => {
      script.remove()
      reject(new Error('Google 로그인 로딩 시간 초과'))
    }, 15_000)
    script.onload = () => {
      window.clearTimeout(timer)
      if (window.google?.accounts.id) resolve(window.google.accounts.id)
      else reject(new Error('Google 로그인 초기화 실패'))
    }
    script.onerror = () => {
      window.clearTimeout(timer)
      script.remove()
      reject(new Error('Google 로그인 로딩 실패'))
    }
    document.head.append(script)
  }).catch((error) => {
    googleScript = null
    throw error
  })
  return googleScript
}

export function GoogleSignInButton({
  clientId,
  nonce,
  onCredential,
}: {
  clientId: string
  nonce: string
  onCredential: (credential: string) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const callback = useRef(onCredential)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    callback.current = onCredential
  }, [onCredential])

  useEffect(() => {
    let active = true
    const element = container.current
    let identity: GoogleIdentity | undefined
    void loadGoogle()
      .then((google) => {
        if (!active || !element) return
        identity = google
        google.initialize({
          client_id: clientId,
          nonce,
          auto_select: false,
          callback: ({ credential }) => {
            if (active) callback.current(credential)
          },
        })
        google.renderButton(element, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: Math.floor(element.clientWidth),
          locale: 'ko',
        })
        setReady(true)
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
      identity?.cancel()
      element?.replaceChildren()
    }
  }, [clientId, nonce, attempt])

  return (
    <div className="google-sign-in">
      <div ref={container} />
      {!ready && !error && <p role="status">Google 로그인 불러오는 중…</p>}
      {error && (
        <div role="alert">
          <p>Google 로그인을 불러오지 못했습니다. 연결 상태를 확인해 주세요.</p>
          <button
            type="button"
            onClick={() => {
              setError(false)
              setReady(false)
              setAttempt((value) => value + 1)
            }}
          >
            다시 불러오기
          </button>
        </div>
      )}
    </div>
  )
}
