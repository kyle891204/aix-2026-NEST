// "주변 전체" 보기에서 카카오 장소 검색(JavaScript SDK services 라이브러리)
// 결과를 화면용 시설 데이터로 바꾼다. SDK 호출은 컴포넌트에서 하고, 여기에는
// 테스트할 수 있는 변환 규칙만 둔다.

import {
  NEARBY_FACILITIES,
  type FacilityItem,
  type FacilityType,
} from './nearby-facilities.ts'

// 카카오 카테고리 그룹 코드
export const KAKAO_CATEGORY_CODES: Record<FacilityType, string> = {
  hospital: 'HP8',
  mart: 'MT1',
  pharmacy: 'PM9',
}

// 카카오 장소 검색은 한 번에 15곳씩 최대 3페이지(45곳)까지만 준다.
export const PLACE_PAGE_SIZE = 15
export const MAX_PLACE_PAGES = 3

// 카카오 장소 검색 결과 중 이 화면에서 쓰는 필드
export interface KakaoPlace {
  id: string
  place_name: string
  // '의료,건강 > 병원 > 내과'처럼 '>'로 이어진 분류
  category_name: string
  phone: string
  address_name: string
  road_address_name: string
  // 경도
  x: string
  // 위도
  y: string
}

const CURATED_FACILITIES = new Map<string, FacilityItem>(
  NEARBY_FACILITIES.map((facility) => [facility.id, facility]),
)

// 카카오 분류에서 화면에 보일 짧은 분류명. 표시하지 않을 장소면 null.
export function placeCategoryLabel(
  type: FacilityType,
  categoryName: string,
): string | null {
  const parts = categoryName.split('>').map((part) => part.trim())

  switch (type) {
    case 'hospital':
      // 병원 그룹(HP8)에는 '가정,생활 > 반려동물 > 동물병원'도 들어 있다.
      if (parts[0] !== '의료,건강') return null
      return parts[1] === '병원' ? (parts[2] ?? '병원') : (parts[1] ?? '병원')
    case 'mart':
      // '가정,생활 > 대형마트 > 이마트', '가정,생활 > 슈퍼마켓 > 대형슈퍼 > …'
      return parts[1] ?? '마트'
    case 'pharmacy':
      return '약국'
  }
}

// 직접 확인한 주요 시설이면 운영시간이 있는 그 데이터를 쓴다.
export function toFacilityItem(
  type: FacilityType,
  place: KakaoPlace,
): FacilityItem | null {
  const curated = CURATED_FACILITIES.get(place.id)
  if (curated) return curated

  const category = placeCategoryLabel(type, place.category_name)
  // Number('')는 0이 되므로 빈 좌표도 걸러지도록 parseFloat를 쓴다.
  const latitude = Number.parseFloat(place.y)
  const longitude = Number.parseFloat(place.x)
  if (!category || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  return {
    id: place.id,
    type,
    name: place.place_name,
    category,
    roadAddress: place.road_address_name || place.address_name,
    phone: place.phone.trim() || null,
    latitude,
    longitude,
  }
}

// 같은 장소가 여러 검색 결과에 겹쳐 나오면 처음 것만 남긴다.
export function uniqueById<T extends { id: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}
