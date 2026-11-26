import { LanguageProvider } from '../shared/i18n/LanguageProvider'
import type { ReactNode } from 'react'
import { useLanguage } from '../shared/i18n/language-context'
import {
  QuestionLayout,
  QuestionListPage,
  QuestionDetailPage,
  QuestionFormPage,
} from '../features/questions/pages/QuestionPages'
import {
  MarketLayout,
  MarketListPage,
  MarketDetailPage,
  MarketFormPage,
} from '../features/market/pages/MarketPages'
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
import { LoginPage } from '../features/auth/pages/LoginPage'
import { LmsTestPage } from '../features/lms-test/pages/LmsTestPage'
import { CommunityPage } from '../features/community/pages/CommunityPage'
import { ChecklistPage } from '../features/immigration/pages/ChecklistPage'
import { EntryExitPage } from '../features/immigration/pages/EntryExitPage'
import { NoticeListPage } from '../features/notices/pages/NoticeListPage'
import { NoticeDetailPage } from '../features/notices/pages/NoticeDetailPage'
import { CourseItemPage } from '../features/courses/pages/CourseItemPage'
import { CourseNoticesPage } from '../features/courses/pages/CourseNoticesPage'
import { CourseOverviewPage } from '../features/courses/pages/CourseOverviewPage'
import { AcademicSchedulePage } from '../features/schedule/pages/AcademicSchedulePage'
import { ProfilePage } from '../features/profile/pages/ProfilePage'
import { DemoProfileProvider } from '../features/profile/DemoProfileProvider'
import { useDemoProfile } from '../features/profile/demo-profile-context'
import { EmptyState } from '../shared/ui/EmptyState'
import { SignupPage } from '../features/auth/pages/SignupPage'
import { SchoolHomePage } from '../features/school/pages/SchoolHomePage'
import { LifeHomePage } from '../features/life/pages/LifeHomePage'
import { LifeGuidePage } from '../features/life/pages/LifeGuidePage'
import {
  FreeBoardLayout,
  FreeBoardListPage,
  FreeBoardDetailPage,
  FreeBoardFormPage,
} from '../features/free-board/pages/FreeBoardPages'
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
              <Route path="/course-notices" element={<CourseOverviewPage />} />
              <Route
                path="/course-notices/:courseId"
                element={<CourseNoticesPage />}
              />
              <Route
                path="/course-notices/:courseId/:itemId"
                element={<CourseItemPage />}
              />
              <Route path="/schedule" element={<AcademicSchedulePage />} />
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
          NEST
        </NavLink>
        <NavLink className="account-link" to="/profile">
          {t('내 계정')}
        </NavLink>
      </header>
      <div className="mode-switch" role="group" aria-label={t('서비스 영역')}>
        <NavLink
          to="/"
          end
          className={() => (isLife ? '' : 'active')}
          aria-label={t('학교')}
          title={t('학교')}
        >
          <ModeIcon mode="school" />
        </NavLink>

        <NavLink
          to="/life"
          className={() => (isLife ? 'active' : '')}
          aria-label={t('생활')}
          title={t('생활')}
        >
          <ModeIcon mode="life" />
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
            <span className="nav-icon" aria-hidden="true">
              <NavIcon to={menu.to} />
            </span>
            <span className="nav-label">{t(menu.label)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function ModeIcon({ mode }: { mode: 'school' | 'life' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {mode === 'school' ? (
        <>
          <path d="M3 10.5 12 4l9 6.5V20H3v-9.5Z" />
          <path d="M9 20v-7h6v7M7 10h.01M17 10h.01" />
        </>
      ) : (
        <>
          <circle cx="13.5" cy="4.5" r="1.5" />
          <path d="m12.5 8-2 4 3 2 1.5 6m-2.5-12 3 3 2.5 1M10.5 12 7 20m3.5-8L7 10" />
        </>
      )}
    </svg>
  )
}

function NavIcon({ to }: { to: string }) {
  const icons: Record<string, ReactNode> = {
    '/': (
      <>
        <path d="m2 9 8-6 8 6v9H2V9Z" />
        <path d="M7 18v-6h6v6" />
      </>
    ),
    '/entry-exit': (
      <>
        <path d="M3 4h14v14H3z" />
        <path d="M10 8v7m-3-3 3 3 3-3" />
      </>
    ),
    '/notices': (
      <>
        <path d="M5 14V9a5 5 0 0 1 10 0v5l2 2H3l2-2Z" />
        <path d="M8 18a2 2 0 0 0 4 0" />
      </>
    ),
    '/course-notices': (
      <>
        <path d="M3 4h6a3 3 0 0 1 3 3v11H6a3 3 0 0 0-3 1V4Zm14 0h-2a3 3 0 0 0-3 3v11h3a3 3 0 0 1 3 1V4Z" />
      </>
    ),
    '/schedule': (
      <>
        <rect x="2" y="4" width="16" height="14" rx="2" />
        <path d="M2 8h16M6 2v4m8-4v4" />
      </>
    ),
    '/life': (
      <>
        <path d="M3 9.5 10 3l7 6.5V18H3V9.5Z" />
        <path d="M7 13h6m-3-3v6" />
      </>
    ),
    '/life/free': (
      <>
        <path d="M3 4h14v10H9l-5 4v-4H3V4Z" />
        <path d="M7 8h6m-6 3h4" />
      </>
    ),
    '/life/market': (
      <>
        <path d="M3 7h14l-1 11H4L3 7Zm3 0V6a4 4 0 0 1 8 0v1" />
      </>
    ),
    '/life/questions': (
      <>
        <circle cx="10" cy="10" r="8" />
        <path d="M7.5 7.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 1-1 2.2M10 15.5h.01" />
      </>
    ),
    '/life/guide': (
      <>
        <path d="M10 19s6-6.1 6-11A6 6 0 0 0 4 8c0 4.9 6 11 6 11Z" />
        <circle cx="10" cy="8" r="2" />
      </>
    ),
  }

  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      {icons[to]}
    </svg>
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
