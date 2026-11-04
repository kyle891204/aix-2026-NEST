import { Link } from 'react-router-dom'
import '../../notices/notices.css'

export function EntryExitPage() {
  return (
    <div className="notice-page">
      <h1>입국·출국 준비</h1>

      <section className="notice-card">
        <strong>한국 입국을 준비하나요?</strong>
        <span className="notice-hint">
          준비 서류 · 입국일 · 숙소 · 학교 안내
        </span>
        <Link className="notice-primary notice-link-button" to="entry">
          입국 준비 보기
        </Link>
      </section>

      <section className="notice-card">
        <strong>한국 출국을 준비하나요?</strong>
        <span className="notice-hint">
          출국일 · 학적·숙소 정리 · 학교 확인사항
        </span>
        <Link className="notice-primary notice-link-button" to="exit">
          출국 준비 보기
        </Link>
      </section>
    </div>
  )
}
