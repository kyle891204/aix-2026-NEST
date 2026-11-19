import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { collectDataItems } from '../src/features/translation/data-translation-items.ts'

test('server data titles become deduplicated Korean translation items', () => {
  const items = collectDataItems(
    ['수강신청', ' 수강신청 ', '', null, undefined, '중간고사'],
    '대학교 학사일정 제목',
  )
  assert.deepEqual(items, [
    {
      id: 'data:0',
      text: '수강신청',
      sourceLanguage: 'ko',
      context: '대학교 학사일정 제목',
    },
    {
      id: 'data:1',
      text: '중간고사',
      sourceLanguage: 'ko',
      context: '대학교 학사일정 제목',
    },
  ])
})

test('text longer than the API limit is left untranslated', () => {
  assert.deepEqual(collectDataItems(['가'.repeat(3001)], 'ctx'), [])
  assert.equal(collectDataItems(['가'.repeat(3000)], 'ctx').length, 1)
})
