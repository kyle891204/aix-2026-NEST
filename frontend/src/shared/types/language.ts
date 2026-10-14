export const SUPPORTED_LANGUAGES = ['ko', 'en', 'zh'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]
