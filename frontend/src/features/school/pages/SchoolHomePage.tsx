import { useLanguage } from '../../../shared/i18n/language-context'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDemoProfile } from '../../profile/demo-profile-context'
import { profileDetails } from '../../profile/profile-display'
import { DashboardNotices } from '../../dashboard/DashboardNotices'
import '../school.css'

export function SchoolHomePage() {
  const { t, language } = useLanguage()

  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const { savedProfile } = useDemoProfile()
  const profile = savedProfile?.profile ?? null

  return (
    <div className="school-home">
      <section className="dashboard-card">
        <button
          type="button"
          className="profile-toggle"
          aria-expanded={isProfileOpen}
          aria-controls="dashboard-profile-details"
          onClick={() => setIsProfileOpen((previous) => !previous)}
        >
          <span className="profile-summary">
            <strong>
              {profile
                ? t('{name}님, 안녕하세요!', { name: profile.nickname })
                : t('안녕하세요!')}
            </strong>
            <span className="dashboard-description">
              {t('학교·학과 등 내 정보')}{' '}
              {isProfileOpen ? t('접기') : t('펼치기')}
            </span>
          </span>

          <span aria-hidden="true">{isProfileOpen ? '⌃' : '⌄'}</span>
        </button>

        {isProfileOpen ? (
          <div id="dashboard-profile-details">
            <dl className="profile-details">
              {profileDetails(profile, language).map(({ label, value }) => (
                <div key={label}>
                  <dt>{t(label)}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>

            <Link to="/profile">{t('개인정보 수정 →')}</Link>
          </div>
        ) : (
          <p className="dashboard-description">
            {t('개인정보는 펼치면 확인할 수 있어요.')}
          </p>
        )}
      </section>

      <DashboardNotices profile={profile} />
    </div>
  )
}
