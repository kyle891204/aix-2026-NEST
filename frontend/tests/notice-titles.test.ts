import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  noticeTitle,
  noticeTitleItems,
  titleTranslationMessage,
  titleTranslationStatus,
} from '../src/features/notices/notice-title-translations.ts'

const notices = [
  { noticeId: 'erica-1', title: '겨울계절학기 종합안내문' },
  { noticeId: 'erica-2', title: '조기졸업 신청 안내' },
  { noticeId: 'erica-1', title: '겨울계절학기 종합안내문' },
  { noticeId: 'erica-3', title: '   ' },
]

test('notice titles are translated only on English and Chinese screens', () => {
  assert.deepEqual(noticeTitleItems(notices, 'ko'), [])
  assert.deepEqual(noticeTitleItems(null, 'en'), [])

  const items = noticeTitleItems(notices, 'en')
  // 같은 공지는 한 번만, 빈 제목은 보내지 않는다.
  assert.deepEqual(
    items.map((item) => [item.id, item.text, item.sourceLanguage]),
    [
      ['erica-1', '겨울계절학기 종합안내문', 'ko'],
      ['erica-2', '조기졸업 신청 안내', 'ko'],
    ],
  )
  assert.ok(items.every((item) => item.context.length <= 200))
})

test('only succeeded translations replace the original title', () => {
  const results = [
    {
      id: 'erica-1',
      status: 'SUCCEEDED' as const,
      translatedText: 'Winter session guide',
    },
    { id: 'erica-2', status: 'FAILED' as const, translatedText: null },
  ]
  assert.deepEqual(noticeTitle(notices[0], results), {
    text: 'Winter session guide',
    translated: true,
  })
  assert.deepEqual(noticeTitle(notices[1], results), {
    text: '조기졸업 신청 안내',
    translated: false,
  })
  // 결과가 아직 없으면(번역 중) 원문이다.
  assert.deepEqual(noticeTitle(notices[1], []), {
    text: '조기졸업 신청 안내',
    translated: false,
  })
})

test('the list shows loading first, then failures with a retry', () => {
  const done = { id: 'a', status: 'SUCCEEDED' as const, translatedText: 'A' }
  const failed = { id: 'b', status: 'FAILED' as const, translatedText: null }
  const loading = { id: 'c', status: 'LOADING' as const, translatedText: null }
  assert.equal(titleTranslationStatus([done, failed, loading]), 'LOADING')
  assert.equal(titleTranslationStatus([done, failed]), 'FAILED')
  assert.equal(titleTranslationStatus([done]), 'DONE')
  assert.equal(titleTranslationMessage('en', 'retry'), 'Retry')
  assert.ok(titleTranslationMessage('zh', 'failed').length > 0)
})
