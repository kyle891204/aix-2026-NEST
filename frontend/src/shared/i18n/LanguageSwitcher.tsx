import { useState } from 'react'
import { SUPPORTED_LANGUAGES } from '../types/language'
import { useLanguage } from './language-context'
import { LANGUAGE_NAMES } from './language'
import './language.css'

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage()
  const [failed, setFailed] = useState(false)
  return (
    <div className="language-picker">
      <div
        className="language-switch"
        role="group"
        aria-label={t('화면 언어 선택')}
      >
        {SUPPORTED_LANGUAGES.map((next) => (
          <button
            key={next}
            type="button"
            lang={next === 'zh' ? 'zh-CN' : next}
            aria-pressed={language === next}
            onClick={() => {
              try {
                setLanguage(next)
                setFailed(false)
              } catch {
                setFailed(true)
              }
            }}
          >
            {LANGUAGE_NAMES[next]}
          </button>
        ))}
      </div>
      {failed && (
        <p role="alert" className="error-text">
          {t(
            '언어를 저장하지 못했어요. 브라우저 저장소 설정을 확인하고 다시 시도해 주세요.',
          )}
        </p>
      )}
    </div>
  )
}
