import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  createTranslationClient,
  readTranslationResponse,
  translationClient,
  type BatchRequest,
  type TranslationItem,
} from '../src/features/translation/translation-client.ts'
import { collectBoardItems } from '../src/features/translation/board-translation-items.ts'

const item = (id: string, text = `원문-${id}`): TranslationItem => ({
  id,
  text,
  sourceLanguage: 'ko',
  context: '게시글',
})
const response = (request: BatchRequest) => ({
  targetLanguage: request.targetLanguage,
  items: request.items.toReversed().map((entry) => ({
    id: entry.id,
    status: 'SUCCEEDED',
    translatedText: `translated:${entry.text}`,
    cached: false,
    retryable: false,
  })),
})

test('same-language text bypasses all requests; originals are preserved', async () => {
  let calls = 0
  const client = createTranslationClient(async (request) => {
    calls++
    return response(request)
  })
  const originals = [item('a')]
  const before = structuredClone(originals)
  assert.equal(
    (await client.translate(originals, 'ko', 'account'))[0].status,
    'SKIPPED',
  )
  assert.equal(calls, 0)
  assert.deepEqual(originals, before)
})

test('batch transport uses the existing proxy and the current session CSRF header without sending account metadata', async () => {
  const savedFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async (url, options) => {
    calls++
    assert.equal(url, '/api/v1/community/translations/batch')
    assert.equal(options?.method, 'POST')
    assert.equal(options?.credentials, 'same-origin')
    assert.equal(options?.cache, 'no-store')
    assert.equal(
      new Headers(options?.headers).get('X-CSRF-Token'),
      'csrf-fixture',
    )
    const request = JSON.parse(String(options?.body)) as BatchRequest
    assert.deepEqual(Object.keys(request).sort(), ['items', 'targetLanguage'])
    assert.equal(JSON.stringify(request).includes('private-account'), false)
    return new Response(JSON.stringify(response(request)), { status: 200 })
  }
  try {
    const result = await translationClient.translate(
      [item('transport')],
      'en',
      'private-account',
      'csrf-fixture',
    )
    assert.equal(result[0].status, 'SUCCEEDED')
    await translationClient.translate(
      [item('transport')],
      'en',
      'private-account',
      'rotated-csrf',
    )
    assert.equal(calls, 1)
  } finally {
    globalThis.fetch = savedFetch
  }
})

test('combines cache misses, maps reordered responses, and reuses individual items across pages', async () => {
  const sent: BatchRequest[] = []
  const client = createTranslationClient(async (request) => {
    sent.push(request)
    return response(request)
  })
  const results = await client.translate(
    [item('a'), item('b'), item('alias', '원문-a')],
    'en',
    'account',
  )
  assert.equal(sent.length, 1)
  assert.equal(sent[0].items.length, 2)
  assert.deepEqual(
    results.map((entry) => entry.translatedText),
    ['translated:원문-a', 'translated:원문-b', 'translated:원문-a'],
  )
  const again = await client.translate(
    [item('other-page', '원문-a'), item('c')],
    'en',
    'account',
  )
  assert.equal(again[0].cached, true)
  assert.deepEqual(
    sent[1].items.map((entry) => entry.id),
    ['c'],
  )
})

test('cache distinguishes content edits, target language, source language, context, and account, with a TTL', async () => {
  let now = 0
  let calls = 0
  const client = createTranslationClient(
    async (request) => {
      calls++
      return response(request)
    },
    () => now,
  )
  await client.translate([item('a')], 'en', 'account')
  await client.translate([item('a')], 'en', 'account')
  assert.equal(calls, 1)
  await client.translate([item('a', '수정')], 'en', 'account')
  await client.translate([item('a')], 'zh', 'account')
  await client.translate(
    [{ ...item('a'), sourceLanguage: 'zh' }],
    'en',
    'account',
  )
  await client.translate([{ ...item('a'), context: '댓글' }], 'en', 'account')
  await client.translate([item('a')], 'en', 'other-account')
  now = 3_600_000
  await client.translate([item('a')], 'en', 'account')
  assert.equal(calls, 7)
})

test('shares in-flight translations even when mounted twice or requested with a different item ID', async () => {
  let release!: (value: unknown) => void
  let calls = 0
  let sent!: BatchRequest
  const client = createTranslationClient((request) => {
    calls++
    sent = request
    return new Promise((resolve) => {
      release = resolve
    })
  })
  const first = client.translate([item('a')], 'en', 'account')
  const second = client.translate([item('alias', '원문-a')], 'en', 'account')
  assert.equal(calls, 1)
  release(response(sent))
  assert.equal((await first)[0].status, 'SUCCEEDED')
  assert.equal((await second)[0].id, 'alias')
})

