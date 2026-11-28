import { createContext, useContext } from 'react'
import type { QuestionLanguage, QuestionPost } from './question-store'

type QuestionContextValue = {
  posts: QuestionPost[]
  commit: (posts: QuestionPost[]) => boolean
  actor: { id: string; name: string; language: QuestionLanguage }
  writable: boolean
}

export const QuestionContext = createContext<QuestionContextValue | null>(null)

export function useQuestion() {
  const context = useContext(QuestionContext)
  if (!context) throw new Error('질문 화면 안에서 사용하세요.')
  return context
}
