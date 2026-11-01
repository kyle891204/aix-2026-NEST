import { createContext, useContext } from 'react'
import type { FreeBoardActor, FreeBoardPost } from './free-board-store'

type FreeBoardContextValue = {
  posts: FreeBoardPost[]
  actor: FreeBoardActor
  writable: boolean
  commit: (posts: FreeBoardPost[]) => boolean
}

export const FreeBoardContext = createContext<FreeBoardContextValue | null>(
  null,
)

export function useFreeBoard() {
  const context = useContext(FreeBoardContext)
  if (!context) throw new Error('자유게시판 화면 안에서 사용하세요.')
  return context
}
