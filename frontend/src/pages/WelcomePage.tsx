import { BackendStatus } from '../shared/ui/BackendStatus'

export function WelcomePage() {
  return (
    <>
      <section className="page-intro">
        <h1>프로젝트 시작</h1>
        <p>모바일 웹 개발용 최소 화면입니다. UI 디자인은 추후 변경합니다.</p>
      </section>
      <BackendStatus />
      <p className="development-note">
        현재 동작하는 기능은 화면 이동·서버 연결 확인·LMS 조회 테스트입니다.
        공지·커뮤니티·프로필 기능은 각 폴더에서 구현하세요.
      </p>
    </>
  )
}
