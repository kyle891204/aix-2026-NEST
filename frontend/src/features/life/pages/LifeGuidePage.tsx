import { useRef } from 'react'

export function LifeGuidePage() {
  const mapRef = useRef<HTMLDivElement>(null)

  return (
    <section>
      <h1>생활안내</h1>

      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '400px',
          background: '#f5f5f5',
        }}
      />
    </section>
  )
}
