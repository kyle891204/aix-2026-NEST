import { useLanguage } from '../../../shared/i18n/language-context'
import { LANGUAGE_NAMES } from '../../../shared/i18n/language'
import { Link } from 'react-router-dom'
import '../life.css'

const boards = [
  {
    title: '자유게시판',
    to: '/life/free',
    description: '일상·정보·경험 나누기',
  },
  {
    title: '장터게시판',
    to: '/life/market',
    description: '중고 물품 판매·구매 글',
  },
  {
    title: '질문게시판',
    to: '/life/questions',
    description: '학교생활 질문과 답변',
  },
]

export function LifeHomePage() {
  const { t, language } = useLanguage()

  return (
    <div className="life-home">
      <h1>LIFE</h1>

      <section className="dashboard-card translation-card">
        <h2>
          {t('현재 표시 언어: {language}', {
            language: LANGUAGE_NAMES[language],
          })}
        </h2>
        <p>{t('글·답글을 선호 언어로 번역합니다.')}</p>
      </section>

      <section className="dashboard-card life-links">
        {boards.map((board) => (
          <Link key={board.title} className="life-menu-row" to={board.to}>
            <span>
              <strong>{t(board.title)}</strong>
              <span className="dashboard-description">
                {t(board.description)}
              </span>
            </span>
            <span aria-hidden="true">›</span>
          </Link>
        ))}
      </section>

      <section className="dashboard-card life-links">
        <div className="life-menu-row">
          <span>
            <strong>{t('병원·마트 등 편의시설')}</strong>
            <span className="dashboard-description">
              {t('캠퍼스·지역별 지도와 위치 안내')}
            </span>
          </span>
        </div>

        <div className="life-menu-row">
          <span>
            <strong>{t('긴급 연락처')}</strong>
            <span className="dashboard-description">
              {t('경찰·소방·구급·자국 대사관')}
            </span>
          </span>
        </div>
      </section>
    </div>
  )
}
