import { useEffect, useState } from 'react'
import type { Language } from '../../shared/types/language.ts'
import {
  translationClient,
  type TranslationItem,
  type TranslationResult,
} from './translation-client.ts'

export type TranslationState = Omit<TranslationResult, 'status'> & {
  status: TranslationResult['status'] | 'LOADING'
}

export function useTranslations(
  items: TranslationItem[],
  target: Language,
  account: string,
  csrfToken?: string,
) {
  const signature = JSON.stringify({ items, target, account, csrfToken })
  const [attempt, setAttempt] = useState(0)
  const [snapshot, setSnapshot] = useState<{
    signature: string
    results: TranslationState[]
  }>({
    signature: '',
    results: [],
  })
  useEffect(() => {
    let active = true
    const request = JSON.parse(signature) as {
      items: TranslationItem[]
      target: Language
      account: string
      csrfToken?: string
    }
    void translationClient
      .translate(
        request.items,
        request.target,
        request.account,
        request.csrfToken,
      )
      .then((results) => {
        if (active) setSnapshot({ signature, results })
      })
    // 원문·언어·경로가 바뀌거나 언마운트되면 이전 요청의 응답은 화면에 반영하지 않는다.
    // 공유 중인 요청 자체는 중단하지 않아 다른 화면이나 StrictMode에서 재사용한다.
    return () => {
      active = false
    }
  }, [signature, attempt])

  const results =
    snapshot.signature === signature
      ? snapshot.results
      : items.map((item): TranslationState => ({
          id: item.id,
          status: item.sourceLanguage === target ? 'SKIPPED' : 'LOADING',
          translatedText: null,
          cached: false,
          retryable: false,
        }))
  return {
    results,
    retry: () => {
      setSnapshot((previous) => ({
        ...previous,
        results: previous.results.map((item) =>
          item.status === 'FAILED'
            ? { ...item, status: 'LOADING', retryable: false }
            : item,
        ),
      }))
      setAttempt((value) => value + 1)
    },
  }
}
