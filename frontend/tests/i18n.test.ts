import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { ApiError } from '../src/shared/api/client.ts'
import { authErrorMessage } from '../src/features/auth/auth-errors.ts'
import { messages } from '../src/shared/i18n/messages.ts'
import {
  LANGUAGE_STORAGE_KEY,
  formatBoardDate,
  loadLanguage,
  translate,
} from '../src/shared/i18n/language.ts'
import { getCountries, getCountryName } from '../src/shared/data/countries.ts'
import {
  ERICA_COLLEGES,
  ERICA_SCHOOL,
} from '../src/features/auth/erica-academics.ts'
import {
  createEmptyProfile,
  loadDemoProfile,
  saveDemoProfile,
} from '../src/features/profile/demo-profile.ts'

const screens = [
  'app/App.tsx',
  'features/auth/LoginPage.tsx',
  'features/auth/ConsentPage.tsx',
  'features/auth/SignupPage.tsx',
  'features/auth/SignupProfilePage.tsx',
  'features/auth/GoogleSignInButton.tsx',
  'features/profile/pages/ProfilePage.tsx',
  'features/life/pages/LifeHomePage.tsx',
  'features/life/pages/LifeGuidePage.tsx',
  'features/life/components/EmergencyContacts.tsx',
  'features/free-board/FreeBoardLayout.tsx',
  'features/free-board/FreeBoardPages.tsx',
  'features/free-board/FreeBoardReplyCard.tsx',
  'features/market/MarketPages.tsx',
  'features/questions/QuestionPages.tsx',
  'features/translation/BoardTranslations.tsx',
  'shared/i18n/LanguageSwitcher.tsx',
]

test('all migrated fixed labels have English and Chinese copy with matching placeholders', () => {
  for (const screen of screens) {
    const source = readFileSync(
      new URL(`../src/${screen}`, import.meta.url),
      'utf8',
    )
    const tree = ts.createSourceFile(
      screen,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    function visit(node: ts.Node) {
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(tree) === 't' &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        assert.ok(
          messages[node.arguments[0].text],
          `${screen}: missing ${node.arguments[0].text}`,
        )
      }
      ts.forEachChild(node, visit)
    }
    visit(tree)
  }
  const tokens = (text: string) =>
    [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()
  for (const [key, entry] of Object.entries(messages)) {
    for (const language of ['en', 'zh'] as const) {
      assert.ok(entry[language].trim(), `${language}: empty ${key}`)
      assert.deepEqual(
        tokens(entry[language]),
        tokens(key),
        `${language}: placeholders ${key}`,
      )
    }
  }
})

test('login language restores safely and ignores unsupported or blocked storage', () => {
  assert.equal(
    loadLanguage({
      getItem: (key) => (key === LANGUAGE_STORAGE_KEY ? 'en' : null),
    }),
    'en',
  )
  assert.equal(loadLanguage({ getItem: () => 'zh' }), 'zh')
  assert.equal(loadLanguage({ getItem: () => 'fr' }), 'ko')
  assert.equal(loadLanguage({ getItem: () => null }), 'ko')
  assert.equal(
    loadLanguage({
      getItem() {
        throw new Error('Blocked')
      },
    }),
    'ko',
  )
})

test('language selection initializes signup and survives profile save without changing stored academic values', () => {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
  for (const language of ['ko', 'en', 'zh'] as const) {
    const profile = {
      ...createEmptyProfile(language),
      nickname: 'Test',
      schoolId: ERICA_SCHOOL.id,
      collegeId: 'computing',
      department: '인공지능학과',
      nationality: 'CN',
      degree: '학사',
      year: '2학년',
    }
    saveDemoProfile(storage, language, {
      profile,
      basicConsent: true,
      personalizedConsent: true,
    })
    assert.deepEqual(loadDemoProfile(storage, language)?.profile, profile)
    const saved = loadDemoProfile(storage, language)!
    saveDemoProfile(storage, language, {
      ...saved,
      profile: { ...saved.profile, language: 'zh' },
    })
    assert.deepEqual(loadDemoProfile(storage, language)?.profile, {
      ...profile,
      language: 'zh',
    })
  }
  assert.equal(createEmptyProfile().language, 'ko')
})

test('fixed UI translation is synchronous, interpolates counts, and preserves unrecognized text', () => {
  assert.equal(translate('ko', '총 {count}건', { count: 3 }), '총 3건')
  assert.equal(translate('en', '총 {count}건', { count: 3 }), '3 posts')
  assert.equal(translate('zh', '댓글 {count}', { count: 2 }), '2 条评论')
  assert.equal(translate('en', 'Unknown UI label'), 'Unknown UI label')
  assert.equal(translate('en', '총 {count}건'), '{count} posts')
})

test('country labels and academic options localize without changing identifiers', () => {
  for (const language of ['ko', 'en', 'zh'] as const) {
    assert.deepEqual(
      getCountries(language)
        .map(({ code }) => code)
        .sort(),
      getCountries()
        .map(({ code }) => code)
        .sort(),
    )
  }
  assert.equal(getCountryName('CN', 'en'), 'China')
  assert.equal(getCountryName('CN', 'zh'), '中国')
  for (const key of [
    ERICA_SCHOOL.name,
    ...ERICA_COLLEGES.flatMap((college) => [
      college.name,
      ...college.departments,
    ]),
  ]) {
    assert.ok(messages[key], `Missing academic label ${key}`)
  }
})

test('board dates follow display language while preserving the Korean timezone', () => {
  const date = '2026-11-07T16:30:00Z'
  assert.match(formatBoardDate(date, 'en'), /Nov 8, 2026/)
  assert.match(formatBoardDate(date, 'zh'), /2026年11月8日/)
  assert.match(formatBoardDate(date, 'ko'), /2026\. 11\. 8\./)
})

test('authentication errors use fixed localizable messages instead of unknown server copy', () => {
  const known = authErrorMessage(
    new ApiError(401, 'Server-specific copy', 'AUTH_CHALLENGE_EXPIRED'),
  )
  assert.equal(
    translate('en', known),
    'Your sign-in attempt has expired. Please try again.',
  )
  const fallback = authErrorMessage(
    new ApiError(500, '서버 내부 메시지', 'UNKNOWN'),
  )
  assert.ok(messages[fallback])
  assert.doesNotMatch(translate('en', fallback), /[가-힣]/)
})
