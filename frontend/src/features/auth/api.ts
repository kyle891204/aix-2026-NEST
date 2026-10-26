import { requestJson } from '../../shared/api/client'

export interface AuthUser {
  id: string
  email: string
}

export interface AuthSession {
  user: AuthUser | null
  googleClientId: string
  csrfToken: string
  nonce: string
}

// Always use the same-origin Vite/Vercel proxy for HttpOnly session cookies.
// The existing VITE_API_BASE_URL may still point directly at Render for LMS reads.
function authRequest(path: string, options: RequestInit = {}) {
  return requestJson(
    `/auth${path}`,
    {
      ...options,
      credentials: 'same-origin',
      cache: 'no-store',
      signal: AbortSignal.timeout(75_000),
    },
    '/api/v1',
  )
}

function readSession(value: unknown): AuthSession {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('googleClientId' in value) ||
    typeof value.googleClientId !== 'string' ||
    !('csrfToken' in value) ||
    typeof value.csrfToken !== 'string' ||
    !('nonce' in value) ||
    typeof value.nonce !== 'string' ||
    !('user' in value) ||
    (value.user !== null && !isUser(value.user))
  ) {
    throw new Error('로그인 서버 응답을 확인할 수 없습니다.')
  }
  return value as AuthSession
}

function isUser(value: unknown): value is AuthUser {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'email' in value &&
    typeof value.email === 'string'
  )
}

let pendingSession: Promise<AuthSession> | null = null

export function getSession() {
  // React StrictMode may mount twice; share the initial nonce/session request.
  pendingSession ??= authRequest('/session')
    .then(readSession)
    .finally(() => {
      pendingSession = null
    })
  return pendingSession
}

export async function signIn(credential: string, csrfToken: string) {
  return readSession(
    await authRequest('/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ credential }),
    }),
  )
}

export async function signOut(csrfToken: string) {
  await authRequest('/logout', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
  })
}

export async function checkSession() {
  await authRequest('/me')
}
