import { useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from '../../../shared/i18n/language-context'
import { telephoneHref } from '../data/emergency-contacts'
import {
  KAKAO_CATEGORY_CODES,
  MAX_PLACE_PAGES,
  PLACE_PAGE_SIZE,
  toFacilityItem,
  uniqueById,
  type KakaoPlace,
} from '../data/kakao-places'
import {
  ERICA_CAMPUS_CENTER,
  FACILITY_TYPE_LABELS,
  FACILITY_TYPES,
  NEARBY_FACILITIES,
  NEARBY_FACILITIES_SOURCE,
  WEEKDAY_LABELS,
  distanceFromCampus,
  filterFacilities,
  groupWeeklyHours,
  kakaoPlaceUrl,
  sortByDistance,
  type FacilityFilter,
  type FacilityHours,
  type FacilityItem,
  type FacilityType,
} from '../data/nearby-facilities'
import type {
  KakaoLatLng,
  KakaoLatLngBounds,
  KakaoMap,
  KakaoMarker,
  KakaoMarkerClusterer,
  KakaoServices,
} from '../kakao-maps'
import '../nearby-facilities.css'

// curated: 직접 확인한 주요 시설 15곳, all: 지금 지도 범위의 카카오 실시간 검색 결과
type ViewMode = 'curated' | 'all'
const VIEW_MODES: ViewMode[] = ['curated', 'all']
const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  curated: '주요 시설',
  all: '주변 전체',
}

const FILTERS: FacilityFilter[] = ['all', ...FACILITY_TYPES]
const FILTER_LABELS: Record<FacilityFilter, string> = {
  all: '전체',
  ...FACILITY_TYPE_LABELS,
}

const LIST_PAGE_SIZE = 20
// 지도를 움직이는 동안 검색을 반복하지 않도록 멈춘 뒤에 검색한다.
const SEARCH_DELAY_MS = 300
// 이 지도 레벨부터 가까운 마커를 숫자 묶음으로 보여준다.
const CLUSTER_MIN_LEVEL = 5

interface MapView {
  // 같은 범위면 다시 검색하지 않도록 비교하는 값
  key: string
  bounds: KakaoLatLngBounds
  center: KakaoLatLng
}

