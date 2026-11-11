// 카카오 지도 JavaScript SDK 중 이 앱에서 쓰는 부분의 타입.
// SDK는 index.html에서 services(장소 검색)·clusterer(마커 묶기) 라이브러리와
// 함께 불러온다. 두 라이브러리는 maps.load() 이후에 생긴다.

import type { KakaoPlace } from './data/kakao-places'

export interface KakaoLatLng {
  getLat: () => number
  getLng: () => number
}

export interface KakaoLatLngBounds {
  extend: (position: KakaoLatLng) => void
  toString: () => string
}

export interface KakaoMap {
  panTo: (position: KakaoLatLng) => void
  setBounds: (bounds: KakaoLatLngBounds) => void
  getBounds: () => KakaoLatLngBounds
  getCenter: () => KakaoLatLng
  getLevel: () => number
  relayout: () => void
}

export interface KakaoMarker {
  setMap: (map: KakaoMap | null) => void
  setZIndex: (zIndex: number) => void
}

export interface KakaoMarkerClusterer {
  addMarkers: (markers: KakaoMarker[]) => void
  clear: () => void
}

export type KakaoPlacesStatus = 'OK' | 'ZERO_RESULT' | 'ERROR'

export interface KakaoPlacesPagination {
  totalCount: number
  hasNextPage: boolean
}

export interface KakaoServices {
  Places: new () => {
    categorySearch: (
      code: string,
      callback: (
        places: KakaoPlace[],
        status: KakaoPlacesStatus,
        pagination: KakaoPlacesPagination,
      ) => void,
      options: {
        bounds?: KakaoLatLngBounds
        location?: KakaoLatLng
        sort?: string
        page?: number
        size?: number
      },
    ) => void
  }
  Status: Record<KakaoPlacesStatus, KakaoPlacesStatus>
  SortBy: { ACCURACY: string; DISTANCE: string }
}

type KakaoEventTarget = KakaoMap | KakaoMarker

export interface KakaoMaps {
  load: (callback: () => void) => void
  LatLng: new (latitude: number, longitude: number) => KakaoLatLng
  LatLngBounds: new () => KakaoLatLngBounds
  Map: new (
    container: HTMLElement,
    options: { center: KakaoLatLng; level: number },
  ) => KakaoMap
  Marker: new (options: {
    position: KakaoLatLng
    map?: KakaoMap
    title?: string
    clickable?: boolean
  }) => KakaoMarker
  MarkerClusterer?: new (options: {
    map: KakaoMap
    averageCenter?: boolean
    minLevel?: number
  }) => KakaoMarkerClusterer
  services?: KakaoServices
  event: {
    addListener: (
      target: KakaoEventTarget,
      type: 'click' | 'idle',
      handler: () => void,
    ) => void
    removeListener: (
      target: KakaoEventTarget,
      type: 'click' | 'idle',
      handler: () => void,
    ) => void
  }
}

declare global {
  interface Window {
    kakao?: { maps: KakaoMaps }
  }
}
