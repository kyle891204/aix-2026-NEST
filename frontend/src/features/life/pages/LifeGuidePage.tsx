import { useLanguage } from '../../../shared/i18n/language-context'
import { useState } from 'react'
import { EmergencyContacts } from '../components/EmergencyContacts'
import { NearbyFacilities } from '../components/NearbyFacilities'
import '../life.css'

export function LifeGuidePage() {
  const { t } = useLanguage()

  const [selectedTab, setSelectedTab] = useState<
    'facilities' | 'emergency' | null
  >(null)

  return (
    <section className="life-guide">
      <h1>{t('생활안내')}</h1>

      <div
        className="life-guide-options"
        role="group"
        aria-label={t('생활안내 선택')}
      >
        <button
          type="button"
          aria-pressed={selectedTab === 'facilities'}
          onClick={() => setSelectedTab('facilities')}
        >
          {t('주변 편의시설 안내')}
        </button>
        <button
          type="button"
          className="life-guide-emergency-button"
          aria-pressed={selectedTab === 'emergency'}
          onClick={() => setSelectedTab('emergency')}
        >
          {t('긴급연락처')}
        </button>
      </div>

      {selectedTab === 'facilities' && (
        <section aria-labelledby="facilities-title">
          <h2 id="facilities-title">{t('주변 편의시설 안내')}</h2>
          <NearbyFacilities />
        </section>
      )}

      {selectedTab === 'emergency' && (
        <section aria-labelledby="emergency-title">
          <h2 id="emergency-title">{t('긴급연락처')}</h2>
          <EmergencyContacts />
        </section>
      )}
    </section>
  )
}
