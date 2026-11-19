import type { ReactNode } from 'react'
import { useLanguage } from '../../shared/i18n/language-context'
import { useAuth } from '../auth/auth-context'
import {
  collectDataItems,
  dataTranslationStatus,
} from './data-translation-items'
import {
  DataTextContext,
  useDataText,
  useDataTranslationState,
  type TranslateText,
} from './data-text-context'
import { useTranslations } from './use-translations'
import './translation.css'

/**
 * 화면에 보이는 서버 데이터(공지 제목, 학사일정 이름, 과목명 등)를 선택한 언어로 번역한다.
 * 고정 UI 문구는 messages.ts의 t()를 쓰고, 이 범위는 매번 바뀌는 데이터에만 쓴다.
 * 한국어를 고르면 요청하지 않으며, 번역 중이거나 실패하면 원문을 보여준다.
 * 진행 안내는 <DataTranslationStatus />를 둔 자리에 나온다.
 */
export function DataTranslations({
  texts,
  context,
  children,
}: {
  texts: (string | null | undefined)[]
  context: string
  children: ReactNode
}) {
  const { language } = useLanguage()
  const { session } = useAuth()
  const items = collectDataItems(texts, context)
  const { results, retry } = useTranslations(
    items,
    language,
    session?.user?.id ?? 'preview',
    session?.csrfToken,
  )
  const translated = new Map<string, string>()
  for (const item of items) {
    const result = results.find((entry) => entry.id === item.id)
    if (result?.translatedText) translated.set(item.text, result.translatedText)
  }
  const translate: TranslateText = (text) => translated.get(text.trim()) ?? text
  return (
    <DataTextContext.Provider
      value={{ translate, status: dataTranslationStatus(results), retry }}
    >
      {children}
    </DataTextContext.Provider>
  )
}

/** JSX 안에서 바로 쓰는 버전. <DataText text={course.name} /> */
export function DataText({ text }: { text: string }) {
  return useDataText()(text)
}

/** 번역 중이면 안내를, 실패하면 안내와 다시 시도 버튼을 보여준다. 끝나면 아무것도 그리지 않는다. */
export function DataTranslationStatus() {
  const { t } = useLanguage()
  const { status, retry } = useDataTranslationState()
  if (status === 'DONE') return null
  return (
    <div className="translation-toolbar">
      <p role="status" aria-live="polite">
        {status === 'LOADING'
          ? t('번역 중이에요. 끝날 때까지 원문을 보여드려요.')
          : t('일부 내용을 번역하지 못해 원문을 보여드려요.')}
      </p>
      {status === 'FAILED' && (
        <div className="translation-actions">
          <button type="button" onClick={retry}>
            {t('다시 시도')}
          </button>
        </div>
      )}
    </div>
  )
}
