// 한양대학교 ERICA 주변의 실제 병원·마트·약국 정보.
// 이름·주소·전화·좌표는 카카오 로컬 API, 운영시간은 각 카카오맵 장소 페이지를
// 확인일 기준으로 옮겨 적었다. 실제 업체 정보는 바뀔 수 있으므로 화면에
// 확인일과 원본 링크를 함께 보여준다. 갱신 방법은 docs/nearby-facilities.md 참고.

export const FACILITY_TYPES = ['hospital', 'mart', 'pharmacy'] as const
export type FacilityType = (typeof FACILITY_TYPES)[number]
export type FacilityFilter = FacilityType | 'all'

export const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  hospital: '병원',
  mart: '마트',
  pharmacy: '약국',
}

export const WEEKDAYS = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
] as const
export type Weekday = (typeof WEEKDAYS)[number]

// 고정 UI 문구로 번역하는 요일 약칭.
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: '월',
  tue: '화',
  wed: '수',
  thu: '목',
  fri: '금',
  sat: '토',
  sun: '일',
}

// 'HH:MM~HH:MM' = 운영, null = 휴무, 키 없음 = 정보 없음
export type WeeklyHours = Partial<Record<Weekday, string | null>>

export interface FacilityHours {
  weekly: WeeklyHours
  // 점심·휴게시간. 'HH:MM~HH:MM'
  breakTime?: string
  // 응급실 24시간 운영
  emergency24h?: boolean
  // 월 2회 의무휴업(대형마트·준대규모점포). 날짜는 지자체 지정에 따라 바뀐다.
  mandatoryClosure?: boolean
}

// 화면에 표시하는 시설 한 곳. 직접 확인한 주요 시설과 카카오 실시간 검색
// 결과가 함께 쓴다. 운영시간은 직접 확인한 시설에만 있다.
export interface FacilityItem {
  // 카카오맵 장소 ID
  id: string
  type: FacilityType
  // 업체 이름은 번역하지 않고 원문을 유지한다.
  name: string
  // 진료과목·업태 등 짧은 분류. 고정 UI 문구 사전으로 번역하고, 사전에
  // 없는 분류는 원문 그대로 보인다.
  category: string
  // 도로명 주소. 실시간 검색 결과에 도로명이 없으면 지번 주소.
  roadAddress: string
  phone: string | null
  latitude: number
  longitude: number
  hours?: FacilityHours
}

// 직접 확인한 주요 시설. 운영시간이 반드시 있다.
export interface NearbyFacility extends FacilityItem {
  hours: FacilityHours
}

// 지도 초기 중심. PR #53의 ERICA 캠퍼스 좌표와 같다.
export const ERICA_CAMPUS_CENTER = { latitude: 37.29667, longitude: 126.83559 }

export const NEARBY_FACILITIES_SOURCE = {
  provider: '카카오맵',
  verifiedAt: '2026-11-11',
}

const everyDay = (time: string): WeeklyHours => ({
  mon: time,
  tue: time,
  wed: time,
  thu: time,
  fri: time,
  sat: time,
  sun: time,
})

const weekdays = (time: string): WeeklyHours => ({
  mon: time,
  tue: time,
  wed: time,
  thu: time,
  fri: time,
})

