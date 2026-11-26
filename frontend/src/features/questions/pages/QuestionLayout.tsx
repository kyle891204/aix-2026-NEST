import { useLanguage } from '../../../shared/i18n/language-context'
import { BoardTranslations } from '../../translation/components/BoardTranslations'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'
import { useDemoProfile } from '../../profile/demo-profile-context'
import { QuestionContext } from '../question-context'
import {
  loadQuestion,
  saveQuestion,
  type QuestionPost,
} from '../question-store'
import '../../market/market.css'

export function QuestionLayout() {
  const { session } = useAuth()
  return <QuestionSession key={session?.user?.id ?? 'preview'} />
}

function QuestionSession() {
  const { t, language: uiLanguage } = useLanguage()

  const { session } = useAuth()
  const { savedProfile } = useDemoProfile()
  const [initial] = useState(() => {
    try {
      return { posts: loadQuestion(window.sessionStorage), error: '' }
    } catch {
      return {
        posts: [] as QuestionPost[],
        error:
          '이 탭의 질문 데이터를 불러오지 못했어요. 저장소 설정을 확인하고 새로고침해 주세요.',
      }
    }
  })
  const [posts, setPosts] = useState(initial.posts)
  const [error, setError] = useState(initial.error)
  const actor = {
    id: session?.user?.id ?? 'local-preview',
    name: savedProfile?.profile.nickname ?? t('체험 사용자'),
    language: uiLanguage,
  }
  const writable = !initial.error && (!!session?.user || import.meta.env.DEV)
  function commit(next: QuestionPost[]) {
    if (!writable) return false
    try {
      saveQuestion(window.sessionStorage, next)
      setPosts(next)
      setError('')
      return true
    } catch {
      setError(
        '저장하지 못했어요. 브라우저 저장소 사용을 허용한 뒤 다시 시도해 주세요. 입력 내용은 유지됩니다.',
      )
      return false
    }
  }
  return (
    <QuestionContext.Provider value={{ posts, commit, actor, writable }}>
      <section className="market-page">
        {error && (
          <p className="market-error" role="alert">
            {t(error)}
          </p>
        )}
        <BoardTranslations
          board="questions"
          posts={posts}
          targetLanguage={actor.language}
        >
          <Outlet />
        </BoardTranslations>
        <p className="market-footnote">
          {t(
            '목업 질문게시판 · 작성한 글과 답글은 이 탭에서만 유지되며 다른 사용자에게 전송되지 않아요.',
          )}
        </p>
      </section>
    </QuestionContext.Provider>
  )
}
