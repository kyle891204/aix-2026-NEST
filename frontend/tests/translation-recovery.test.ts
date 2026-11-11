import { strict as assert } from 'node:assert'
import { afterEach, test } from 'node:test'
import { sendTranslationBatch } from '../src/features/translation/translation-client.ts'
import { setCsrfToken } from '../src/shared/api/client.ts'

const originalFetch = globalThis.fetch
const request = {
  targetLanguage: 'en' as const,
  items: [
    {
      id: 'a',
      text: '안녕하세요',
      sourceLanguage: 'ko' as const,
      context: '게시글',
    },
  ],
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status })
const invalid = () => json({ code: 'AUTH_CSRF_INVALID' }, 403)
const session = (id: string | null) => ({
  user: id ? { id, email: 'fixture@example.invalid' } : null,
  csrfToken: 'fresh',
  nonce: 'nonce',
  googleClientId: '',
})
afterEach(() => {
  globalThis.fetch = originalFetch
  setCsrfToken(null)
})

test('CSRF rejection refreshes the same account and resends unchanged items with the fresh token', async () => {
  const calls: string[] = []
  const tokens: (string | null)[] = []
  globalThis.fetch = async (url, init) => {
    calls.push(String(url))
    if (String(url).endsWith('/auth/session')) return json(session('a'))
    tokens.push(new Headers(init?.headers).get('X-CSRF-Token'))
    assert.deepEqual(JSON.parse(String(init?.body)), request)
    return tokens.length === 1
      ? invalid()
      : json({ targetLanguage: 'en', items: [] })
  }
  assert.deepEqual(await sendTranslationBatch(request, 'stale', 'a'), {
    targetLanguage: 'en',
    items: [],
  })
  assert.deepEqual(tokens, ['stale', 'fresh'])
  assert.deepEqual(calls, [
    '/api/v1/community/translations/batch',
    '/api/v1/auth/session',
    '/api/v1/community/translations/batch',
  ])
})

for (const identity of [null, 'different-account']) {
  test(`does not resend an old account's items after refresh yields ${identity}`, async () => {
    let writes = 0
    globalThis.fetch = async (url) => {
      if (String(url).endsWith('/auth/session')) return json(session(identity))
      writes++
      return invalid()
    }
    await assert.rejects(sendTranslationBatch(request, 'stale', 'a'))
    assert.equal(writes, 1)
  })
}

test('a second CSRF rejection stops instead of refreshing forever', async () => {
  let writes = 0
  let refreshes = 0
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/auth/session')) {
      refreshes++
      return json(session('a'))
    }
    writes++
    return invalid()
  }
  await assert.rejects(sendTranslationBatch(request, 'stale', 'a'))
  assert.equal(writes, 2)
  assert.equal(refreshes, 1)
})

test('other access errors and failed translation items do not trigger session recovery', async () => {
  for (const [status, body] of [
    [403, { code: 'OTHER_FORBIDDEN' }],
    [401, { code: 'AUTH_REQUIRED' }],
    [503, { code: 'UNAVAILABLE' }],
    [
      200,
      {
        targetLanguage: 'en',
        items: [{ id: 'a', status: 'FAILED', retryable: true }],
      },
    ],
  ] as const) {
    let calls = 0
    globalThis.fetch = async (url) => {
      calls++
      assert.ok(String(url).endsWith('/translations/batch'))
      return json(body, status)
    }
    if (status === 200)
      assert.deepEqual(await sendTranslationBatch(request, 'token', 'a'), body)
    else await assert.rejects(sendTranslationBatch(request, 'token', 'a'))
    assert.equal(calls, 1)
  }
})