export const NEARBY_FACILITIES: readonly NearbyFacility[] = [
  // 병원: 내과·가정의학과 3곳 + 응급실 있는 종합병원 2곳
  {
    id: '2136499907',
    type: 'hospital',
    name: '안산탑내과의원',
    category: '내과',
    roadAddress: '경기 안산시 상록구 해양4로 26 자이센터프라자 2층 201~204호',
    phone: '031-407-7575',
    latitude: 37.2841643,
    longitude: 126.8290606,
    hours: {
      weekly: { ...weekdays('08:00~18:00'), sat: '08:00~14:00', sun: null },
      breakTime: '13:00~14:00',
    },
  },
  {
    id: '9529282',
    type: 'hospital',
    name: '더베스트내과',
    category: '내과',
    roadAddress: '경기 안산시 단원구 광덕대로 154 로데오타운 A동 2층',
    phone: '031-487-1119',
    latitude: 37.3101984,
    longitude: 126.8305945,
    hours: {
      weekly: {
        mon: '09:00~13:00',
        tue: '09:00~18:00',
        wed: '09:00~18:00',
        thu: '09:00~18:00',
        fri: '09:00~18:00',
        sat: '09:00~13:00',
      },
    },
  },
  {
    id: '10587528',
    type: 'hospital',
    name: '우리들가족의원',
    category: '가정의학과',
    roadAddress: '경기 안산시 단원구 민속공원로 81 재연빌딩 2층',
    phone: '031-407-7771',
    latitude: 37.3127253,
    longitude: 126.8386117,
    hours: {
      weekly: {
        mon: '09:30~18:00',
        tue: '09:30~18:00',
        wed: '14:00~18:00',
        thu: '09:30~18:00',
        fri: '09:30~18:00',
        sat: '09:30~13:00',
        sun: null,
      },
      breakTime: '13:00~14:00',
    },
  },
  {
    id: '11269833',
    type: 'hospital',
    name: '단원병원',
    category: '종합병원',
    roadAddress: '경기 안산시 단원구 원포공원1로 20',
    phone: '031-8040-6600',
    latitude: 37.3001676,
    longitude: 126.8135158,
    hours: {
      weekly: { ...weekdays('08:30~17:30'), sat: '08:30~12:30', sun: null },
      breakTime: '12:00~13:00',
      emergency24h: true,
    },
  },
  {
    id: '8650979',
    type: 'hospital',
    name: '고려대학교 안산병원',
    category: '대학병원',
    roadAddress: '경기 안산시 단원구 적금로 123',
    phone: '1577-7516',
    latitude: 37.318413,
    longitude: 126.8249194,
    hours: {
      weekly: { ...weekdays('08:30~17:30'), sat: null, sun: null },
      emergency24h: true,
    },
  },

  // 마트: 캠퍼스에서 가까운 순 5곳
  {
    id: '330651576',
    type: 'mart',
    name: 'GS더프레시 한양대에리카점',
    category: '슈퍼마켓',
    roadAddress: '경기 안산시 상록구 한양대학로 44 1층',
    phone: '031-415-1213',
    latitude: 37.300802,
    longitude: 126.8386981,
    hours: { weekly: everyDay('10:00~23:00'), mandatoryClosure: true },
  },
  {
    id: '1473543266',
    type: 'mart',
    name: 'GS더프레시 안산그랑시티자이점',
    category: '슈퍼마켓',
    roadAddress:
      '경기 안산시 상록구 해안로 776 그랑시티자이에비뉴 라이프동 113~114호',
    phone: '031-407-0776',
    latitude: 37.2844084,
    longitude: 126.8315048,
    hours: { weekly: everyDay('10:00~23:00'), mandatoryClosure: true },
  },
  {
    id: '1173619358',
    type: 'mart',
    name: 'GS더프레시 안산호수공원점',
    category: '슈퍼마켓',
    roadAddress: '경기 안산시 단원구 광덕서로 44 근린생활시설 1층 102~105호',
    phone: '031-439-4959',
    latitude: 37.3084313,
    longitude: 126.8273475,
    hours: { weekly: everyDay('10:00~23:00'), mandatoryClosure: true },
  },
  {
    id: '1455497367',
    type: 'mart',
    name: '노브랜드 안산고잔점',
    category: '슈퍼마켓',
    roadAddress: '경기 안산시 단원구 광덕2로 156 1층',
    phone: '02-380-5111',
    latitude: 37.3096754,
    longitude: 126.8278613,
    hours: { weekly: everyDay('10:00~22:00'), mandatoryClosure: true },
  },
  {
    id: '152529382',
    type: 'mart',
    name: '노브랜드 안산이동점',
    category: '슈퍼마켓',
    roadAddress: '경기 안산시 상록구 중보로 23 1층 101호',
    phone: '02-380-5111',
    latitude: 37.3061572,
    longitude: 126.8499214,
    hours: { weekly: everyDay('10:00~22:00'), mandatoryClosure: true },
  },

  // 약국: 캠퍼스에서 가까운 순 5곳
  {
    id: '351590598',
    type: 'pharmacy',
    name: '한양봄약국',
    category: '약국',
    roadAddress: '경기 안산시 상록구 한양대학로 51 1층',
    phone: '031-407-4399',
    latitude: 37.3001157,
    longitude: 126.8382586,
    hours: {
      weekly: { ...weekdays('08:30~21:30'), sat: '10:30~21:30', sun: null },
    },
  },
  {
    id: '1569231578',
    type: 'pharmacy',
    name: '일등온누리약국',
    category: '약국',
    roadAddress: '경기 안산시 상록구 석호로 162 1층',
    phone: '031-406-4312',
    latitude: 37.2974873,
    longitude: 126.8497964,
    hours: {
      weekly: {
        ...weekdays('09:00~22:00'),
        sat: '09:00~21:30',
        sun: '09:00~21:30',
      },
    },
  },
  {
    id: '310989385',
    type: 'pharmacy',
    name: '국희약국',
    category: '약국',
    roadAddress: '경기 안산시 상록구 석호로 164',
    phone: '031-407-3543',
    latitude: 37.2973254,
    longitude: 126.8500314,
    hours: { weekly: everyDay('09:00~21:00') },
  },
  {
    id: '11295166',
    type: 'pharmacy',
    name: '하나약국',
    category: '약국',
    roadAddress: '경기 안산시 상록구 해양1로 15 상가1동 2층 211호',
    phone: '031-501-0448',
    latitude: 37.296348,
    longitude: 126.8210118,
    hours: {
      weekly: { ...weekdays('09:00~22:00'), sat: '09:00~21:00', sun: null },
    },
  },
  {
    id: '1757810191',
    type: 'pharmacy',
    name: '고잔아는약국',
    category: '약국',
    roadAddress:
      '경기 안산시 단원구 광덕대로 138 골든에이스프라자 1층 112~113호',
    phone: '031-413-6005',
    latitude: 37.3087027,
    longitude: 126.8306113,
    hours: {
      weekly: { ...weekdays('09:00~19:30'), sat: '09:00~15:00', sun: null },
    },
  },
]

