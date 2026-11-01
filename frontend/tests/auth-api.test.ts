import { strict as assert } from 'node:assert'
import { afterEach, test } from 'node:test'
import { getSession, signIn, signOut } from '../src/features/auth/api.ts'
import { requestJson, setCsrfToken } from '../src/shared/api/client.ts'

const originalFetch = globalThis.fetch
let tokenSentOnWrite: string | null = null

function session(
  csrfToken: string,
  user: { id: string; email: string } | null,
) {
  return { user, googleClientId: 'client-id', csrfToken, nonce: 'nonce' }
}

// /auth/* 응답은 경로별로 돌려주고, 그 외 쓰기 요청에서는 실제로 붙은 토큰만 기록한다.
function mockServer(responses: Record<string, unknown>) {
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    const path = url.replace('/api/v1', '')
    if (path in responses)
      return new Response(JSON.stringify(responses[path]), { status: 200 })
    tokenSentOnWrite = new Headers(init.headers).get('X-CSRF-Token')
    return new Response('{}', { status: 200 })
  }) as typeof fetch
}

async function writeOnce() {
  tokenSentOnWrite = null
  await requestJson('/schedules', { method: 'POST' })
  return tokenSentOnWrite
}

afterEach(() => {
  globalThis.fetch = originalFetch
  setCsrfToken(null)
})

test('reading the session stores its token for later writes', async () => {
  mockServer({ '/auth/session': session('session-token', null) })
  await getSession()
  assert.equal(await writeOnce(), 'session-token')
})

test('signing in replaces the token with the one from the new session', async () => {
  mockServer({
    '/auth/session': session('before-login', null),
    '/auth/google': session('after-login', {
      id: 'google-sub',
      email: 'student@example.com',
    }),
  })
  await getSession()
  await signIn('google-credential', 'before-login')
  assert.equal(await writeOnce(), 'after-login')
})

test('signing out clears the token until the session is read again', async () => {
  mockServer({
    '/auth/session': session('fresh-token', null),
    '/auth/logout': { loggedOut: true },
  })
  setCsrfToken('old-token')
  await signOut('old-token')
  assert.equal(await writeOnce(), null)

  await getSession()
  assert.equal(await writeOnce(), 'fresh-token')
})
