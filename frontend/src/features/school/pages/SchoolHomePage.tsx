import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../school.css'

export function SchoolHomePage() {
  const [isProfileOpen, setIsProfileOpen] = useState(false)

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
          <span>
            <strong>안녕하세요!</strong>
            <span className="dashboard-description">
              학과·학번 등 내 정보 {isProfileOpen ? '접기' : '펼치기'}
            </span>
          </span>

          <span aria-hidden="true">{isProfileOpen ? '⌃' : '⌄'}</span>
        </button>

        {isProfileOpen ? (
          <div id="dashboard-profile-details">
            <dl className="profile-details">
              <div>
                <dt>학과</dt>
                <dd>학과 미입력</dd>
              </div>
              <div>
                <dt>학번</dt>
                <dd>학번 미입력</dd>
              </div>
              <div>
                <dt>과정·학년</dt>
                <dd>미입력</dd>
              </div>
              <div>
                <dt>국적·비자</dt>
                <dd>미입력</dd>
              </div>
              <div>
                <dt>선호 언어</dt>
                <dd>미입력</dd>
              </div>
            </dl>

            <Link to="/profile">개인정보 수정 →</Link>
          </div>
        ) : (
          <p className="dashboard-description">
            개인정보는 펼치면 확인할 수 있어요.
          </p>
        )}
      </section>

      <section className="school-notices">
        <div className="home-section-heading">
          <h2>나에게 해당하는 공지</h2>
          <Link to="/notices">모두 보기 ›</Link>
        </div>

        <article className="home-card">
          <div className="notice-badges">
            <span>해당</span>
            <span>학교</span>
          </div>

          <h3>외국인 학부생 체류 서류 제출 안내</h3>
          <p className="home-description">
            D-2 비자 · 학부 재학생 조건과 일치
          </p>
          <p>2026.10.28 17:00 · KST</p>
        </article>

        <p className="dashboard-description">
          검토용 예시 · 실제 학교·LMS 데이터는 연결 전
        </p>
      </section>
    </div>
  )
}
