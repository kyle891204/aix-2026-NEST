import { LanguageProvider } from '../shared/i18n/LanguageProvider'
import { useLanguage } from '../shared/i18n/language-context'
import {
  QuestionLayout,
  QuestionListPage,
  QuestionDetailPage,
  QuestionFormPage,
} from '../features/questions/QuestionPages'
import {
  MarketLayout,
  MarketListPage,
  MarketDetailPage,
  MarketFormPage,
} from '../features/market/MarketPages'
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
import { ChecklistPage } from '../features/immigration/pages/ChecklistPage'
import { EntryExitPage } from '../features/immigration/pages/EntryExitPage'
import { NoticeListPage } from '../features/notices/pages/NoticeListPage'
import { NoticeDetailPage } from '../features/notices/pages/NoticeDetailPage'
import { CourseNoticesPage } from '../features/courses/CourseNoticesPage'
import { ProfilePage } from '../features/profile/pages/ProfilePage'
import { DemoProfileProvider } from '../features/profile/DemoProfileProvider'
import { useDemoProfile } from '../features/profile/demo-profile-context'
import { EmptyState } from '../shared/ui/EmptyState'
import { SignupPage } from '../features/auth/SignupPage.tsx'
import { SchoolHomePage } from '../features/school/pages/SchoolHomePage.tsx'
import { LifeHomePage } from '../features/life/pages/LifeHomePage'
import { LifeGuidePage } from '../features/life/pages/LifeGuidePage'
import {
  FreeBoardLayout,
  FreeBoardListPage,
  FreeBoardDetailPage,
  FreeBoardFormPage,
} from '../features/free-board/FreeBoardPages'
import './home.css'

// 토글로 전환할떄마다 하단 메뉴도 바뀌게
const schoolMenus = [
  { label: '대시보드', to: '/' },
  { label: '입출국', to: '/entry-exit' },
  { label: '전체공지', to: '/notices' },
  { label: '과목알림', to: '/course-notices' },
  { label: '학사일정', to: '/schedule' },
]

const lifeMenus = [
  { label: 'LIFE 홈', to: '/life' },
  { label: '자유', to: '/life/free' },
  { label: '장터', to: '/life/market' },
  { label: '질문', to: '/life/questions' },
  { label: '생활안내', to: '/life/guide' },
]

