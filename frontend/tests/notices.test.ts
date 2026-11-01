import { strict as assert } from 'node:assert'
import { afterEach, test } from 'node:test'
import {
  loadActionChecks,
  saveActionChecks,
} from '../src/features/notices/action-checks.ts'
import {
  noticeProfile,
  searchNotices,
  translateNotice,
  viewNotice,
} from '../src/features/notices/api.ts'
import {
  formatDeadline,
  matchLabel,
  needsTranslation,
  sourceLabel,
} from '../src/features/notices/notice-display.ts'
import {
  loadChecklist,
  saveChecklist,
} from '../src/features/immigration/checklist-store.ts'
import { setCsrfToken } from '../src/shared/api/client.ts'

const originalFetch = globalThis.fetch
let calls: { url: string; init: RequestInit }[] = []

function mockFetch(body: unknown) {
  calls = []
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init })
    return new Response(JSON.stringify(body), { status: 200 })
  }) as typeof fetch
}

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  }
}

const emptyProfile = noticeProfile(null)

afterEach(() => {
  globalThis.fetch = originalFetch
  setCsrfToken(null)
})

test('마감일을 한국 시간으로 표시한다', () => {
  assert.equal(
    formatDeadline('2026-10-28T17:00:00+09:00'),
    '2026.10.28 17:00 · KST',
  )
  assert.equal(formatDeadline('2026-11-03T14:59:59Z'), '2026.11.03 23:59 · KST')
  assert.equal(formatDeadline('2026-11-03T15:00:00Z'), '2026.11.04 00:00 · KST')
})

test('마감일이 없으면 null, 읽을 수 없으면 원본을 돌려준다', () => {
  assert.equal(formatDeadline(null), null)
  assert.equal(formatDeadline('미정'), '미정')
})

test('출처와 해당 여부 문구를 표시한다', () => {
  assert.equal(sourceLabel('INTERNATIONAL'), '국제처')
  assert.equal(matchLabel('APPLICABLE'), '해당')
  assert.equal(matchLabel('NEEDS_REVIEW'), '확인 필요')
  assert.equal(matchLabel('NOT_APPLICABLE'), null)
})

test('원문과 선호 언어가 다를 때만 번역한다', () => {
  assert.equal(needsTranslation('ko', 'ko'), false)
  assert.equal(needsTranslation('zh', 'ko'), true)
})

test('프로필의 빈 값은 null로 보내고 비자는 보내지 않는다', () => {
  assert.deepEqual(
    noticeProfile({ nationality: 'VN', degree: '', year: '2' }),
    { nationality: 'VN', visaType: null, degree: null, year: '2' },
  )
})

test('필터는 쿼리로, 프로필은 본문으로 보낸다', async () => {
  mockFetch({ items: [], truncated: false })
  await searchNotices(null, null, emptyProfile)
  assert.equal(calls[0].url, '/api/v1/notices/search')
  assert.equal(calls[0].init.method, 'POST')

  const profile = noticeProfile({ nationality: 'VN', degree: '', year: '' })
  mockFetch({ items: [], truncated: false })
  await searchNotices('COLLEGE', 'NEEDS_REVIEW', profile)
  assert.equal(
    calls[0].url,
    '/api/v1/notices/search?source=COLLEGE&match=NEEDS_REVIEW',
  )
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), profile)
  assert.ok(!calls[0].url.includes('VN'))
})

test('공지 상세 요청은 프로필을 URL에 넣지 않는다', async () => {
  mockFetch({})
  await viewNotice(
    'univ-001',
    noticeProfile({ nationality: 'VN', degree: '', year: '' }),
  )
  assert.equal(calls[0].url, '/api/v1/notices/univ-001/view')
  assert.equal(JSON.parse(String(calls[0].init.body)).nationality, 'VN')
})

test('번역 요청에 목표 언어와 CSRF 토큰을 보낸다', async () => {
  setCsrfToken('csrf-fixture')
  mockFetch({ translationStatus: 'SUCCEEDED', translated: null })

  await translateNotice('univ-001', 'en')

  assert.equal(calls[0].url, '/api/v1/notices/univ-001/translations')
  assert.equal(calls[0].init.method, 'POST')
  assert.equal(calls[0].init.body, '{"targetLanguage":"en"}')
  assert.equal(
    new Headers(calls[0].init.headers).get('X-CSRF-Token'),
    'csrf-fixture',
  )
})

test('해야 할 일 체크는 계정과 공지별로 저장한다', () => {
  const storage = memoryStorage()
  saveActionChecks(storage, 'a', 'univ-001', ['a1'])

  assert.deepEqual(loadActionChecks(storage, 'a', 'univ-001'), ['a1'])
  assert.deepEqual(loadActionChecks(storage, 'a', 'univ-002'), [])
  assert.deepEqual(loadActionChecks(storage, 'b', 'univ-001'), [])
})

test('손상된 체크 값은 미완료로 본다', () => {
  const storage = memoryStorage()
  storage.setItem('nest:notice-actions:v1:a:n', '{broken')
  assert.deepEqual(loadActionChecks(storage, 'a', 'n'), [])
  storage.setItem('nest:notice-actions:v1:a:n', '"text"')
  assert.deepEqual(loadActionChecks(storage, 'a', 'n'), [])
})

test('체크리스트의 날짜와 완료 항목을 저장하고 다시 읽는다', () => {
  const storage = memoryStorage()
  const saved = { plannedDate: '2027-02-20', completedKeys: ['PASSPORT_VISA'] }
  saveChecklist(storage, 'a', 'entry', saved)

  assert.deepEqual(loadChecklist(storage, 'a', 'entry'), saved)
  assert.deepEqual(loadChecklist(storage, 'a', 'exit').completedKeys, [])
  assert.equal(loadChecklist(storage, 'b', 'entry').plannedDate, '')
})

test('저장값이 없으면 비어 있고, 손상되거나 모르는 값은 버린다', () => {
  const storage = memoryStorage()
  assert.deepEqual(loadChecklist(storage, 'a', 'exit'), {
    plannedDate: '',
    completedKeys: [],
  })
  storage.setItem('nest:immigration-checklist:v1:a:entry', '{broken')
  assert.equal(loadChecklist(storage, 'a', 'entry').plannedDate, '')
  saveChecklist(storage, 'a', 'entry', {
    plannedDate: '내일',
    completedKeys: ['PASSPORT_VISA', 'EXIT_DATE_TRANSPORT'],
  })
  assert.deepEqual(loadChecklist(storage, 'a', 'entry'), {
    plannedDate: '',
    completedKeys: ['PASSPORT_VISA'],
  })
})
