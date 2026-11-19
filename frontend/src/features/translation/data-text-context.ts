import { createContext, useContext } from 'react'
import type { DataTranslationStatus } from './data-translation-items'

export type TranslateText = (text: string) => string

export interface DataTextValue {
  translate: TranslateText
  status: DataTranslationStatus
  retry: () => void
}

// 범위 밖에서 쓰면 원문을 그대로 돌려주고 안내도 보여주지 않는다.
export const DataTextContext = createContext<DataTextValue>({
  translate: (text) => text,
  status: 'DONE',
  retry: () => {},
})

/** DataTranslations 안에서 서버 데이터 원문을 넣으면 번역문(없으면 원문)을 돌려준다. */
export function useDataText() {
  return useContext(DataTextContext).translate
}

/** 번역 진행 상태와 실패한 번역 다시 시도. 안내 문구를 둘 위치에서 쓴다. */
export function useDataTranslationState() {
  const { status, retry } = useContext(DataTextContext)
  return { status, retry }
}
