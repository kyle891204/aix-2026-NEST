import { useLanguage } from '../../../shared/i18n/language-context'
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
  const { t } = useLanguage()

  return (
    <div className="life-home">
      <h1>LIFE</h1>
      <p className="dashboard-description">
        {t('내 언어로 이야기하고, 함께 학교생활해요.')}
      </p>

      <section className="dashboard-card translation-card">
        <h2>{t('글·답글 자동 번역')}</h2>
        <p>
          {t(
            '작성자의 원문을 보존하고, 읽는 사람의 선호 언어로 자동 번역합니다.',
          )}
        </p>
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
