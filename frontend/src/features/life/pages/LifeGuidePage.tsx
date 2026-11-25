import { useLanguage } from '../../../shared/i18n/language-context'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { EmergencyContacts } from '../components/EmergencyContacts'
import { NearbyFacilities } from '../components/NearbyFacilities'
import '../life.css'

type GuideTab = 'facilities' | 'emergency'

// 열 탭은 방문 기록의 state에 둔다. LIFE 홈의 링크도 이 값으로 탭을 넘긴다.
function tabFromState(state: unknown): GuideTab | null {
  const tab = (state as { tab?: unknown } | null)?.tab
  return tab === 'facilities' || tab === 'emergency' ? tab : null
}

export function LifeGuidePage() {
  const { t } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  const { pathname, search, hash } = location

  const historyTab = tabFromState(location.state)
  // 이 화면에서 마지막으로 보던 탭. 하단 '생활안내'를 다시 눌러 state 없는
  // 기록이 생겨도 보던 탭을 유지하는 데 쓴다.
  const [lastTab, setLastTab] = useState(historyTab)
  if (historyTab !== null && historyTab !== lastTab) {
    setLastTab(historyTab)
  }
  const selectedTab = historyTab ?? lastTab

  // 화면에 보이는 탭이 방문 기록에 없으면 기록에 채워 새로고침 후에도 같은 탭을 연다.
  useEffect(() => {
    if (historyTab === null && lastTab !== null) {
      navigate(
        { pathname, search, hash },
        { replace: true, state: { tab: lastTab } },
      )
    }
  }, [historyTab, lastTab, navigate, pathname, search, hash])

  const selectTab = (tab: GuideTab) => {
    navigate({ pathname, search, hash }, { replace: true, state: { tab } })
  }

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
          onClick={() => selectTab('facilities')}
        >
          {t('주변 편의시설 안내')}
        </button>
        <button
          type="button"
          className="life-guide-emergency-button"
          aria-pressed={selectedTab === 'emergency'}
          onClick={() => selectTab('emergency')}
        >
          {t('긴급 연락처')}
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
          <h2 id="emergency-title">{t('긴급 연락처')}</h2>
          <EmergencyContacts />
        </section>
      )}
    </section>
  )
}
