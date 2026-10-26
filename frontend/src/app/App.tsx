import { NavLink, Route, Routes } from 'react-router-dom'
import { LmsTestPage } from '../features/lms-test/LmsTestPage'
import { CommunityPage } from '../features/community/pages/CommunityPage'
import { NoticePage } from '../features/notices/pages/NoticePage'
import { ProfilePage } from '../features/profile/pages/ProfilePage'
import { WelcomePage } from '../pages/WelcomePage'
import { EmptyState } from '../shared/ui/EmptyState'

export default function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink className="brand" to="/">
          TEAM 03 <span>초기 프로젝트</span>
        </NavLink>
        <nav aria-label="주 메뉴">
          <NavLink to="/" end>
            시작
          </NavLink>
          <NavLink to="/notices">공지</NavLink>
          <NavLink to="/community">커뮤니티</NavLink>
          <NavLink to="/profile">프로필</NavLink>
          <NavLink to="/lms-test">LMS</NavLink>
        </nav>
      </header>
      <main id="main-content">
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/notices" element={<NoticePage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/lms-test" element={<LmsTestPage />} />
          <Route
            path="*"
            element={
              <EmptyState
                title="페이지를 찾을 수 없습니다"
                description="하단 메뉴에서 이동해 주세요."
              />
            }
          />
        </Routes>
      </main>
      <footer>
        외국인 유학생을 위한 학사·생활 지원 서비스 · 프로젝트 시작 버전
      </footer>
    </div>
  )
}
