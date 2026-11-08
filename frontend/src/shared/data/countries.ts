import countries from 'i18n-iso-countries'
import type { Language } from '../types/language.ts'
import { translate } from '../i18n/language.ts'

const countryNames = new Intl.DisplayNames(['ko'], {
  type: 'region',
})

export const COUNTRIES = Object.keys(countries.getAlpha2Codes())
  .map((code) => ({
    code,
    name: countryNames.of(code) ?? code,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

const localizedCountries = new Map<Language, typeof COUNTRIES>([
  ['ko', COUNTRIES],
])

export function getCountries(language: Language = 'ko') {
  const cached = localizedCountries.get(language)
  if (cached) return cached
  const names = new Intl.DisplayNames([language], { type: 'region' })
  const labels = Object.keys(countries.getAlpha2Codes())
    .map((code) => ({ code, name: names.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name, language))
  localizedCountries.set(language, labels)
  return labels
}

export function getCountryName(value: string, language: Language = 'ko') {
  if (!value) return translate(language, '미입력')

  return (
    getCountries(language).find((country) => country.code === value)?.name ??
    value
  )
}
