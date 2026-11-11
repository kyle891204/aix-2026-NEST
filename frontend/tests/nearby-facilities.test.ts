import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  FACILITY_TYPES,
  NEARBY_FACILITIES,
  NEARBY_FACILITIES_SOURCE,
  WEEKDAYS,
  distanceFromCampus,
  filterFacilities,
  groupWeeklyHours,
  kakaoPlaceUrl,
  sortByDistance,
  type NearbyFacility,
} from '../src/features/life/data/nearby-facilities.ts'
import {
  placeCategoryLabel,
  toFacilityItem,
  uniqueById,
  type KakaoPlace,
} from '../src/features/life/data/kakao-places.ts'
import { messages } from '../src/shared/i18n/messages.ts'

const TIME_RANGE = /^([01]\d|2[0-3]):[0-5]\d~([01]\d|2[0-4]):[0-5]\d$/

const sample = (
  id: string,
  type: NearbyFacility['type'],
  latitude: number,
): NearbyFacility => ({
  id,
  type,
  name: id,
  category: '약국',
  roadAddress: '경기 안산시 상록구',
  phone: null,
  latitude,
  longitude: 126.83559,
  hours: { weekly: {} },
})

test('registers five real facilities for each type', () => {
  for (const type of FACILITY_TYPES) {
    assert.equal(
      NEARBY_FACILITIES.filter((facility) => facility.type === type).length,
      5,
      `${type} count`,
    )
  }
})

test('every facility has the fields the detail view needs', () => {
  const ids = new Set<string>()
  for (const facility of NEARBY_FACILITIES) {
    assert.match(facility.id, /^\d+$/, 'Kakao place id')
    assert.ok(!ids.has(facility.id), `duplicate id ${facility.id}`)
    ids.add(facility.id)
    assert.ok(FACILITY_TYPES.includes(facility.type), facility.id)
    assert.ok(facility.name.trim(), `${facility.id}: name`)
    assert.ok(
      facility.roadAddress.startsWith('경기 안산시'),
      `${facility.id}: address`,
    )
    if (facility.phone !== null) {
      assert.match(facility.phone, /^(\d{2,4}-)?\d{3,4}-\d{4}$/, facility.id)
    }
    assert.ok(messages[facility.category], `${facility.id}: category i18n`)

    const { weekly, breakTime } = facility.hours
    assert.ok(Object.keys(weekly).length > 0, `${facility.id}: hours`)
    for (const [day, time] of Object.entries(weekly)) {
      assert.ok((WEEKDAYS as readonly string[]).includes(day), facility.id)
      if (time !== null) assert.match(time, TIME_RANGE, facility.id)
    }
    if (breakTime) assert.match(breakTime, TIME_RANGE, facility.id)
  }
  assert.match(NEARBY_FACILITIES_SOURCE.verifiedAt, /^\d{4}-\d{2}-\d{2}$/)
})

test('facilities are near the ERICA campus', () => {
  for (const facility of NEARBY_FACILITIES) {
    assert.ok(
      distanceFromCampus(facility) < 3000,
      `${facility.id}: ${distanceFromCampus(facility)}m`,
    )
  }
})

test('source link points at the Kakao Map place page', () => {
  assert.equal(
    kakaoPlaceUrl({ id: '351590598' }),
    'https://place.map.kakao.com/351590598',
  )
})

test('type filter shows only that type and "all" shows everything', () => {
  const items = [
    sample('a', 'hospital', 37.3),
    sample('b', 'mart', 37.3),
    sample('c', 'pharmacy', 37.3),
  ]
  assert.deepEqual(
    filterFacilities(items, 'pharmacy').map(({ id }) => id),
    ['c'],
  )
  assert.equal(filterFacilities(items, 'all').length, 3)
  assert.ok(
    filterFacilities(NEARBY_FACILITIES, 'mart').every(
      (facility) => facility.type === 'mart',
    ),
  )
})

test('list is ordered by straight-line distance from campus', () => {
  const far = sample('far', 'mart', 37.31)
  const near = sample('near', 'mart', 37.297)
  assert.deepEqual(
    sortByDistance([far, near]).map(({ id }) => id),
    ['near', 'far'],
  )
  // 위도 0.01333도 ≈ 1.48km
  assert.ok(Math.abs(distanceFromCampus(far) - 1482) < 20)
})

