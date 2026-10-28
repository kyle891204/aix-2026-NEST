import { useEffect, useRef, useState } from 'react'
import '../life.css'

// 카카오 지도 API의 타입을 TypeScript에 알려줘.
declare global {
  interface Window {
    kakao?: {
      maps: {
        load: (callback: () => void) => void
        LatLng: new (latitude: number, longitude: number) => object
        Map: new (
          container: HTMLElement,
          options: { center: object; level: number },
        ) => object
      }
    }
  }
}

export function LifeGuidePage() {
  const [selectedTab, setSelectedTab] = useState<
    'facilities' | 'emergency' | null
  >(null)

  return (
    <section className="life-guide">
      <h1>생활안내</h1>

      <div
        className="life-guide-options"
        role="group"
        aria-label="생활안내 선택"
      >
        <button
          type="button"
          aria-pressed={selectedTab === 'facilities'}
          onClick={() => setSelectedTab('facilities')}
        >
          주변 편의시설 안내
        </button>
        <button
          type="button"
          aria-pressed={selectedTab === 'emergency'}
          onClick={() => setSelectedTab('emergency')}
        >
          긴급연락처
        </button>
      </div>

      {selectedTab === 'facilities' && (
        <section aria-labelledby="facilities-title">
          <h2 id="facilities-title">주변 편의시설 안내</h2>
          <NearbyFacilitiesMap />
        </section>
      )}

      {selectedTab === 'emergency' && (
        <section aria-labelledby="emergency-title">
          <h2 id="emergency-title">긴급연락처</h2>
          <p>연락처 안내를 준비 중입니다.</p>
        </section>
      )}
    </section>
  )
}

function NearbyFacilitiesMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(() =>
    window.kakao?.maps ? 'loading' : 'error',
  )

  useEffect(() => {
    const container = mapRef.current
    const maps = window.kakao?.maps

    if (!container || !maps) return

    let cancelled = false
    const timeout = window.setTimeout(() => {
      if (!cancelled) setStatus('error')
    }, 15000)

    const createMap = async () => {
      await new Promise<void>((resolve) => maps.load(resolve))
      if (cancelled) return

      new maps.Map(container, {
        // 한양대학교 서울캠퍼스 주변
        center: new maps.LatLng(37.5572, 127.0453),
        level: 4,
      })
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
      container.replaceChildren()
    }
  }, [])

  return (
    <div className="life-guide-map-wrap" aria-busy={status === 'loading'}>
      <div
        ref={mapRef}
        className="life-guide-map"
        role="region"
        aria-label="한양대학교 서울캠퍼스 주변 지도"
      />
      {status === 'loading' && (
        <div className="life-guide-map-message" role="status">
          지도를 불러오고 있습니다…
        </div>
      )}
      {status === 'error' && (
        <div className="life-guide-map-message" role="alert">
          <p>지도를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.</p>
          <button type="button" onClick={() => window.location.reload()}>
            새로고침
          </button>
        </div>
      )}
    </div>
  )
}
