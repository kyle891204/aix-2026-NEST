import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { schoolMessage } from '../src/shared/i18n/school-message.ts'
import { translate } from '../src/shared/i18n/language.ts'
import { CHECKLIST_ITEMS } from '../src/features/immigration/checklist-store.ts'
import {
  TYPE_LABELS,
  materialLabel,
} from '../src/features/courses/course-notice-format.ts'
import {
  dateLine,
  formatDeadline,
  postedLabel,
  sourceLabel,
  matchLabel,
} from '../src/features/notices/notice-display.ts'
import {
  dateRangeLabel,
  fullDateRangeLabel,
  monthLabel,
} from '../src/features/schedule/academic-format.ts'
import { kstLabel } from '../src/shared/format/kst.ts'

test('SCHOOL dynamic fixed labels have both English and Chinese copy', () => {
  const labels = [
    ...Object.values(CHECKLIST_ITEMS)
      .flat()
      .map((item) => item.label),
    ...Object.values(TYPE_LABELS),
    ...['File', 'Page', 'ExternalUrl', 'ExternalTool'].map(materialLabel),
    ...['UNIVERSITY', 'INTERNATIONAL', 'COLLEGE'].map(sourceLabel),
    ...['APPLICABLE', 'NEEDS_REVIEW'].map(matchLabel),
  ]
  for (const language of ['en', 'zh'] as const) {
    for (const label of labels) {
      assert.ok(label)
      assert.notEqual(
        translate(language, label),
        label,
        `${language}: ${label}`,
      )
    }
  }
})

test('SCHOOL error messages change language without losing diagnostic codes', () => {
  const source = '학사일정을 불러오지 못했어요. (UPSTREAM_TIMEOUT)'
  assert.equal(schoolMessage('ko', source), source)
  assert.equal(
    schoolMessage('en', source),
    'Could not load the academic calendar. (UPSTREAM_TIMEOUT)',
  )
  assert.equal(schoolMessage('zh', source), '无法加载校历。 (UPSTREAM_TIMEOUT)')
  assert.doesNotMatch(
    schoolMessage(
      'en',
      '학교 공지를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
    ),
    /[가-힣]/,
  )
})

test('fixed matching reasons localize and unknown notice content remains unchanged', () => {
  for (const language of ['en', 'zh'] as const) {
    for (const reason of [
      '국적 정보가 없어 확인이 필요해요',
      '비자 조건이 맞지 않아요',
      '학위과정 조건이 맞지 않아요',
      '학년 정보가 없어 확인이 필요해요',
      '국적(CN) 대상',
      'D-2 비자 대상',
      '2학년 대상',
      '학사과정 대상',
      '아직 대상 조건을 분석하지 않은 공지예요',
    ])
      assert.doesNotMatch(schoolMessage(language, reason), /[가-힣]/)
    assert.equal(
      schoolMessage(language, '외국인 학생의 연구 발표 신청 안내'),
      '외국인 학생의 연구 발표 신청 안내',
    )
    assert.equal(
      schoolMessage(language, 'Unexpected server message (NEW_CODE)'),
      'Unexpected server message (NEW_CODE)',
    )
  }
})

test('localized deadlines keep the same Korean date across UTC midnight boundaries', () => {
  const deadline = '2026-12-31T15:30:00Z'
  assert.equal(formatDeadline(deadline), '2027.01.01 00:30 · KST')
  assert.match(formatDeadline(deadline, 'en')!, /Jan 1, 2027, 00:30 · KST/)
  assert.match(formatDeadline(deadline, 'zh')!, /2027年1月1日 00:30 · KST/)
  assert.match(kstLabel(deadline, 'en')!, /Jan 1/)
  assert.match(kstLabel(deadline, 'zh')!, /1月1日/)
  assert.equal(formatDeadline('unreadable', 'en'), 'unreadable')
  assert.equal(formatDeadline(null, 'zh'), null)
  assert.equal(
    dateLine(null, null, 'en'),
    'Date unavailable · Check the notice',
  )
  assert.equal(postedLabel('2026-11-13', 'en'), 'Nov 13, 2026')
  assert.equal(dateLine(null, '2026-11-13', 'zh'), '发布 2026年11月13日')
})

test('date-only schedule labels preserve calendar days in all display languages', () => {
  const event = { startDate: '2026-12-31', endDate: '2027-01-01' }
  assert.equal(dateRangeLabel(event), '12/31(목) ~ 1/1(금)')
  assert.match(dateRangeLabel(event, 'en'), /Dec 31.*Jan 1/)
  assert.match(dateRangeLabel(event, 'zh'), /12月31日.*1月1日/)
  assert.equal(fullDateRangeLabel(event), '2026.12.31 ~ 2027.01.01 · KST')
  assert.equal(
    fullDateRangeLabel(event, 'en'),
    'Dec 31, 2026 ~ Jan 1, 2027 · KST',
  )
  assert.equal(monthLabel('2027-01', 'en'), 'January 2027')
  assert.equal(monthLabel('2027-01', 'zh'), '2027年1月')
  assert.deepEqual(event, { startDate: '2026-12-31', endDate: '2027-01-01' })
})
