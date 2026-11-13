import type { Language } from '../types/language.ts'
import { getCountryName } from '../data/countries.ts'
import { translate } from './language.ts'

// 서버가 제공하는 고정 안내/판별 사유만 현지화한다. 공지 원문·AI 분석·제목 등
// 사전에 없는 콘텐츠는 그대로 두며, 기존 응답이나 저장값을 바꾸지 않는다.
export function schoolMessage(language: Language, message: string): string {
  const t = (key: string, values?: Record<string, string | number>) =>
    translate(language, key, values)
  const direct = t(message)
  if (direct !== message || language === 'ko') return direct

  // 오류 코드는 보존하고 안내 부분만 바꾼다. 언어 전환 전의 오류도 즉시 갱신된다.
  const error = message.match(/^(.*) \(([A-Z][A-Z0-9_]*)\)$/)
  if (error) return `${t(error[1])} (${error[2]})`

  const nationality = message.match(/^국적\(([A-Z]{2})\) 대상$/)
  if (nationality)
    return t('국적({country}) 대상', {
      country: getCountryName(nationality[1], language),
    })
  const visa = message.match(/^([A-Z0-9-]+) 비자 대상$/)
  if (visa) return t('{visa} 비자 대상', { visa: visa[1] })
  const year = message.match(/^([1-6])학년 대상$/)
  if (year) return t('{year}학년 대상', { year: year[1] })
  return message
}
