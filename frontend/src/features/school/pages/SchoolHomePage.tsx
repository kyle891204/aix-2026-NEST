import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDemoProfile } from '../../profile/demo-profile-context'
import { profileDetails } from '../../profile/profile-display'
import { DashboardNotices } from '../../dashboard/DashboardNotices'
import '../school.css'

export function SchoolHomePage() {
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
              {profile ? `${profile.nickname}님, 안녕하세요!` : '안녕하세요!'}
            </strong>
            <span className="dashboard-description">
              학교·학과 등 내 정보 {isProfileOpen ? '접기' : '펼치기'}
            </span>
          </span>

          <span aria-hidden="true">{isProfileOpen ? '⌃' : '⌄'}</span>
        </button>

        {isProfileOpen ? (
          <div id="dashboard-profile-details">
            <dl className="profile-details">
              {profileDetails(profile).map(({ label, value }) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>

            <Link to="/profile">개인정보 수정 →</Link>
          </div>
        ) : (
          <p className="dashboard-description">
            개인정보는 펼치면 확인할 수 있어요.
          </p>
        )}
      </section>

      <DashboardNotices profile={profile} />
    </div>
  )
}
