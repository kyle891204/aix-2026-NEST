import { strict as assert } from 'node:assert'
import { afterEach, test } from 'node:test'
import {
  ApiError,
  requestJson,
  setCsrfToken,
} from '../src/shared/api/client.ts'

const originalFetch = globalThis.fetch
let calls: { url: string; init: RequestInit }[] = []

function mockFetch(status = 200, body: unknown = { ok: true }) {
  calls = []
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init })
    return new Response(JSON.stringify(body), { status })
  }) as typeof fetch
}

function sentHeader(name: string) {
  return new Headers(calls[0].init.headers).get(name)
}

afterEach(() => {
  globalThis.fetch = originalFetch
  setCsrfToken(null)
})

test('requests always go to the same-origin /api/v1 proxy', async () => {
  mockFetch()
  await requestJson('/courses')
  assert.equal(calls[0].url, '/api/v1/courses')
  assert.equal(sentHeader('Accept'), 'application/json')
})

test('state-changing methods attach the stored CSRF token', async () => {
  setCsrfToken('token-1')
  for (const method of ['POST', 'put', 'PATCH', 'DELETE']) {
    mockFetch()
    await requestJson('/schedules', { method })
    assert.equal(sentHeader('X-CSRF-Token'), 'token-1', method)
  }
})

test('reads never send the CSRF token', async () => {
  setCsrfToken('token-1')
  mockFetch()
  await requestJson('/schedules')
  assert.equal(sentHeader('X-CSRF-Token'), null)
})

test('an explicit CSRF header is kept as is', async () => {
  setCsrfToken('token-1')
  mockFetch()
  await requestJson('/auth/logout', {
    method: 'POST',
    headers: { 'X-CSRF-Token': 'explicit' },
  })
  assert.equal(sentHeader('X-CSRF-Token'), 'explicit')
})

test('no token is sent after it is cleared', async () => {
  setCsrfToken('token-1')
  setCsrfToken(null)
  mockFetch()
  await requestJson('/schedules', { method: 'POST' })
  assert.equal(sentHeader('X-CSRF-Token'), null)
})

test('error responses keep code, message and upstream status', async () => {
  mockFetch(403, { code: 'AUTH_CSRF_INVALID', message: '다시 시도해 주세요.' })
  await assert.rejects(
    requestJson('/schedules', { method: 'POST' }),
    (error: unknown) =>
      error instanceof ApiError &&
      error.status === 403 &&
      error.code === 'AUTH_CSRF_INVALID' &&
      error.message === '다시 시도해 주세요.' &&
      error.upstreamStatus === null,
  )
})