export function kakaoPlaceUrl(facility: Pick<FacilityItem, 'id'>): string {
  return `https://place.map.kakao.com/${facility.id}`
}

export function filterFacilities<T extends Pick<FacilityItem, 'type'>>(
  facilities: readonly T[],
  filter: FacilityFilter,
): T[] {
  return facilities.filter(
    (facility) => filter === 'all' || facility.type === filter,
  )
}

// 캠퍼스 중심에서 직선거리(m). 길찾기 거리가 아니다.
export function distanceFromCampus(
  facility: Pick<FacilityItem, 'latitude' | 'longitude'>,
): number {
  const earthRadius = 6_371_000
  const toRadians = (degree: number) => (degree * Math.PI) / 180
  const deltaLatitude = toRadians(
    facility.latitude - ERICA_CAMPUS_CENTER.latitude,
  )
  const deltaLongitude = toRadians(
    facility.longitude - ERICA_CAMPUS_CENTER.longitude,
  )
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(ERICA_CAMPUS_CENTER.latitude)) *
      Math.cos(toRadians(facility.latitude)) *
      Math.sin(deltaLongitude / 2) ** 2
  return Math.round(
    earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
  )
}

export function sortByDistance<
  T extends Pick<FacilityItem, 'latitude' | 'longitude'>,
>(facilities: readonly T[]): T[] {
  return [...facilities].sort(
    (left, right) => distanceFromCampus(left) - distanceFromCampus(right),
  )
}

export interface HoursGroup {
  start: Weekday
  end: Weekday
  // 운영 시간, null = 휴무, undefined = 정보 없음
  time: string | null | undefined
}

// 연속된 요일의 시간이 같으면 '월~금'처럼 묶는다.
export function groupWeeklyHours(weekly: WeeklyHours): HoursGroup[] {
  const groups: HoursGroup[] = []
  for (const day of WEEKDAYS) {
    const time = weekly[day]
    const last = groups.at(-1)
    if (last && last.time === time) last.end = day
    else groups.push({ start: day, end: day, time })
  }
  return groups
}
