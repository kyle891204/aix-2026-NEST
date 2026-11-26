import { useAuth } from '../auth/auth-context'
import { useLanguage } from '../../shared/i18n/language-context'
import { useTranslations } from '../translation/use-translations'
import {
  noticeTitle,
  noticeTitleItems,
  titleTranslationStatus,
} from './notice-title-translations'

/**
 * 학교 공지 제목을 선택 언어로 보여준다. 목록을 다 불러온 뒤 제목만 한 번에 번역하고,
 * 번역 중이거나 실패한 제목은 원문을 보여준다. 전체공지 목록과 대시보드 공지 카드에서 같이 쓸 수 있다.
 */
export function useNoticeTitles(
  notices: readonly { noticeId: string; title: string }[] | null,
) {
  const { language } = useLanguage()
  const { session } = useAuth()
  const items = noticeTitleItems(notices, language)
  const { results, retry } = useTranslations(
    items,
    language,
    session?.user?.id ?? 'preview',
    session?.csrfToken,
  )
  return {
    title: (notice: { noticeId: string; title: string }) =>
      noticeTitle(notice, results),
    status: items.length === 0 ? 'DONE' : titleTranslationStatus(results),
    retry,
  }
}
