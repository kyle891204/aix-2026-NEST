import { useRef, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './auth-context'
import { authErrorMessage } from './auth-errors'
import { GoogleSignInButton } from './GoogleSignInButton'
import { useDemoProfile } from '../profile/demo-profile-context'
import { authReturnPath } from './return-path'
import './auth.css'

export function LoginPage() {
  const { session, loading, error, reload, login } = useAuth()
  const { savedProfile } = useDemoProfile()
  const [submitting, setSubmitting] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const inFlight = useRef(false)
  const location = useLocation()
  const from: unknown = location.state?.from

  if (session?.user && !loading && !error) {
    const target = authReturnPath(from)
    return savedProfile ? (
      <Navigate to={target} replace />
    ) : (
      <Navigate to="/signup/consent" state={{ from: target }} replace />
    )
  }

  async function authenticate(credential: string) {
    if (inFlight.current) return
    inFlight.current = true
    setSubmitting(true)
    setLoginError(null)
    try {
      await login(credential)
    } catch (cause) {
      setLoginError(authErrorMessage(cause))
      await reload()
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <header className="auth-header">
        <img
          src="/images/hanyang-symbol.png"
          width="36"
          height="36"
          alt="한양대학교"
        />
        <span className="auth-brand">NEST</span>
        <span className="auth-language">한국어</span>
      </header>
      <main className="auth-content" id="main-content">
        <p className="auth-eyebrow">WELCOME TO NEST</p>
        <h1>학교와 생활을 한곳에서</h1>
        <div aria-busy={loading || submitting}>
          {loading ? (
            <div className="auth-notice" role="status">
              로그인 정보를 확인하고 있습니다…
              <p>첫 접속은 서버가 깨어나는 데 약 1분이 걸릴 수 있어요.</p>
            </div>
          ) : error ? (
            <div className="auth-notice" role="alert">
              <p>{error}</p>
              <button type="button" onClick={() => void reload()}>
                다시 시도
              </button>
            </div>
          ) : !session?.googleClientId ? (
            <div className="auth-notice" role="status">
              <strong>Google 로그인 준비 중</strong>
              <p>
                로그인 설정이 완료되면 이곳에서 Google 계정으로 시작할 수
                있어요.
              </p>
              <button type="button" onClick={() => void reload()}>
                설정 다시 확인
              </button>
            </div>
          ) : (
            <fieldset className="auth-google-field" disabled={submitting}>
              <legend className="visually-hidden">Google 로그인</legend>
              <div
                className={submitting ? 'auth-button-busy' : undefined}
                inert={submitting}
              >
                <GoogleSignInButton
                  clientId={session.googleClientId}
                  nonce={session.nonce}
                  onCredential={(credential) => void authenticate(credential)}
                />
              </div>
            </fieldset>
          )}
        </div>
        {submitting && <p role="status">안전하게 로그인하고 있습니다…</p>}
        {loginError && (
          <p className="error-text" role="alert">
            {loginError}
          </p>
        )}
        <p className="auth-caption">
          Google 계정으로 로그인합니다. 학교 계정이나 Canvas는 별도로 연결해요.
        </p>
        <div className="auth-signup-note">
          처음 이용하면 Google 로그인 후 동의와 프로필 설정을 진행해요.
        </div>
        <details className="auth-privacy">
          <summary>개인정보 · 로그인 처리 안내</summary>
          <p>
            로그인 시 Google의 계정 식별자와 이메일로 본인을 확인합니다. Google
            비밀번호는 NEST에서 받지 않습니다.
          </p>
          <p>
            현재 로그인 정보는 서버 세션에만 보관합니다. 마지막 서버 요청부터
            30분이 지나거나 서버가 재시작되면 다시 로그인해야 합니다.
            로그아웃하면 세션 정보를 삭제합니다.
          </p>
          <p>
            Google 로그인만으로 Canvas나 AI에 연결되지 않습니다. 회원가입과
            프로필 설정은 데모로 제공하며, 입력한 프로필은 계정별로 이 탭에만
            보관합니다.
          </p>
          <p>
            이 탭에 저장한 프로필은 로그아웃해도 유지됩니다. 다른 기기에서는
            불러올 수 없으며 탭을 닫으면 일반적으로 사라집니다.
          </p>
        </details>
        <p className="auth-caption">
          만 18세 이상을 대상으로 하는 시범서비스입니다.
        </p>
      </main>
      <footer className="auth-footer">NEST · 캠퍼스 생활의 시작</footer>
    </div>
  )
}
