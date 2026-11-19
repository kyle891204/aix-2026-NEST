import type { TranslationItem } from './translation-client.ts'

// 백엔드 번역 API의 항목당 글자 수 상한과 같다. 더 긴 원문은 번역하지 않고 그대로 보여준다.
const MAX_TEXT = 3000

/**
 * 서버에서 받은 한국어 데이터(공지·일정·과목 제목 등)를 번역 요청 항목으로 만든다.
 * 같은 문장은 한 번만 요청하고, 빈 문자열·너무 긴 문장은 뺀다.
 */
export function collectDataItems(
  texts: (string | null | undefined)[],
  context: string,
): TranslationItem[] {
  const unique = [
    ...new Set(
      texts
        .map((text) => text?.trim() ?? '')
        .filter((text) => text && text.length <= MAX_TEXT),
    ),
  ]
  return unique.map((text, index) => ({
    id: `data:${index}`,
    text,
    sourceLanguage: 'ko',
    context,
  }))
}
