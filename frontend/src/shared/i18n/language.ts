import { SUPPORTED_LANGUAGES, type Language } from '../types/language.ts'
import { messages } from './messages.ts'

export const LANGUAGE_STORAGE_KEY = 'nest:ui-language:v1'
export const LANGUAGE_NAMES: Record<Language, string> = {
  ko: '한국어',
  en: 'English',
  zh: '中文',
}
export const LANGUAGE_LOCALES: Record<Language, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  zh: 'zh-CN',
}

export function isLanguage(value: unknown): value is Language {
  return SUPPORTED_LANGUAGES.some((language) => language === value)
}

export function loadLanguage(storage: Pick<Storage, 'getItem'>): Language {
  try {
    const value = storage.getItem(LANGUAGE_STORAGE_KEY)
    return isLanguage(value) ? value : 'ko'
  } catch {
    return 'ko'
  }
}

// Korean source strings are stable catalog keys. Unknown text is preserved;
// callers only pass UI labels, never user-authored post content.
export function translate(
  language: Language,
  key: string,
  values: Record<string, string | number> = {},
): string {
  const entry = messages[key]
  const message = language === 'ko' ? key : (entry?.[language] ?? key)
  return message.replace(/\{(\w+)\}/g, (token, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : token,
  )
}

export function formatBoardDate(date: string, language: Language) {
  return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  }).format(new Date(date))
}
