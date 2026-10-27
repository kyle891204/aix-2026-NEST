import { useState, type ReactNode } from 'react'
import { useAuth } from '../auth/auth-context'
import { DemoProfileContext } from './demo-profile-context'
import {
  loadDemoProfile,
  saveDemoProfile,
  type ProfileDraft,
} from './demo-profile'

export function DemoProfileProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const accountId = session?.user?.id ?? null
  return (
    <AccountProfileProvider
      key={accountId ?? 'anonymous'}
      accountId={accountId}
    >
      {children}
    </AccountProfileProvider>
  )
}

function AccountProfileProvider({
  accountId,
  children,
}: {
  accountId: string | null
  children: ReactNode
}) {
  // An account change remounts this provider and its forms. No previous account's
  // values can appear for one render or be written into the next account's key.
  const [state, setState] = useState(() => {
    try {
      return {
        savedProfile: accountId
          ? loadDemoProfile(window.sessionStorage, accountId)
          : null,
        storageError: null as string | null,
      }
    } catch {
      return {
        savedProfile: null,
        storageError:
          '이 탭의 프로필을 불러오지 못했어요. 브라우저 저장소 사용을 허용한 뒤 다시 시도해 주세요.',
      }
    }
  })

  function saveProfile(draft: ProfileDraft) {
    if (!accountId) throw new Error('프로필을 저장하려면 로그인해 주세요.')
    try {
      const savedProfile = saveDemoProfile(
        window.sessionStorage,
        accountId,
        draft,
      )
      setState({ savedProfile, storageError: null })
    } catch {
      throw new Error(
        '프로필을 저장하지 못했어요. 입력 내용을 확인하고 브라우저 저장소 사용을 허용한 뒤 다시 시도해 주세요.',
      )
    }
  }

  return (
    <DemoProfileContext.Provider value={{ ...state, saveProfile }}>
      {children}
    </DemoProfileContext.Provider>
  )
}
