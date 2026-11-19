import type { Language } from '../../shared/types/language.ts'
import type { TranslationItem } from '../translation/translation-client.ts'

// 학교 공지 목록의 제목을 선택 언어로 바꿔 보여주기 위한 규칙.
// 번역 요청과 캐시는 게시판과 같은 공통 일괄 번역(/community/translations/batch)을 쓴다.

// 학교 공지는 한국어로 올라온다. 목록 응답에는 원문 언어가 없어 한국어로 본다.
const NOTICE_LANGUAGE: Language = 'ko'
// 대시보드 공지 카드도 같은 문구를 써서 같은 제목은 같은 번역(캐시)을 쓴다.
export const NOTICE_TITLE_CONTEXT =
  'Title of a Hanyang University ERICA notice for international students'

export interface TitleTranslation {
  id: string
  status: 'SUCCEEDED' | 'SKIPPED' | 'FAILED' | 'LOADING'
  translatedText: string | null
}

/** 한국어 화면이면 번역할 것이 없다. 같은 공지가 두 번 오면 한 번만 번역한다. */
export function noticeTitleItems(
  notices: readonly { noticeId: string; title: string }[] | null,
  target: Language,
): TranslationItem[] {
  if (!notices || target === NOTICE_LANGUAGE) return []
  const seen = new Set<string>()
  const items: TranslationItem[] = []
  for (const notice of notices) {
    if (seen.has(notice.noticeId) || !notice.title.trim()) continue
    seen.add(notice.noticeId)
    items.push({
      id: notice.noticeId,
      text: notice.title,
      sourceLanguage: NOTICE_LANGUAGE,
      context: NOTICE_TITLE_CONTEXT,
    })
  }
  return items
}

/** 번역에 성공한 제목만 바꾼다. 번역 중이거나 실패하면 원문을 그대로 보여준다. */
export function noticeTitle(
  notice: { noticeId: string; title: string },
  results: readonly TitleTranslation[],
) {
  const result = results.find((item) => item.id === notice.noticeId)
  return result?.status === 'SUCCEEDED' && result.translatedText
    ? { text: result.translatedText, translated: true }
    : { text: notice.title, translated: false }
}

export function titleTranslationStatus(results: readonly TitleTranslation[]) {
  if (results.some((item) => item.status === 'LOADING')) return 'LOADING'
  if (results.some((item) => item.status === 'FAILED')) return 'FAILED'
  return 'DONE'
}

// 공용 다국어 사전을 건드리지 않도록 이 기능의 안내 문구는 여기에 둔다(게시판 번역과 같은 방식).
const MESSAGES = {
  ko: { loading: '', failed: '', retry: '' },
  en: {
    loading: 'Translating notice titles. Originals are shown until then.',
    failed:
      'Some titles could not be translated, so their originals are shown.',
    retry: 'Retry',
  },
  zh: {
    loading: '正在翻译通知标题，完成前显示原文。',
    failed: '部分标题未能翻译，已显示原文。',
    retry: '重试',
  },
} satisfies Record<Language, Record<'loading' | 'failed' | 'retry', string>>

export function titleTranslationMessage(
  language: Language,
  key: 'loading' | 'failed' | 'retry',
) {
  return MESSAGES[language][key]
}
