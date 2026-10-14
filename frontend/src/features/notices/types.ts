// Initial UI contracts. Confirm the final API schema with the backend team.
export type MatchStatus = 'APPLICABLE' | 'NOT_APPLICABLE' | 'NEEDS_REVIEW'
export type TranslationStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED'

export interface NoticeSummary {
  id: string
  title: string
  originalContent: string
  translatedContent: string | null
  translationStatus: TranslationStatus
  matchStatus: MatchStatus
  matchReason: string | null
  deadline: string | null
  sourceUrl: string | null
}
