import { createContext, useContext } from 'react'
import type { MarketLanguage, MarketPost } from './market-store'

type MarketContextValue = {
  posts: MarketPost[]
  commit: (posts: MarketPost[]) => boolean
  actor: { id: string; name: string; language: MarketLanguage }
  writable: boolean
}

export const MarketContext = createContext<MarketContextValue | null>(null)

export function useMarket() {
  const context = useContext(MarketContext)
  if (!context) throw new Error('장터 화면 안에서 사용하세요.')
  return context
}