test('opening hours collapse consecutive days with the same time', () => {
  assert.deepEqual(
    groupWeeklyHours({
      mon: '09:00~18:00',
      tue: '09:00~18:00',
      wed: '14:00~18:00',
      thu: '09:00~18:00',
      fri: '09:00~18:00',
      sat: '09:00~13:00',
      sun: null,
    }),
    [
      { start: 'mon', end: 'tue', time: '09:00~18:00' },
      { start: 'wed', end: 'wed', time: '14:00~18:00' },
      { start: 'thu', end: 'fri', time: '09:00~18:00' },
      { start: 'sat', end: 'sat', time: '09:00~13:00' },
      { start: 'sun', end: 'sun', time: null },
    ],
  )
  // 정보가 없는 요일은 휴무(null)와 구분한다.
  assert.deepEqual(groupWeeklyHours({ mon: '10:00~22:00' }).at(-1), {
    start: 'tue',
    end: 'sun',
    time: undefined,
  })
})

const place = (overrides: Partial<KakaoPlace> = {}): KakaoPlace => ({
  id: '1',
  place_name: '테스트의원',
  category_name: '의료,건강 > 병원 > 내과',
  phone: '031-000-0000',
  address_name: '경기 안산시 상록구 사동 1',
  road_address_name: '경기 안산시 상록구 한양대학로 1',
  x: '126.83',
  y: '37.30',
  ...overrides,
})

test('live search keeps the short Kakao category and drops animal hospitals', () => {
  assert.equal(
    placeCategoryLabel('hospital', '의료,건강 > 병원 > 피부과 > 피부미용'),
    '피부과',
  )
  assert.equal(placeCategoryLabel('hospital', '의료,건강 > 병원'), '병원')
  assert.equal(
    placeCategoryLabel('hospital', '가정,생활 > 반려동물 > 동물병원'),
    null,
  )
  assert.equal(
    placeCategoryLabel('mart', '가정,생활 > 슈퍼마켓 > 대형슈퍼 > 노브랜드'),
    '슈퍼마켓',
  )
  assert.equal(
    placeCategoryLabel('mart', '가정,생활 > 대형마트 > 이마트'),
    '대형마트',
  )
  assert.equal(placeCategoryLabel('pharmacy', '의료,건강 > 약국'), '약국')
})

test('live search results become facility items without opening hours', () => {
  assert.deepEqual(toFacilityItem('hospital', place()), {
    id: '1',
    type: 'hospital',
    name: '테스트의원',
    category: '내과',
    roadAddress: '경기 안산시 상록구 한양대학로 1',
    phone: '031-000-0000',
    latitude: 37.3,
    longitude: 126.83,
  })
  const fallback = toFacilityItem(
    'hospital',
    place({ road_address_name: '', phone: ' ' }),
  )
  assert.equal(fallback?.roadAddress, '경기 안산시 상록구 사동 1')
  assert.equal(fallback?.phone, null)
  // 좌표가 비어 있으면 (0, 0)에 찍지 않고 뺀다.
  assert.equal(toFacilityItem('pharmacy', place({ x: '', y: '' })), null)
  assert.equal(
    toFacilityItem(
      'hospital',
      place({ category_name: '가정,생활 > 반려동물 > 동물병원' }),
    ),
    null,
  )
})

test('a live result that is a key place keeps the checked opening hours', () => {
  const curated = NEARBY_FACILITIES.find(({ id }) => id === '11269833')
  assert.equal(toFacilityItem('hospital', place({ id: '11269833' })), curated)
  assert.deepEqual(
    uniqueById([{ id: 'a' }, { id: 'b' }, { id: 'a' }]).map(({ id }) => id),
    ['a', 'b'],
  )
})

test('common Kakao categories in live search have translations', () => {
  // 2026-11-11 캠퍼스 주변 검색에서 나온 분류
  for (const category of [
    '병원',
    '내과',
    '가정의학과',
    '일반의원',
    '소아청소년과',
    '정형외과',
    '치과',
    '노인,요양병원',
    '이비인후과',
    '한방병원',
    '재활의학과',
    '피부과',
    '산부인과',
    '신경과',
    '비뇨기과',
    '외과',
    '신경외과',
    '영상의학과',
    '정신건강의학과',
    '안과',
    '종합병원',
    '대학병원',
    '대형마트',
    '슈퍼마켓',
    '약국',
  ]) {
    assert.ok(messages[category], `missing ${category}`)
  }
})