test('splits requests by item and text limits', async () => {
  const sent: BatchRequest[] = []
  const client = createTranslationClient(async (request) => {
    sent.push(request)
    return response(request)
  })
  await client.translate(
    Array.from({ length: 21 }, (_, i) => item(String(i))),
    'en',
    'account',
  )
  assert.deepEqual(
    sent.map((request) => request.items.length),
    [20, 1],
  )
  sent.length = 0
  await client.translate(
    Array.from({ length: 5 }, (_, i) =>
      item(`long-${i}`, '가'.repeat(2999) + i),
    ),
    'en',
    'account',
  )
  assert.equal(sent.length, 2)
  assert.ok(
    sent.every(
      (request) =>
        request.items.reduce(
          (sum, entry) => sum + entry.text.length + entry.context.length,
          0,
        ) <= 12_000,
    ),
  )
})

test('retains successful partial results and retries only missing or empty translations', async () => {
  const sent: BatchRequest[] = []
  const client = createTranslationClient(async (request) => {
    sent.push(request)
    return sent.length === 1
      ? {
          targetLanguage: 'en',
          items: [response(request).items.find((entry) => entry.id === 'a')],
        }
      : response(request)
  })
  const input = [item('a'), item('b')]
  assert.deepEqual(
    (await client.translate(input, 'en', 'account')).map(
      (entry) => entry.status,
    ),
    ['SUCCEEDED', 'FAILED'],
  )
  const retried = await client.translate(input, 'en', 'account')
  assert.equal(retried[0].cached, true)
  assert.deepEqual(
    sent[1].items.map((entry) => entry.id),
    ['b'],
  )
  assert.equal(retried[1].status, 'SUCCEEDED')
})

test('validates IDs and language instead of trusting result order or provider output', () => {
  const request: BatchRequest = {
    targetLanguage: 'en',
    items: [item('a'), item('b')],
  }
  const valid = response(request)
  assert.throws(() =>
    readTranslationResponse({ ...valid, targetLanguage: 'zh' }, request),
  )
  assert.throws(() =>
    readTranslationResponse(
      { ...valid, items: [{ ...valid.items[0], id: 'foreign' }] },
      request,
    ),
  )
  const duplicated = {
    ...valid,
    items: [valid.items[1], valid.items[1], valid.items[0]],
  }
  assert.deepEqual(
    readTranslationResponse(duplicated, request).map((entry) => entry.status),
    ['FAILED', 'SUCCEEDED'],
  )
  assert.equal(
    readTranslationResponse(
      { ...valid, items: [{ ...valid.items[1], translatedText: ' ' }] },
      request,
    )[0].status,
    'FAILED',
  )
})

test('network errors are retryable and never cached as successful originals', async () => {
  let calls = 0
  const client = createTranslationClient(async () => {
    calls++
    throw new Error('network')
  })
  for (let i = 0; i < 2; i++) {
    const result = (await client.translate([item('a')], 'en', 'account'))[0]
    assert.equal(result.status, 'FAILED')
    assert.equal(result.translatedText, null)
    assert.equal(result.retryable, true)
  }
  assert.equal(calls, 2)
})

test('limits memory cache to 200 items', async () => {
  let calls = 0
  const client = createTranslationClient(async (request) => {
    calls++
    return response(request)
  })
  await client.translate(
    Array.from({ length: 201 }, (_, i) => item(String(i))),
    'en',
    'account',
  )
  const before = calls
  assert.equal(
    (await client.translate([item('200')], 'en', 'account'))[0].cached,
    true,
  )
  assert.equal(
    (await client.translate([item('0')], 'en', 'account'))[0].cached,
    false,
  )
  assert.equal(calls, before + 1)
})

test('collects only displayed posts and replies, and never sends editing forms or unrelated metadata', () => {
  const posts = [
    {
      id: 'p1',
      title: '제목',
      content: '첫 줄\n둘째 줄',
      language: 'ko' as const,
      type: 'sell',
      status: 'available',
      location: '도서관',
      replies: [{ id: 'r1', content: '댓글', language: 'zh' as const }],
      authorId: 'private-id',
      price: 5000,
    },
    {
      id: 'p2',
      title: '다른 글',
      content: '본문',
      language: 'en' as const,
      type: 'buy',
      status: 'completed',
      replies: [],
    },
  ]
  const original = structuredClone(posts)
  const list = collectBoardItems(
    'market',
    posts,
    '/life/market',
    '?type=sell&status=available',
  )
  assert.deepEqual(
    list.map((entry) => entry.text),
    ['제목', '첫 줄'],
  )
  const detail = collectBoardItems('market', posts, '/life/market/p1', '')
  assert.deepEqual(
    detail.map((entry) => entry.text),
    ['제목', '첫 줄\n둘째 줄', '도서관', '댓글'],
  )
  assert.equal(detail.at(-1)?.sourceLanguage, 'zh')
  assert.equal(JSON.stringify(detail).includes('private-id'), false)
  assert.deepEqual(collectBoardItems('free', posts, '/life/free/new', ''), [])
  assert.deepEqual(
    collectBoardItems('free', posts, '/life/free/p1/edit', ''),
    [],
  )
  assert.deepEqual(
    collectBoardItems('free', posts, '/life/free/missing', ''),
    [],
  )
  assert.deepEqual(posts, original)
})
