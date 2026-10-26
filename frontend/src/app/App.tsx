import {
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { AuthProvider } from '../features/auth/AuthProvider'
import { useAuth } from '../features/auth/auth-context'
import { LoginPage } from '../features/auth/LoginPage'
import { LmsTestPage } from '../features/lms-test/LmsTestPage'
import { CommunityPage } from '../features/community/pages/CommunityPage'
import { NoticePage } from '../features/notices/pages/NoticePage'
import { ProfilePage } from '../features/profile/pages/ProfilePage'
import { WelcomePage } from '../pages/WelcomePage'
import { EmptyState } from '../shared/ui/EmptyState'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedApp />}>
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
        </Route>
      </Routes>
    </AuthProvider>
  )
}

function ProtectedApp() {
  const { session, loading, error, reload } = useAuth()
  const location = useLocation()
  if (!session?.user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search + location.hash }}
        replace
      />
    )
  }
  if (loading || error) {
    return (
      <div className="app-shell">
        <section className="page-intro" aria-live="polite">
          <h1>NEST</h1>
          <p>{loading ? '로그인 정보를 확인하고 있습니다…' : error}</p>
          {loading && <p>첫 접속은 약 1분이 걸릴 수 있어요.</p>}
          {!loading && <button onClick={() => void reload()}>다시 시도</button>}
        </section>
      </div>
    )
  }
  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink className="brand" to="/">
          NEST <span>캠퍼스 생활의 시작</span>
        </NavLink>
        <nav aria-label="주 메뉴">
          <NavLink to="/" end>
            홈
          </NavLink>
          <NavLink to="/notices">공지</NavLink>
          <NavLink to="/community">커뮤니티</NavLink>
          <NavLink to="/profile">프로필</NavLink>
          <NavLink to="/lms-test">LMS</NavLink>
        </nav>
      </header>
      <main id="main-content">
        <Outlet />
      </main>
      <footer>외국인 유학생을 위한 학사·생활 지원 서비스</footer>
    </div>
  )
}
