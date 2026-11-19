import { createContext, useContext } from 'react'

export type TranslateText = (text: string) => string

// 범위 밖에서 쓰면 원문을 그대로 돌려준다.
export const DataTextContext = createContext<TranslateText>((text) => text)

/** DataTranslations 안에서 서버 데이터 원문을 넣으면 번역문(없으면 원문)을 돌려준다. */
export function useDataText() {
  return useContext(DataTextContext)
}
