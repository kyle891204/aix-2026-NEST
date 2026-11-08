import type { Language } from '../../shared/types/language.ts'
import type { TranslationItem } from './translation-client.ts'

export type Board = 'free' | 'market' | 'questions'
export interface TranslatablePost {
  id: string
  title: string
  content: string
  language: Language
  replies: { id: string; content: string; language: Language }[]
  type?: string
  category?: string
  status?: string
  location?: string
}

/** 원문 스토어를 변경하지 않고, 현재 경로·필터에서 표시되는 글만 수집한다. */
export function collectBoardItems(
  board: Board,
  posts: TranslatablePost[],
  pathname: string,
  search: string,
): TranslationItem[] {
  const base = `/life/${board}`
  const path = pathname.replace(/\/$/, '')
  const list = path === base
  if (!path.startsWith(`${base}/`) && !list) return []
  const tail = path.slice(base.length + 1)
  if (!list && (tail === 'new' || tail.includes('/'))) return []
  let postId = ''
  try {
    postId = decodeURIComponent(tail)
  } catch {
    return []
  }
  const query = new URLSearchParams(search)
  const visible = list
    ? posts.filter(
        (post) =>
          (board !== 'market' ||
            !query.get('type') ||
            query.get('type') === 'all' ||
            post.type === query.get('type')) &&
          (board !== 'questions' ||
            !query.get('category') ||
            query.get('category') === 'all' ||
            post.category === query.get('category')) &&
          (board === 'free' ||
            !query.get('status') ||
            query.get('status') === 'all' ||
            post.status === query.get('status')),
      )
    : posts.filter((post) => post.id === postId)
  const label = { free: '자유게시판', market: '장터', questions: '질문게시판' }[
    board
  ]
  return visible.flatMap((post) => {
    const item = (
      field: string,
      text: string,
      context: string,
      sourceLanguage = post.language,
    ): TranslationItem => ({
      id: `${board}:${post.id}:${field}`,
      text,
      sourceLanguage,
      context: `${label} ${context}`,
    })
    const result = [
      item('title', post.title, '게시글 제목'),
      item(
        list ? 'preview' : 'content',
        list ? post.content.split('\n')[0] : post.content,
        '게시글 본문',
      ),
    ]
    if (!list) {
      if (board === 'market' && post.location?.trim())
        result.push(item('location', post.location, '거래 희망 장소'))
      for (const reply of post.replies)
        result.push(
          item(
            `reply:${reply.id}`,
            reply.content,
            '게시글 답글',
            reply.language,
          ),
        )
    }
    return result.filter((entry) => entry.text.trim())
  })
}
