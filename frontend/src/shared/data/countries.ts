import { getAlpha2Codes } from 'i18n-iso-countries'

const countryNames = new Intl.DisplayNames(['ko'], {
  type: 'region',
})

export const COUNTRIES = Object.keys(getAlpha2Codes())
  .map((code) => ({
    code,
    name: countryNames.of(code) ?? code,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

export function getCountryName(value: string) {
  if (!value) return '미입력'

  return COUNTRIES.find((country) => country.code === value)?.name ?? value
}