export default function App() {
  return (
    <AuthProvider>
      <DemoProfileProvider>
        <LanguageProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup/consent" element={<SignupPage />} />

            <Route element={<ProtectedApp />}>
              <Route path="/" element={<SchoolHomePage />} />
              <Route path="/life" element={<LifeHomePage />} />
              <Route path="/life/guide" element={<LifeGuidePage />} />
              <Route path="/life/free" element={<FreeBoardLayout />}>
                <Route index element={<FreeBoardListPage />} />
                <Route path="new" element={<FreeBoardFormPage />} />
                <Route path=":postId" element={<FreeBoardDetailPage />} />
                <Route path=":postId/edit" element={<FreeBoardFormPage />} />
              </Route>
              <Route path="/life/market" element={<MarketLayout />}>
                <Route index element={<MarketListPage />} />
                <Route path="new" element={<MarketFormPage />} />
                <Route path=":postId" element={<MarketDetailPage />} />
                <Route path=":postId/edit" element={<MarketFormPage />} />
              </Route>
              <Route path="/life/questions" element={<QuestionLayout />}>
                <Route index element={<QuestionListPage />} />
                <Route path="new" element={<QuestionFormPage />} />
                <Route path=":postId" element={<QuestionDetailPage />} />
                <Route path=":postId/edit" element={<QuestionFormPage />} />
              </Route>
              <Route path="/entry-exit" element={<EntryExitPage />} />
              <Route
                path="/entry-exit/entry"
                element={<ChecklistPage key="entry" direction="entry" />}
              />
              <Route
                path="/entry-exit/exit"
                element={<ChecklistPage key="exit" direction="exit" />}
              />
              <Route path="/notices" element={<NoticeListPage />} />
              <Route path="/notices/:noticeId" element={<NoticeDetailPage />} />
              <Route path="/course-notices" element={<CourseNoticesPage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/lms-test" element={<LmsTestPage />} />
              <Route
                path="*"
                element={
                  <LocalizedEmptyState
                    title="페이지를 찾을 수 없습니다"
                    description="하단 메뉴에서 이동해 주세요."
                  />
                }
              />
            </Route>
            <Route
              path="/schedule"
              element={
                <LocalizedEmptyState
                  title="학사일정"
                  description="준비 중인 화면입니다."
                />
              }
            />

            <Route
              path="/life/*"
              element={
                <LocalizedEmptyState
                  title="LIFE"
                  description="준비 중인 화면입니다."
                />
              }
            />
          </Routes>
        </LanguageProvider>
      </DemoProfileProvider>
    </AuthProvider>
  )
}

function ProtectedApp() {
  const { t } = useLanguage()

  const { session, loading, error, reload } = useAuth()
  const { savedProfile } = useDemoProfile()
  const location = useLocation()

  const isLife =
    location.pathname === '/life' || location.pathname.startsWith('/life/')

  const menus = isLife ? lifeMenus : schoolMenus

  // 개발 모드, 또는 시연용 게스트 모드(VITE_DEMO_GUEST=true)에서는 로그인 없이 화면을 볼 수 있다
  const isHomePreview =
    (import.meta.env.DEV || import.meta.env.VITE_DEMO_GUEST === 'true') &&
    !session?.user &&
    ([...schoolMenus, ...lifeMenus].some(
      (menu) => menu.to === location.pathname,
    ) ||
      location.pathname.startsWith('/life/free/') ||
      location.pathname.startsWith('/life/market/') ||
      location.pathname.startsWith('/life/questions/'))
  if (!isHomePreview && (loading || error)) {
    return (
      <div className="app-shell">
        <section className="page-intro" aria-live="polite">
          <h1>NEST</h1>
          <p>
            {loading ? t('로그인 정보를 확인하고 있습니다…') : t(error ?? '')}
          </p>
          {loading && <p>{t('첫 접속은 약 1분이 걸릴 수 있어요.')}</p>}
          {!loading && (
            <button onClick={() => void reload()}>{t('다시 시도')}</button>
          )}
        </section>
      </div>
    )
  }
  const from = location.pathname + location.search + location.hash
  if (!isHomePreview && !session?.user) {
    return <Navigate to="/login" state={{ from }} replace />
  }
  if (!isHomePreview && !savedProfile) {
    return <Navigate to="/signup/consent" state={{ from }} replace />
  }
  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink className="brand" to="/">
          NEST <span>{t('캠퍼스 생활의 시작')}</span>
        </NavLink>
        <NavLink className="account-link" to="/profile">
          {t('내 계정')}
        </NavLink>
      </header>
      <div className="mode-switch" role="group" aria-label={t('서비스 영역')}>
        <NavLink to="/" end className={() => (isLife ? '' : 'active')}>
          SCHOOL
        </NavLink>

        <NavLink to="/life" className={() => (isLife ? 'active' : '')}>
          LIFE
        </NavLink>
      </div>

      <main id="main-content">
        <Outlet />
      </main>
      <nav
        className={`bottom-nav ${
          isLife ? 'bottom-nav--life' : 'bottom-nav--school'
        }`}
        aria-label={isLife ? t('LIFE 메뉴') : t('SCHOOL 메뉴')}
      >
        {menus.map((menu) => (
          <NavLink
            key={menu.to}
            to={menu.to}
            end={menu.to === '/' || menu.to === '/life'}
          >
            {t(menu.label)}
          </NavLink>
        ))}
      </nav>
      <footer>{t('외국인 유학생을 위한 학사·생활 지원 서비스')}</footer>
    </div>
  )
}

function LocalizedEmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  const { t } = useLanguage()
  return <EmptyState title={t(title)} description={t(description)} />
}
