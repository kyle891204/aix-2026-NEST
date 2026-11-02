import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { toDashboardProfile } from '../src/features/dashboard/profile-codes.ts'

test('signup choices are converted to dashboard codes', () => {
  assert.deepEqual(
    toDashboardProfile({ nationality: 'VN', degree: '학사', year: '2학년' }),
    { nationality: 'VN', visaType: null, degree: 'BACHELOR', year: '2' },
  )
  assert.equal(
    toDashboardProfile({ nationality: '', degree: '석사', year: '' }).degree,
    'MASTER',
  )
  assert.equal(
    toDashboardProfile({ nationality: '', degree: '박사', year: '' }).degree,
    'DOCTORAL',
  )
  // 석박사통합은 대응 코드가 없어 박사과정으로 본다.
  assert.equal(
    toDashboardProfile({ nationality: '', degree: '석박사통합', year: '' })
      .degree,
    'DOCTORAL',
  )
  assert.equal(
    toDashboardProfile({ nationality: '', degree: '', year: '5학년 이상' })
      .year,
    '5',
  )
})

test('empty or unknown values become null so the server treats them as missing', () => {
  assert.deepEqual(
    toDashboardProfile({ nationality: '', degree: '', year: '' }),
    { nationality: null, visaType: null, degree: null, year: null },
  )
  // 선택형 이전에 자유 입력으로 저장된 값
  const legacy = toDashboardProfile({
    nationality: '베트남',
    degree: '학부생',
    year: '2',
  })
  assert.equal(legacy.degree, null)
  assert.equal(legacy.year, null)
  assert.deepEqual(toDashboardProfile(null), {
    nationality: null,
    visaType: null,
    degree: null,
    year: null,
  })
})
