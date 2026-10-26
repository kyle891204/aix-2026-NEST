import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/auth-context'

export function WelcomePage() {
  const { session } = useAuth()
  return (
    <>
      <section className="page-intro">
        <p className="eyebrow">WELCOME TO NEST</p>
        <h1>반가워요. NEST에 오신 것을 환영해요.</h1>
        <p>{session?.user?.email} 계정으로 로그인했어요.</p>
      </section>
      <section className="status-card">
        <h2>학교와 생활을 한곳에서</h2>
        <p>나에게 필요한 학교 공지와 캠퍼스 생활을 차근차근 연결해요.</p>
        <p>
          <Link to="/profile">내 로그인 정보 확인하기 →</Link>
        </p>
      </section>
      <p className="development-note">
        공지·커뮤니티·프로필 설정은 준비 중입니다. 발표용 공통 계정의 LMS 조회는
        하단 LMS 메뉴에서 별도 데모 암호를 입력해 확인할 수 있어요.
      </p>
    </>
  )
}
