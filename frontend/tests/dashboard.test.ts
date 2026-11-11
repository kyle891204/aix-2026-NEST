import { strict as assert } from 'node:assert'
import { afterEach, test } from 'node:test'
import {
  dashboardErrorMessage,
  getDashboard,
} from '../src/features/dashboard/api.ts'
import { ApiError } from '../src/shared/api/client.ts'
import { kstLabel } from '../src/shared/format/kst.ts'

const originalFetch = globalThis.fetch
let sent: { url: string; init: RequestInit } | null = null

function mockFetch(body: unknown) {
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    sent = { url, init }
    return new Response(JSON.stringify(body), { status: 200 })
  }) as typeof fetch
}

afterEach(() => {
  globalThis.fetch = originalFetch
  sent = null
})

const profile = {
  nationality: 'VN',
  visaType: null,
  degree: 'BACHELOR',
  year: '2',
  collegeId: 'computing',
}

test('the profile and college are posted as the body with the requested limit', async () => {
  mockFetch({
    profileCompleted: false,
    missingProfileFields: ['visaType'],
    matchedNotices: [],
  })
  const result = await getDashboard(profile, 3)

  assert.equal(sent?.url, '/api/v1/dashboard?limit=3')
  assert.equal(sent?.init.method, 'POST')
  assert.deepEqual(JSON.parse(String(sent?.init.body)), profile)
  assert.equal(result.missingProfileFields[0], 'visaType')
})

test('notices must carry a known match status and string reasons', async () => {
  const notice = {
    noticeId: 'erica-global-1',
    title: '공지',
    matchStatus: 'NEEDS_REVIEW',
    matchReasons: ['비자 정보가 없어 확인이 필요해요'],
  }
  mockFetch({
    profileCompleted: true,
    missingProfileFields: [],
    matchedNotices: [notice],
  })
  assert.equal(
    (await getDashboard(profile, 3)).matchedNotices[0].matchStatus,
    'NEEDS_REVIEW',
  )

  mockFetch({
    profileCompleted: true,
    missingProfileFields: [],
    matchedNotices: [{ ...notice, matchStatus: 'NOT_APPLICABLE' }],
  })
  await assert.rejects(getDashboard(profile, 3), /대시보드 응답/)

  mockFetch({
    profileCompleted: true,
    missingProfileFields: [],
    matchedNotices: [{ ...notice, matchReasons: '문자열' }],
  })
  await assert.rejects(getDashboard(profile, 3), /대시보드 응답/)
})

test('deadlines are shown in Korean time', () => {
  assert.equal(kstLabel('2026-11-20T18:00:00+09:00'), '11/20(금) 18:00')
  assert.equal(kstLabel('2026-11-10T08:00:00Z'), '11/10(화) 17:00')
  assert.equal(kstLabel(null), null)
})

test('an unreadable school site shows the server guidance instead of a code', () => {
  const guidance = '학교 공지를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
  assert.equal(
    dashboardErrorMessage(
      new ApiError(503, guidance, 'NOTICE_SOURCE_UNAVAILABLE'),
    ),
    guidance,
  )
  assert.equal(
    dashboardErrorMessage(new ApiError(500, '오류', 'INTERNAL_ERROR')),
    '맞춤 공지를 불러오지 못했어요. (INTERNAL_ERROR)',
  )
  assert.equal(
    dashboardErrorMessage(new TypeError('network')),
    '맞춤 공지를 불러오지 못했어요.',
  )
})
