import { getSession } from '../auth/api.ts'
import { ApiError, requestJson } from '../../shared/api/client.ts'
import type { Language } from '../../shared/types/language.ts'

export interface TranslationItem {
  id: string
  text: string
  sourceLanguage: Language
  context: string
}

export interface TranslationResult {
  id: string
  status: 'SUCCEEDED' | 'SKIPPED' | 'FAILED'
  translatedText: string | null
  cached: boolean
  retryable: boolean
}

export interface BatchRequest {
  targetLanguage: Language
  items: TranslationItem[]
}

export const translationKey = (item: TranslationItem, target: Language) =>
  JSON.stringify([item.text, item.sourceLanguage, target, item.context, 'v1'])

const failed = (id: string): TranslationResult => ({
  id,
  status: 'FAILED',
  translatedText: null,
  cached: false,
  retryable: true,
})

export function splitTranslationItems(items: TranslationItem[]) {
  const batches: TranslationItem[][] = []
  let batch: TranslationItem[] = []
  let size = 0
  for (const item of items) {
    const length = item.text.length + item.context.length
    if (batch.length && (batch.length === 20 || size + length > 12_000)) {
      batches.push(batch)
      batch = []
      size = 0
    }
    batch.push(item)
    size += length
  }
  if (batch.length) batches.push(batch)
  return batches
}

// 응답 순서를 신뢰하지 않는다. 누락·빈 번역·중복 ID는 해당 항목의 실패로 처리한다.
export function readTranslationResponse(value: unknown, request: BatchRequest) {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('targetLanguage' in value) ||
    value.targetLanguage !== request.targetLanguage ||
    !('items' in value) ||
    !Array.isArray(value.items)
  )
    throw new Error('번역 응답을 확인할 수 없습니다.')
  const expected = new Set(request.items.map((item) => item.id))
  const seen = new Set<string>()
  const duplicate = new Set<string>()
  const results = new Map<string, TranslationResult>()
  for (const item of value.items) {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof item.id !== 'string' ||
      !expected.has(item.id)
    ) {
      throw new Error('번역 항목을 확인할 수 없습니다.')
    }
    if (seen.has(item.id)) duplicate.add(item.id)
    seen.add(item.id)
    if (
      item.status === 'SUCCEEDED' &&
      typeof item.translatedText === 'string' &&
      item.translatedText.trim() &&
      item.translatedText.length <= 24_000 &&
      typeof item.cached === 'boolean' &&
      item.retryable === false
    ) {
      results.set(item.id, {
        id: item.id,
        status: 'SUCCEEDED',
        translatedText: item.translatedText,
        cached: item.cached,
        retryable: false,
      })
    }
  }
  return request.items.map((item) =>
    duplicate.has(item.id)
      ? failed(item.id)
      : (results.get(item.id) ?? failed(item.id)),
  )
}

/** 성공 결과·진행 중 요청을 공유한다. 계정별로 분리하며 브라우저 영구 저장은 하지 않는다. */
export function createTranslationClient(
  send: (
    request: BatchRequest,
    csrfToken?: string,
    account?: string,
  ) => Promise<unknown>,
  now: () => number = Date.now,
) {
  const cache = new Map<string, { text: string; expiresAt: number }>()
  const pending = new Map<string, Promise<TranslationResult>>()
  return {
    async translate(
      items: TranslationItem[],
      targetLanguage: Language,
      account: string,
      csrfToken?: string,
    ) {
      for (const [key, entry] of cache)
        if (entry.expiresAt <= now()) cache.delete(key)
      const owned: {
        item: TranslationItem
        key: string
        resolve: (value: TranslationResult) => void
      }[] = []
      const answers = items.map((item): Promise<TranslationResult> => {
        if (item.sourceLanguage === targetLanguage)
          return Promise.resolve({
            id: item.id,
            status: 'SKIPPED',
            translatedText: item.text,
            cached: false,
            retryable: false,
          })
        const key = JSON.stringify([
          account,
          translationKey(item, targetLanguage),
        ])
        const saved = cache.get(key)
        if (saved)
          return Promise.resolve({
            id: item.id,
            status: 'SUCCEEDED',
            translatedText: saved.text,
            cached: true,
            retryable: false,
          })
        let future = pending.get(key)
        if (!future) {
          future = new Promise<TranslationResult>((resolve) =>
            owned.push({ item, key, resolve }),
          )
          pending.set(key, future)
        }
        return future.then((result) => ({ ...result, id: item.id }))
      })
      // 등록은 동기적으로 끝내므로 StrictMode나 다른 화면의 동시 요청도 위 pending을 공유한다.
      const run = async () => {
        for (const batch of splitTranslationItems(
          owned.map((entry) => entry.item),
        )) {
          const request = { targetLanguage, items: batch }
          let results: TranslationResult[]
          try {
            results = readTranslationResponse(
              await send(request, csrfToken, account),
              request,
            )
          } catch {
            results = batch.map((item) => failed(item.id))
          }
          for (const result of results) {
            const owner = owned.find((entry) => entry.item.id === result.id)!
            if (
              result.status === 'SUCCEEDED' &&
              result.translatedText !== null
            ) {
              if (cache.size >= 200) cache.delete(cache.keys().next().value!)
              cache.set(owner.key, {
                text: result.translatedText,
                expiresAt: now() + 3_600_000,
              })
            }
            pending.delete(owner.key)
            owner.resolve(result)
          }
        }
      }
      await run()
      return Promise.all(answers)
    },
  }
}

// 세션 쿠키가 바뀌어도 화면의 CSRF 값은 이전 값일 수 있다.
// 번역은 읽기 작업이므로 같은 계정의 최신 토큰으로 한 번만 복구한다.
export async function sendTranslationBatch(
  request: BatchRequest,
  csrfToken?: string,
  account?: string,
) {
  const send = (token?: string) =>
    requestJson('/community/translations/batch', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'X-CSRF-Token': token } : {}),
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(70_000),
    })
  try {
    return await send(csrfToken)
  } catch (cause) {
    if (
      !(cause instanceof ApiError) ||
      cause.status !== 403 ||
      cause.code !== 'AUTH_CSRF_INVALID'
    )
      throw cause
    const current = await getSession()
    // 계정이 바뀌었다면 이전 계정의 요청을 새 계정으로 전송하지 않는다.
    if (!account || current.user?.id !== account) throw cause
    return send(current.csrfToken)
  }
}

export const translationClient = createTranslationClient(sendTranslationBatch)