export function NearbyFacilities() {
  const { t } = useLanguage()
  const [mode, setMode] = useState<ViewMode>('curated')
  const [filter, setFilter] = useState<FacilityFilter>('all')
  const [selected, setSelected] = useState<FacilityItem | null>(null)
  const [view, setView] = useState<MapView | null>(null)
  const [visibleCount, setVisibleCount] = useState(LIST_PAGE_SIZE)
  const live = useLiveFacilities(mode === 'all' ? view : null, filter)

  const facilities = useMemo(
    () =>
      sortByDistance(
        filterFacilities(
          mode === 'all' ? live.facilities : NEARBY_FACILITIES,
          filter,
        ),
      ),
    [mode, filter, live.facilities],
  )

  const resetSelection = () => {
    setSelected(null)
    setVisibleCount(LIST_PAGE_SIZE)
  }
  const changeMode = (next: ViewMode) => {
    setMode(next)
    resetSelection()
  }
  const changeFilter = (next: FacilityFilter) => {
    setFilter(next)
    resetSelection()
  }

  const typeLabel = t(FILTER_LABELS[filter])
  const remaining = facilities.length - visibleCount

  return (
    <div className="nearby-facilities">
      <p className="nearby-facilities-intro">
        {t('캠퍼스 주변의 병원·마트·약국을 지도와 목록으로 확인하세요.')}
      </p>

      <div
        className="nearby-facility-modes"
        role="group"
        aria-label={t('보기 방식 선택')}
      >
        {VIEW_MODES.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => changeMode(option)}
          >
            {t(VIEW_MODE_LABELS[option])}
          </button>
        ))}
      </div>

      <div
        className="nearby-facility-filters"
        role="group"
        aria-label={t('시설 유형 선택')}
      >
        {FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={filter === option}
            onClick={() => changeFilter(option)}
          >
            {t(FILTER_LABELS[option])}
          </button>
        ))}
      </div>

      <NearbyFacilitiesMap
        facilities={facilities}
        mode={mode}
        selected={selected}
        onSelect={setSelected}
        onViewChange={(next) =>
          setView((current) => (current?.key === next.key ? current : next))
        }
      />

      {selected && (
        <FacilityDetail facility={selected} onClose={() => setSelected(null)} />
      )}

      <section aria-labelledby="nearby-facility-list-title">
        <h3 id="nearby-facility-list-title">
          {mode === 'all'
            ? t('지도에 보이는 {type} {count}곳', {
                type: typeLabel,
                count: facilities.length,
              })
            : t('{type} {count}곳', {
                type: typeLabel,
                count: facilities.length,
              })}
        </h3>

        {mode === 'all' && (
          <LiveSearchStatus
            status={live.status}
            truncated={live.truncated}
            onRetry={live.retry}
          />
        )}

        {facilities.length === 0 ? (
          // 주변 전체는 검색이 끝나고 결과가 없을 때만 "없음"으로 안내한다.
          (mode === 'curated' || live.status === 'ready') && (
            <p className="nearby-facility-empty">
              {t('표시할 시설이 없습니다.')}
            </p>
          )
        ) : (
          <ul className="nearby-facility-list">
            {facilities.slice(0, visibleCount).map((facility) => (
              <li key={facility.id}>
                <button
                  type="button"
                  className="nearby-facility-row"
                  aria-pressed={facility.id === selected?.id}
                  onClick={() => setSelected(facility)}
                >
                  <span className="nearby-facility-row-main">
                    <strong>{facility.name}</strong>
                    <span className="nearby-facility-meta">
                      {t(facility.category)}
                    </span>
                  </span>
                  <span className="nearby-facility-distance">
                    {formatDistance(distanceFromCampus(facility))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {remaining > 0 && (
          <button
            type="button"
            className="nearby-facility-more"
            onClick={() => setVisibleCount((count) => count + LIST_PAGE_SIZE)}
          >
            {t('더 보기 ({count}곳 남음)', { count: remaining })}
          </button>
        )}
      </section>

      <p className="nearby-facility-source">
        {mode === 'all'
          ? t(
              '주변 전체는 카카오맵 실시간 검색 결과입니다. 운영시간은 주요 시설에만 표시하며, 나머지는 카카오맵에서 확인해 주세요.',
            )
          : t(
              '{provider} 정보를 {date}에 확인했습니다. 운영시간과 연락처는 바뀔 수 있으니 방문 전 확인해 주세요.',
              {
                provider: t(NEARBY_FACILITIES_SOURCE.provider),
                date: NEARBY_FACILITIES_SOURCE.verifiedAt,
              },
            )}
      </p>
    </div>
  )
}

function LiveSearchStatus({
  status,
  truncated,
  onRetry,
}: {
  status: LiveStatus
  truncated: boolean
  onRetry: () => void
}) {
  const { t } = useLanguage()

  // 지도가 아직 없거나 불러오지 못해 검색할 범위가 없다.
  if (status === 'idle') {
    return (
      <p className="nearby-facility-status">
        {t('지도를 불러오면 주변 시설을 찾을 수 있습니다.')}
      </p>
    )
  }
  if (status === 'loading') {
    return (
      <p className="nearby-facility-status" role="status">
        {t('주변 시설을 찾고 있습니다…')}
      </p>
    )
  }
  if (status === 'error') {
    return (
      <div className="nearby-facility-status" role="alert">
        <p>
          {t('주변 시설을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')}
        </p>
        <button type="button" onClick={onRetry}>
          {t('다시 시도')}
        </button>
      </div>
    )
  }
  if (truncated) {
    return (
      <p className="nearby-facility-status">
        {t(
          '지도 범위가 넓어 지도 중심에서 가까운 곳만 표시했습니다. 지도를 확대하면 더 볼 수 있습니다.',
        )}
      </p>
    )
  }
  return null
}

function FacilityDetail({
  facility,
  onClose,
}: {
  facility: FacilityItem
  onClose: () => void
}) {
  const { t } = useLanguage()
  const ref = useRef<HTMLElement>(null)

  // 목록 아래쪽에서 골라도 상세가 보이도록 스크롤한다.
  useEffect(() => {
    ref.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [facility.id])

  return (
    <section
      ref={ref}
      className="nearby-facility-detail"
      aria-labelledby="nearby-facility-detail-title"
    >
      <div className="nearby-facility-detail-header">
        <div>
          <h3 id="nearby-facility-detail-title">{facility.name}</h3>
          <p className="nearby-facility-meta">
            {t(facility.category)} ·{' '}
            {t('캠퍼스에서 직선 {distance}', {
              distance: formatDistance(distanceFromCampus(facility)),
            })}
          </p>
        </div>
        <button
          type="button"
          className="nearby-facility-close"
          onClick={onClose}
          aria-label={t('상세 닫기')}
        >
          ×
        </button>
      </div>

      <dl className="nearby-facility-fields">
        <dt>{t('주소')}</dt>
        <dd>{facility.roadAddress}</dd>

        <dt>{t('운영시간')}</dt>
        <dd>
          {facility.hours ? (
            <OpeningHoursList hours={facility.hours} />
          ) : (
            t('카카오맵에서 확인해 주세요.')
          )}
        </dd>

        <dt>{t('연락처')}</dt>
        <dd>
          {facility.phone ? (
            <a href={telephoneHref(facility.phone)}>{facility.phone}</a>
          ) : (
            t('정보 없음')
          )}
        </dd>
      </dl>

      <a
        className="nearby-facility-source-link"
        href={kakaoPlaceUrl(facility)}
        target="_blank"
        rel="noreferrer"
      >
        {t('카카오맵에서 보기')}
      </a>
    </section>
  )
}

function OpeningHoursList({ hours }: { hours: FacilityHours }) {
  const { t } = useLanguage()
  const groups = groupWeeklyHours(hours.weekly)

  return (
    <ul className="nearby-facility-hours">
      {groups.map((group) => (
        <li key={group.start}>
          <span>
            {group.start === group.end
              ? t(WEEKDAY_LABELS[group.start])
              : t('{start}~{end}', {
                  start: t(WEEKDAY_LABELS[group.start]),
                  end: t(WEEKDAY_LABELS[group.end]),
                })}
          </span>
          <span>
            {group.time === undefined
              ? t('정보 없음')
              : (group.time ?? t('휴무'))}
          </span>
        </li>
      ))}
      {hours.breakTime && (
        <li>
          <span>{t('점심시간')}</span>
          <span>{hours.breakTime}</span>
        </li>
      )}
      {hours.emergency24h && (
        <li className="nearby-facility-hours-note">
          {t('응급실은 24시간 운영합니다.')}
        </li>
      )}
      {hours.mandatoryClosure && (
        <li className="nearby-facility-hours-note">
          {t('월 2회 의무휴업일이 있습니다. 방문 전 확인해 주세요.')}
        </li>
      )}
    </ul>
  )
}

type LiveStatus = 'idle' | 'loading' | 'ready' | 'error'

interface LiveResult {
  key: string
  status: 'ready' | 'error'
  facilities: FacilityItem[]
  truncated: boolean
}

const NO_FACILITIES: FacilityItem[] = []

// 지도 범위가 바뀔 때마다 카카오 장소 검색으로 그 범위의 시설을 찾는다.
// view가 null이면 검색하지 않는다. 같은 범위·필터는 다시 검색하지 않으므로,
// 실패했을 때는 retry로 같은 범위를 다시 검색한다.
function useLiveFacilities(view: MapView | null, filter: FacilityFilter) {
  const [result, setResult] = useState<LiveResult | null>(null)
  const [attempt, setAttempt] = useState(0)
  const key = view ? `${filter}|${view.key}|${attempt}` : null
  const retry = () => setAttempt((count) => count + 1)

  useEffect(() => {
    if (!view || key === null) return

    let cancelled = false
    const timer = window.setTimeout(() => {
      const types = filter === 'all' ? FACILITY_TYPES : [filter]
      Promise.all(types.map((type) => searchFacilityType(type, view)))
        .then((results) => {
          if (cancelled) return
          setResult({
            key,
            status: 'ready',
            facilities: uniqueById(results.flatMap((item) => item.facilities)),
            truncated: results.some((item) => item.truncated),
          })
        })
        .catch(() => {
          if (cancelled) return
          setResult({
            key,
            status: 'error',
            facilities: NO_FACILITIES,
            truncated: false,
          })
        })
    }, SEARCH_DELAY_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [key, view, filter])

  if (key === null) {
    return {
      status: 'idle' as LiveStatus,
      facilities: NO_FACILITIES,
      truncated: false,
      retry,
    }
  }
  // 새 범위를 찾는 동안에는 이전 결과를 그대로 보여준다.
  const loading = result?.key !== key
  return {
    status: (loading ? 'loading' : result.status) as LiveStatus,
    facilities: result?.facilities ?? NO_FACILITIES,
    truncated: loading ? false : result.truncated,
    retry,
  }
}

async function searchFacilityType(type: FacilityType, view: MapView) {
  const services = window.kakao?.maps.services
  if (!services) throw new Error('Kakao Places library is not loaded')

  const places: KakaoPlace[] = []
  let totalCount = 0
  let page = 1
  let hasNextPage = true
  while (hasNextPage && page <= MAX_PLACE_PAGES) {
    const result = await searchPlacesPage(
      services,
      KAKAO_CATEGORY_CODES[type],
      view,
      page,
    )
    places.push(...result.places)
    totalCount = result.totalCount
    hasNextPage = result.hasNextPage
    page += 1
  }

  return {
    facilities: places
      .map((place) => toFacilityItem(type, place))
      .filter((facility): facility is FacilityItem => facility !== null),
    // SDK는 totalCount도 45로 잘라서 주므로(REST API는 실제 개수), 45곳을
    // 꽉 채워 받았으면 범위 안에 더 있을 수 있다고 본다.
    truncated: totalCount >= PLACE_PAGE_SIZE * MAX_PLACE_PAGES,
  }
}

function searchPlacesPage(
  services: KakaoServices,
  code: string,
  view: MapView,
  page: number,
): Promise<{
  places: KakaoPlace[]
  totalCount: number
  hasNextPage: boolean
}> {
  return new Promise((resolve, reject) => {
    new services.Places().categorySearch(
      code,
      (places, status, pagination) => {
        if (status === services.Status.OK) {
          resolve({
            places,
            totalCount: pagination.totalCount,
            hasNextPage: pagination.hasNextPage,
          })
        } else if (status === services.Status.ZERO_RESULT) {
          resolve({ places: [], totalCount: 0, hasNextPage: false })
        } else {
          reject(new Error(`Kakao Places search failed: ${status}`))
        }
      },
      {
        bounds: view.bounds,
        // 범위 안에 45곳이 넘으면 지도 중심에서 가까운 곳부터 받는다.
        location: view.center,
        sort: services.SortBy.DISTANCE,
        page,
        size: PLACE_PAGE_SIZE,
      },
    )
  })
}

function NearbyFacilitiesMap({
  facilities,
  mode,
  selected,
  onSelect,
  onViewChange,
}: {
  facilities: FacilityItem[]
  mode: ViewMode
  selected: FacilityItem | null
  onSelect: (facility: FacilityItem) => void
  onViewChange: (view: MapView) => void
}) {
  const { t } = useLanguage()

  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<KakaoMap | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(() =>
    window.kakao?.maps ? 'loading' : 'error',
  )
  const markersRef = useRef(new Map<string, KakaoMarker>())
  const clustererRef = useRef<KakaoMarkerClusterer | null>(null)
  const onSelectRef = useRef(onSelect)
  const onViewChangeRef = useRef(onViewChange)
  const selectedId = selected?.id ?? null
  const selectedIdRef = useRef(selectedId)
  useEffect(() => {
    onSelectRef.current = onSelect
    onViewChangeRef.current = onViewChange
  }, [onSelect, onViewChange])

  useEffect(() => {
    const container = mapRef.current
    const maps = window.kakao?.maps

    if (!container || !maps) return

    let cancelled = false
    let detach = () => {}
    const timeout = window.setTimeout(() => {
      if (!cancelled) setStatus('error')
    }, 15000)

    const createMap = async () => {
      await new Promise<void>((resolve) => maps.load(resolve))
      if (cancelled) return

      const instance = new maps.Map(container, {
        // 한양대학교 ERICA캠퍼스 주변
        center: new maps.LatLng(
          ERICA_CAMPUS_CENTER.latitude,
          ERICA_CAMPUS_CENTER.longitude,
        ),
        level: 4,
      })
      // 지도 이동·확대가 끝날 때마다 현재 범위를 알린다.
      const reportView = () => {
        const bounds = instance.getBounds()
        onViewChangeRef.current({
          key: `${instance.getLevel()}:${bounds.toString()}`,
          bounds,
          center: instance.getCenter(),
        })
      }
      maps.event.addListener(instance, 'idle', reportView)
      detach = () => maps.event.removeListener(instance, 'idle', reportView)

      setMap(instance)
      window.clearTimeout(timeout)
      setStatus('ready')
    }

    void createMap().catch(() => {
      window.clearTimeout(timeout)
      if (!cancelled) setStatus('error')
    })

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
      detach()
      clustererRef.current = null
      setMap(null)
      container.replaceChildren()
    }
  }, [])

  // 표시할 시설이 바뀌면 마커를 다시 그린다. 주요 시설은 모든 마커가 보이게
  // 맞추고, 주변 전체는 사용자가 고른 지도 범위를 그대로 두고 마커를 묶는다.
  useEffect(() => {
    const maps = window.kakao?.maps
    if (!map || !maps) return

    let clusterer: KakaoMarkerClusterer | null = null
    if (mode === 'all' && maps.MarkerClusterer) {
      clustererRef.current ??= new maps.MarkerClusterer({
        map,
        averageCenter: true,
        minLevel: CLUSTER_MIN_LEVEL,
      })
      clusterer = clustererRef.current
    }

    const markers = markersRef.current
    const bounds = new maps.LatLngBounds()
    for (const facility of facilities) {
      const position = new maps.LatLng(facility.latitude, facility.longitude)
      const marker = new maps.Marker({
        position,
        map: clusterer ? undefined : map,
        title: facility.name,
        clickable: true,
      })
      maps.event.addListener(marker, 'click', () =>
        onSelectRef.current(facility),
      )
      if (facility.id === selectedIdRef.current) marker.setZIndex(1)
      markers.set(facility.id, marker)
      bounds.extend(position)
    }
    clusterer?.addMarkers([...markers.values()])
    if (mode === 'curated' && facilities.length > 0) map.setBounds(bounds)

    return () => {
      clusterer?.clear()
      for (const marker of markers.values()) marker.setMap(null)
      markers.clear()
    }
  }, [map, facilities, mode])

  // 선택한 마커를 앞으로 올린다.
  useEffect(() => {
    selectedIdRef.current = selectedId
    for (const [id, marker] of markersRef.current) {
      marker.setZIndex(id === selectedId ? 1 : 0)
    }
  }, [selectedId])

  // 시설을 고르면 지도를 그 위치로 옮긴다. 목록이 바뀔 때마다 다시 옮기지
  // 않도록 선택이 바뀔 때만 실행한다.
  const selectedLatitude = selected?.latitude
  const selectedLongitude = selected?.longitude
  useEffect(() => {
    const maps = window.kakao?.maps
    if (
      !map ||
      !maps ||
      selectedLatitude === undefined ||
      selectedLongitude === undefined
    ) {
      return
    }
    map.panTo(new maps.LatLng(selectedLatitude, selectedLongitude))
  }, [map, selectedId, selectedLatitude, selectedLongitude])

  return (
    <div className="life-guide-map-wrap" aria-busy={status === 'loading'}>
      <div
        ref={mapRef}
        className="life-guide-map"
        role="region"
        aria-label={t('한양대학교 ERICA 주변 지도')}
      />
      {status === 'loading' && (
        <div className="life-guide-map-message" role="status">
          {t('지도를 불러오고 있습니다…')}
        </div>
      )}
      {status === 'error' && (
        <div className="life-guide-map-message" role="alert">
          <p>
            {t('지도를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.')}
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            {t('새로고침')}
          </button>
        </div>
      )}
    </div>
  )
}

function formatDistance(meters: number): string {
  return meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`
}
