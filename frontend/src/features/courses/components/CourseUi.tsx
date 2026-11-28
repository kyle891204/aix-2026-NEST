import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../../../shared/i18n/language-context'
import { schoolMessage } from '../../../shared/i18n/school-message'
import type { NotificationType } from '../api'

export function DemoPasswordForm({
  wrong,
  onSubmit,
}: {
  wrong: boolean
  onSubmit: (password: string) => void
}) {
  const { t } = useLanguage()

  const [password, setPassword] = useState('')
  return (
    <form
      className="course-password"
      onSubmit={(event) => {
        event.preventDefault()
        if (password) onSubmit(password)
      }}
    >
      <p className="home-description">
        {t(
          '과목알림은 데모용 공통 LMS 계정의 데이터라 데모 접근 암호가 필요해요. Canvas API 토큰을 넣지 마세요.',
        )}
      </p>
      <label>
        <span>{t('데모 접근 암호')}</span>
        <input
          type="password"
          autoComplete="off"
          value={password}
          placeholder={t('발표자에게 받은 데모 암호')}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {wrong && (
        <p className="course-error" role="alert">
          {t('암호가 맞지 않아요. 다시 입력해 주세요.')}
        </p>
      )}
      <button type="submit" disabled={!password}>
        {t('확인')}
      </button>
    </form>
  )
}

export function Retry({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  const { t, language } = useLanguage()

  return (
    <div className="course-error" role="alert">
      <p>{schoolMessage(language, message)}</p>
      <button type="button" onClick={onRetry}>
        {t('다시 시도')}
      </button>
    </div>
  )
}

// to가 -1이면 브라우저 뒤로 가기처럼 들어온 화면으로 돌아간다(그 화면의 고른 항목·펼침이 살아 있다).
export function BackLink({
  to,
  className = 'course-back',
  children,
}: {
  to: string | -1
  className?: string
  children?: ReactNode
}) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const label = children ?? <>‹ {t('뒤로')}</>
  if (to === -1)
    return (
      <button type="button" className={className} onClick={() => navigate(-1)}>
        {label}
      </button>
    )
  return (
    <Link className={className} to={to}>
      {label}
    </Link>
  )
}

export function CourseFootnote({ truncated }: { truncated?: boolean }) {
  const { t } = useLanguage()
  return (
    <p className="home-description course-footnote">
      {t(
        '현재는 데모용 공통 LMS 계정의 과목을 보여줘요. 공지는 최근 90일 것만 보여주고, 시간은 한국 시간(KST)이에요.',
      )}
      {truncated && <> {t('LMS 조회 상한 때문에 일부 항목만 표시했어요.')}</>}
    </p>
  )
}

// 과목 카드의 공지·과제·자료 아이콘(S08). 글자 없이 쓰이므로 링크 쪽에서 이름을 붙인다.
export function TypeIcon({ type }: { type: NotificationType }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (type === 'ANNOUNCEMENT')
    return (
      <svg {...common}>
        <path d="M3 10v4h3l8 5V5L6 10H3Z" />
        <path d="M6 14l1 6h3l-1-5" />
        <path d="M18 9.5v5" />
      </svg>
    )
  if (type === 'ASSIGNMENT')
    return (
      <svg {...common}>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" />
      </svg>
    )
  return (
    <svg {...common}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </svg>
  )
}
