// 공지는 학교 홈페이지에서 읽어 오므로 첫 조회가 느릴 수 있어, 화면 가운데에 진행 중임을 보여준다.
export function NoticeLoading() {
  return (
    <div className="notice-loading" role="status" aria-live="polite">
      <span className="notice-spinner" aria-hidden="true" />
      <strong>공지를 가져오는 중입니다</strong>
      <span className="notice-hint">
        학교 홈페이지에서 읽어 오느라 처음에는 10초 정도 걸릴 수 있어요.
      </span>
    </div>
  )
}
