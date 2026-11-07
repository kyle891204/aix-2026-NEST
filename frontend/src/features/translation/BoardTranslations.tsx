import {
  cloneElement,
  createContext,
  useContext,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import type { Language } from '../../shared/types/language'
import {
  collectBoardItems,
  type Board,
  type TranslatablePost,
} from './board-translation-items'
import type { TranslationItem } from './translation-client'
import { useTranslations, type TranslationState } from './use-translations'
import './translation.css'

const messages = {
  ko: {
    language: '한국어',
    translated: '번역 보기',
    original: '원문 보기',
    loading: '번역 중… 원문을 읽을 수 있어요.',
    complete: '선호 언어로 번역했어요.',
    failed: '일부 내용을 번역하지 못해 원문을 표시하고 있어요.',
    retry: '실패한 번역 재시도',
    originals: '원문을 표시하고 있어요.',
    label: '게시글·답글 번역',
  },
  en: {
    language: 'English',
    translated: 'Show translation',
    original: 'Show original',
    loading: 'Translating… You can read the originals.',
    complete: 'Translated into your preferred language.',
    failed: 'Some translations failed. Their originals are shown.',
    retry: 'Retry failed translations',
    originals: 'Showing originals.',
    label: 'Post and reply translation',
  },
  zh: {
    language: '简体中文',
    translated: '查看翻译',
    original: '查看原文',
    loading: '正在翻译…您仍可阅读原文。',
    complete: '已翻译为您的偏好语言。',
    failed: '部分内容翻译失败，已显示原文。',
    retry: '重试失败的翻译',
    originals: '正在显示原文。',
    label: '帖子和回复翻译',
  },
}

const TranslationContext = createContext<{
  board: Board
  target: Language
  showOriginal: boolean
  results: TranslationState[]
} | null>(null)

/** 기존 게시판 스토어·라우트·CRUD는 그대로 사용하고 표시할 번역만 별도로 관리한다. */
export function BoardTranslations({
  board,
  posts,
  targetLanguage,
  children,
}: {
  board: Board
  posts: TranslatablePost[]
  targetLanguage: Language
  children: ReactNode
}) {
  const { pathname, search } = useLocation()
  const { session } = useAuth()
  const items = collectBoardItems(board, posts, pathname, search)
  const account = session?.user?.id ?? 'preview'
  return (
    <TranslationScope
      key={`${account}:${pathname}:${search}:${targetLanguage}`}
      board={board}
      items={items}
      target={targetLanguage}
      account={account}
      csrfToken={session?.csrfToken}
    >
      {children}
    </TranslationScope>
  )
}

function TranslationScope({
  board,
  items,
  target,
  account,
  csrfToken,
  children,
}: {
  board: Board
  items: TranslationItem[]
  target: Language
  account: string
  csrfToken?: string
  children: ReactNode
}) {
  const { results, retry } = useTranslations(items, target, account, csrfToken)
  const [showOriginal, setShowOriginal] = useState(false)
  const labels = messages[target]
  const required = items.some((item) => item.sourceLanguage !== target)
  const loading = results.some((item) => item.status === 'LOADING')
  const failure = results.some((item) => item.status === 'FAILED')
  return (
    <TranslationContext.Provider
      value={{ board, target, showOriginal, results }}
    >
      {required && (
        <section className="translation-toolbar" aria-label={labels.label}>
          <p role="status" aria-live="polite">
            {showOriginal
              ? labels.originals
              : loading
                ? labels.loading
                : failure
                  ? labels.failed
                  : labels.complete}{' '}
            ({labels.language})
          </p>
          <div className="translation-actions">
            <button
              type="button"
              aria-pressed={showOriginal}
              onClick={() => setShowOriginal((value) => !value)}
            >
              {showOriginal ? labels.translated : labels.original}
            </button>
            {failure && (
              <button type="button" onClick={retry} disabled={loading}>
                {labels.retry}
              </button>
            )}
          </div>
        </section>
      )}
      {children}
    </TranslationContext.Provider>
  )
}

/** 원래 요소를 유지한다. 번역은 표시용 children에만 적용하고 저장된 원문에는 쓰지 않는다. */
export function TranslationText({
  itemId,
  prefix = '',
  children,
}: {
  itemId: string
  prefix?: string
  children: ReactElement<{ children?: ReactNode; lang?: string }>
}) {
  const context = useContext(TranslationContext)
  const result = context?.results.find(
    (item) => item.id === `${context.board}:${itemId}`,
  )
  if (
    !context ||
    context.showOriginal ||
    result?.status !== 'SUCCEEDED' ||
    !result.translatedText
  )
    return children
  return cloneElement(children, {
    lang: context.target,
    children: prefix + result.translatedText,
  })
}

/** 댓글·답글의 실제 작성 언어를 별도로 선택한다. */
export function ReplyLanguageSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: Language
  onChange: (language: Language) => void
  disabled?: boolean
}) {
  return (
    <label className="translation-reply-language">
      작성 언어 / Writing language / 撰写语言
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Language)}
        disabled={disabled}
      >
        <option value="ko">한국어</option>
        <option value="en">English</option>
        <option value="zh">简体中文</option>
      </select>
    </label>
  )
}
