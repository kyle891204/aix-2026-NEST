import { createContext, useContext } from 'react'
import type { ProfileDraft, StoredDemoProfile } from './demo-profile'

export interface DemoProfileContextValue {
  savedProfile: StoredDemoProfile | null
  storageError: string | null
  saveProfile: (draft: ProfileDraft) => void
}

export const DemoProfileContext = createContext<DemoProfileContextValue | null>(
  null,
)

export function useDemoProfile() {
  const context = useContext(DemoProfileContext)
  if (!context) throw new Error('DemoProfileProvider가 필요합니다.')
  return context
}
