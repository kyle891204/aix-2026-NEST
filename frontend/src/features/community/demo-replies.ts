import {
  SUPPORTED_LANGUAGES,
  type Language,
} from '../../shared/types/language.ts'

interface DemoReply {
  id: string
  authorId: string
  author: string
  language: Language
  content: string
  createdAt: string
}

const authors: Record<Language, string> = {
  ko: '지민',
  en: 'Sophie',
  zh: '李明',
}

/** 번역문을 미리 넣지 않고 각 언어의 원문 댓글을 기존 번역 흐름에 전달한다. */
export function createDemoReplies(
  postId: string,
  postedAt: string,
  contents: Partial<Record<Language, string>>,
): DemoReply[] {
  return SUPPORTED_LANGUAGES.flatMap((language, index) => {
    const content = contents[language]
    if (content === undefined) return []
    return [
      {
        id: `demo-reply:${postId}:${language}`,
        authorId: `demo-reply-author:${language}`,
        author: authors[language],
        language,
        content,
        createdAt: new Date(
          Date.parse(postedAt) + (index + 1) * 3600000,
        ).toISOString(),
      },
    ]
  })
}

/** 예전 목업만 현재 구성으로 맞추고 사용자 글·댓글은 보존한다. */
export function mergeDemoReplies<
  T extends { id: string; example: boolean; replies: DemoReply[] },
>(posts: T[], examples: T[]): T[] {
  const seeds = new Map(examples.map((post) => [post.id, post.replies]))
  return posts.map((post) => {
    const seed = seeds.get(post.id)
    if (!post.example || !seed) return post
    const seedIds = new Set(seed.map((reply) => reply.id))
    const replies = post.replies.filter((reply) => {
      const isDemo = SUPPORTED_LANGUAGES.some(
        (language) =>
          reply.id === `demo-reply:${post.id}:${language}` &&
          reply.authorId === `demo-reply-author:${language}`,
      )
      return !isDemo || seedIds.has(reply.id)
    })
    const ids = new Set(replies.map((reply) => reply.id))
    const missing = seed.filter((reply) => !ids.has(reply.id))
    return missing.length || replies.length !== post.replies.length
      ? { ...post, replies: [...replies, ...structuredClone(missing)] }
      : post
  })
}
