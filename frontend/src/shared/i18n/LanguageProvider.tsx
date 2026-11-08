import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { LanguageContext } from './language-context'
import { useDemoProfile } from '../../features/profile/demo-profile-context'
import type { Language } from '../types/language'
import {
  isLanguage,
  LANGUAGE_STORAGE_KEY,
  loadLanguage,
  translate,
} from './language'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { savedProfile, saveProfile } = useDemoProfile()
  const [guestLanguage, setGuestLanguage] = useState(() => {
    try {
      return loadLanguage(window.sessionStorage)
    } catch {
      return 'ko' as const
    }
  })
  const language = savedProfile?.profile.language ?? guestLanguage

  function setLanguage(next: Language) {
    if (!isLanguage(next)) return
    // Save first: a denied storage write must not look like a saved preference.
    if (savedProfile) {
      saveProfile({
        ...savedProfile,
        profile: { ...savedProfile.profile, language: next },
      })
    }
    setGuestLanguage(next)
    try {
      window.sessionStorage.setItem(LANGUAGE_STORAGE_KEY, next)
    } catch {
      // The login selector still works in memory when browser storage is disabled.
    }
  }

  return (
    <LanguageScope language={language} onChange={setLanguage}>
      {children}
    </LanguageScope>
  )
}

// Signup previews a draft preference without saving an existing account's profile.
export function LanguageScope({
  language,
  onChange,
  children,
}: {
  language: Language
  onChange: (language: Language) => void
  children: ReactNode
}) {
  const { pathname } = useLocation()
  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : language
    document.title = translate(language, 'NEST · 캠퍼스 생활의 시작')
  }, [language, pathname])
  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: onChange,
        t: (key, values) => translate(language, key, values),
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}
