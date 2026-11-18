import { useCallback, useEffect, useRef, useState } from 'react'
import type { Language } from '../../shared/types/language'
import {
  translationClient,
  type TranslationItem,
} from '../translation/translation-client'
import { TRANSLATED_FACILITY_IDS } from './data/nearby-facility-text'
import type { FacilityItem } from './data/nearby-facilities'

const STATIC_IDS = new Set(TRANSLATED_FACILITY_IDS)

export type PlaceTranslationStatus = 'idle' | 'loading' | 'failed'

export interface PlaceTranslations {
  name: (facility: FacilityItem) => string | undefined
  address: (facility: FacilityItem) => string | undefined
  status: PlaceTranslationStatus
  retry: () => void
}

// 지금 화면에 보이는 목록의 이름과 선택한 시설의 주소만 번역한다.
// 고정 번역이 있는 주요 시설은 서버를 거치지 않는다. 받은 번역은 모아 두어
// "더 보기"나 지도 이동 뒤에도 이미 번역한 이름이 한국어로 되돌아가지 않는다.
export function usePlaceTranslations(
  visible: readonly FacilityItem[],
  selected: FacilityItem | null,
  language: Language,
  account: string,
  csrfToken?: string,
): PlaceTranslations {
  const [done, setDone] = useState<Record<string, string>>({})
  const [failedKeys, setFailedKeys] = useState<Set<string>>(new Set())
  const [attempt, setAttempt] = useState(0)
  const doneRef = useRef(done)
  useEffect(() => {
    doneRef.current = done
  }, [done])

  const keyOf = (field: string, id: string) =>
    `${account}:${language}:${field}:${id}`

  // 번역할 항목. 목록·선택·언어가 바뀔 때만 다시 요청한다.
  const wanted: TranslationItem[] = []
  if (language !== 'ko') {
    const targets = selected ? [...visible, selected] : [...visible]
    const seen = new Set<string>()
    for (const facility of targets) {
      if (STATIC_IDS.has(facility.id) || seen.has(facility.id)) continue
      seen.add(facility.id)
      wanted.push({
        id: `name:${facility.id}`,
        text: facility.name,
        sourceLanguage: 'ko',
        context: '주변 시설(병원·약국·마트) 이름',
      })
    }
    if (selected && !STATIC_IDS.has(selected.id) && selected.roadAddress) {
      wanted.push({
        id: `address:${selected.id}`,
        text: selected.roadAddress,
        sourceLanguage: 'ko',
        context: '주변 시설 도로명 주소',
      })
    }
  }
  const signature = JSON.stringify({
    wanted,
    language,
    account,
    csrfToken,
    attempt,
  })

  useEffect(() => {
    const request = JSON.parse(signature) as {
      wanted: TranslationItem[]
      language: Language
      account: string
      csrfToken?: string
    }
    const keyFor = (itemId: string) => {
      const separator = itemId.indexOf(':')
      return `${request.account}:${request.language}:${itemId.slice(0, separator)}:${itemId.slice(separator + 1)}`
    }
    const pending = request.wanted.filter(
      (item) => doneRef.current[keyFor(item.id)] === undefined,
    )
    if (pending.length === 0) return
    let active = true
    void translationClient
      .translate(pending, request.language, request.account, request.csrfToken)
      .then((results) => {
        if (!active) return
        const succeeded: Record<string, string> = {}
        const failed = new Set<string>()
        for (const result of results) {
          if (result.translatedText && result.status !== 'FAILED') {
            succeeded[keyFor(result.id)] = result.translatedText
          } else {
            failed.add(keyFor(result.id))
          }
        }
        setDone((previous) => ({ ...previous, ...succeeded }))
        setFailedKeys(failed)
      })
    return () => {
      active = false
    }
  }, [signature])

  const retry = useCallback(() => {
    setFailedKeys(new Set())
    setAttempt((value) => value + 1)
  }, [])

  const hasMissing = wanted.some((item) => {
    const separator = item.id.indexOf(':')
    const key = keyOf(item.id.slice(0, separator), item.id.slice(separator + 1))
    return done[key] === undefined && !failedKeys.has(key)
  })
  const hasFailed = wanted.some((item) => {
    const separator = item.id.indexOf(':')
    return failedKeys.has(
      keyOf(item.id.slice(0, separator), item.id.slice(separator + 1)),
    )
  })

  return {
    name: (facility) => done[keyOf('name', facility.id)],
    address: (facility) => done[keyOf('address', facility.id)],
    status: hasMissing ? 'loading' : hasFailed ? 'failed' : 'idle',
    retry,
  }
}
