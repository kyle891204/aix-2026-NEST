import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { authReturnPath } from '../src/features/auth/return-path.ts'
import {
  createEmptyProfile,
  demoProfileKey,
  loadDemoProfile,
  saveDemoProfile,
  type ProfileDraft,
} from '../src/features/profile/demo-profile.ts'

class MemoryStorage {
  values = new Map<string, string>()
  getItem(key: string) {
    return this.values.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

function draft(nickname = '데모 A'): ProfileDraft {
  return {
    basicConsent: true,
    personalizedConsent: true,
    profile: {
      ...createEmptyProfile(),
      nickname,
      language: 'en',
      schoolId: 'hanyang-erica',
      collegeId: 'computing',
      department: '인공지능학과',
      nationality: '가상 국적',
    },
  }
}

test('a fresh provider can restore the saved profile for the same account', () => {
  const storage = new MemoryStorage()
  const saved = saveDemoProfile(storage, 'google-a', draft('  데모 A  '))
  assert.equal(saved.profile.nickname, '데모 A')
  assert.deepEqual(loadDemoProfile(storage, 'google-a'), saved)
})

test('accounts retain separate profiles and owner mismatches cannot be restored', () => {
  const storage = new MemoryStorage()
  saveDemoProfile(storage, 'google-a', draft('데모 A'))
  assert.equal(loadDemoProfile(storage, 'google-b'), null)
  saveDemoProfile(storage, 'google-b', draft('데모 B'))
  assert.equal(loadDemoProfile(storage, 'google-a')?.profile.nickname, '데모 A')
  assert.equal(loadDemoProfile(storage, 'google-b')?.profile.nickname, '데모 B')
  storage.setItem(
    demoProfileKey('google-c'),
    storage.getItem(demoProfileKey('google-a'))!,
  )
  assert.equal(loadDemoProfile(storage, 'google-c'), null)
})

test('corrupt, incomplete, unsupported and inconsistent records return to onboarding', () => {
  const storage = new MemoryStorage()
  const saved = saveDemoProfile(storage, 'google-a', draft())
  const invalid = [
    'broken JSON',
    JSON.stringify(null),
    JSON.stringify({ ...saved, version: 2 }),
    JSON.stringify({ ...saved, basicConsent: false }),
    JSON.stringify({ ...saved, profile: { nickname: 'A' } }),
    JSON.stringify({
      ...saved,
      profile: { ...saved.profile, language: 'unknown' },
    }),
    JSON.stringify({
      ...saved,
      profile: { ...saved.profile, schoolId: 'unknown' },
    }),
    JSON.stringify({
      ...saved,
      profile: { ...saved.profile, collegeId: 'business-economics' },
    }),
  ]
  for (const raw of invalid) {
    storage.setItem(demoProfileKey('google-a'), raw)
    assert.equal(loadDemoProfile(storage, 'google-a'), null)
  }
})

test('no optional consent means no optional profile data is saved or restored', () => {
  const storage = new MemoryStorage()
  const saved = saveDemoProfile(storage, 'google-a', {
    ...draft(),
    personalizedConsent: false,
  })
  assert.deepEqual(saved.profile, {
    ...createEmptyProfile(),
    nickname: '데모 A',
    language: 'en',
  })
  // Also sanitize a previously stored record when optional consent is false.
  storage.setItem(
    demoProfileKey('google-a'),
    JSON.stringify({ ...saved, profile: draft().profile }),
  )
  assert.deepEqual(loadDemoProfile(storage, 'google-a')?.profile, saved.profile)
})

test('removed visa fields never survive schema loading', () => {
  const storage = new MemoryStorage()
  const saved = saveDemoProfile(storage, 'google-a', draft())
  storage.setItem(
    demoProfileKey('google-a'),
    JSON.stringify({
      ...saved,
      profile: { ...saved.profile, visa: 'old demo value' },
    }),
  )
  assert.equal('visa' in loadDemoProfile(storage, 'google-a')!.profile, false)
})

test('anonymous, missing consent and empty nickname cannot create a profile', () => {
  const storage = new MemoryStorage()
  assert.throws(() => saveDemoProfile(storage, '', draft()))
  assert.throws(() =>
    saveDemoProfile(storage, 'google-a', { ...draft(), basicConsent: false }),
  )
  assert.throws(() => saveDemoProfile(storage, 'google-a', draft('   ')))
  assert.equal(storage.values.size, 0)
})

test('browser storage permission and quota errors are not reported as success', () => {
  const storage = {
    getItem() {
      throw new Error('Storage disabled')
    },
    setItem() {
      throw new Error('Quota exceeded')
    },
  }
  assert.throws(() => loadDemoProfile(storage, 'google-a'), /Storage disabled/)
  assert.throws(
    () => saveDemoProfile(storage, 'google-a', draft()),
    /Quota exceeded/,
  )
})

test('return paths stay inside the app and cannot loop into authentication', () => {
  assert.equal(
    authReturnPath('/profile?edit=1#details'),
    '/profile?edit=1#details',
  )
  for (const path of [
    null,
    '//other.example',
    '/\\other.example',
    '/login',
    '/signup/consent',
    'https://other.example',
  ]) {
    assert.equal(authReturnPath(path), '/')
  }
})
