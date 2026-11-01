export type FreeBoardLanguage = 'ko' | 'en' | 'zh'

export interface FreeBoardReply {
  id: string
  authorId: string
  author: string
  language: FreeBoardLanguage
  content: string
  createdAt: string
}

export interface FreeBoardPost extends FreeBoardReply {
  title: string
  example: boolean
  replies: FreeBoardReply[]
}

export type FreeBoardDraft = Pick<
  FreeBoardPost,
  'title' | 'content' | 'language'
>
export type FreeBoardActor = {
  id: string
  name: string
  language: FreeBoardLanguage
}

export const FREE_BOARD_KEY = 'nest:free-board-demo:v1'
export const languageLabels = { ko: '한국어', en: 'English', zh: '中文' }
export const examplePosts: FreeBoardPost[] = [
  {
    id: 'campus-walk',
    authorId: 'example-song-seonwoo',
    author: '송선우',
    language: 'ko',
    title: '수업 끝나고 캠퍼스 산책했어요',
    content:
      '요즘 캠퍼스 단풍이 예뻐요.\n여러분이 좋아하는 산책 코스도 알려주세요!',
    createdAt: '2026-11-01T00:00:00Z',
    example: true,
    replies: [],
  },
  {
    id: 'weekend-together',
    authorId: 'example-kim-yongtae',
    author: '김용태',
    language: 'ko',
    title: '주말에 같이 운동할 친구 구해요',
    content:
      '가볍게 배드민턴 치거나 산책할 친구를 찾고 있어요.\n관심 있으면 댓글 남겨주세요.',
    createdAt: '2026-10-31T03:00:00Z',
    example: true,
    replies: [],
  },
  {
    id: 'coffee-language-exchange',
    authorId: 'example-emma',
    author: 'Emma',
    language: 'en',
    title: 'Anyone up for a language exchange over coffee?',
    content:
      'I would love to meet new friends and practice Korean!\nWe could grab a coffee after class and chat in Korean and English. Beginners are welcome. Leave a comment if you are interested!',
    createdAt: '2026-10-30T08:00:00Z',
    example: true,
    replies: [],
  },
  {
    id: 'movie-night-friends',
    authorId: 'example-alex',
    author: 'Alex',
    language: 'en',
    title: 'What is your favorite Korean movie?',
    content:
      'I have been watching Korean movies to practice listening, and I would love some recommendations.\nComedies and feel-good stories are my favorites. What should I watch next?',
    createdAt: '2026-10-30T06:00:00Z',
    example: true,
    replies: [],
  },
  {
    id: 'campus-life-moments',
    authorId: 'example-xiaoyu',
    author: '小雨',
    language: 'zh',
    title: '分享一下我的校园生活',
    content:
      '来韩国留学一个月了，慢慢适应了这里的校园生活。\n最近喜欢下课后去图书馆看书，再和朋友一起吃晚饭。大家平时都喜欢做什么？欢迎在评论区分享！',
    createdAt: '2026-10-30T02:00:00Z',
    example: true,
    replies: [],
  },
  {
    id: 'weekend-cooking',
    authorId: 'example-wang-chen',
    author: '王晨',
    language: 'zh',
    title: '周末想试着做韩式料理',
    content:
      '这个周末打算自己做泡菜炒饭，已经准备好食材了！\n这是我第一次尝试做韩式料理，有没有简单又好吃的做法推荐？也欢迎大家分享自己家乡的美食。',
    createdAt: '2026-10-29T08:00:00Z',
    example: true,
    replies: [],
  },
]

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
const nonempty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0
const validContent = (value: unknown, max: number): value is string =>
  nonempty(value) && value.length <= max
const validLanguage = (value: unknown): value is FreeBoardLanguage =>
  value === 'ko' || value === 'en' || value === 'zh'

function validEntry(value: unknown): value is FreeBoardReply {
  return (
    record(value) &&
    ['id', 'authorId', 'author', 'createdAt'].every((key) =>
      nonempty(value[key]),
    ) &&
    validLanguage(value.language) &&
    Number.isFinite(Date.parse(String(value.createdAt))) &&
    nonempty(value.content)
  )
}

function validReply(value: unknown): value is FreeBoardReply {
  return validEntry(value) && validContent(value.content, 1000)
}

function validPost(value: unknown): value is FreeBoardPost {
  return (
    record(value) &&
    validEntry(value) &&
    validContent(value.content, 3000) &&
    validContent(value.title, 80) &&
    typeof value.example === 'boolean' &&
    Array.isArray(value.replies) &&
    value.replies.every(validReply)
  )
}

export function loadFreeBoard(storage: StorageLike): FreeBoardPost[] {
  const raw = storage.getItem(FREE_BOARD_KEY)
  if (raw === null) return structuredClone(examplePosts)
  const data: unknown = JSON.parse(raw)
  if (
    !record(data) ||
    data.version !== 1 ||
    !Array.isArray(data.posts) ||
    !data.posts.every(validPost)
  )
    throw new Error('저장된 자유게시판 데이터를 읽을 수 없습니다.')
  return data.posts
}

export function saveFreeBoard(storage: StorageLike, posts: FreeBoardPost[]) {
  if (!posts.every(validPost)) throw new Error('게시글 내용을 확인해 주세요.')
  storage.setItem(FREE_BOARD_KEY, JSON.stringify({ version: 1, posts }))
}

function validateDraft(draft: FreeBoardDraft): FreeBoardDraft {
  if (
    !validContent(draft.title, 80) ||
    !validContent(draft.content, 3000) ||
    !validLanguage(draft.language)
  )
    throw new Error('제목은 1~80자, 내용은 1~3,000자로 입력해 주세요.')
  return {
    title: draft.title.trim(),
    content: draft.content.trim(),
    language: draft.language,
  }
}

function requireAuthor(posts: FreeBoardPost[], id: string, actorId: string) {
  const post = posts.find((item) => item.id === id)
  if (!actorId || !post || post.example || post.authorId !== actorId)
    throw new Error('내가 작성한 글만 수정하거나 삭제할 수 있어요.')
  return post
}

export function createFreeBoardPost(
  posts: FreeBoardPost[],
  actor: FreeBoardActor,
  draft: FreeBoardDraft,
): FreeBoardPost[] {
  if (!nonempty(actor.id) || !nonempty(actor.name))
    throw new Error('작성자 정보를 확인해 주세요.')
  return [
    {
      ...validateDraft(draft),
      id: crypto.randomUUID(),
      authorId: actor.id,
      author: actor.name,
      createdAt: new Date().toISOString(),
      example: false,
      replies: [],
    },
    ...posts,
  ]
}

export function editFreeBoardPost(
  posts: FreeBoardPost[],
  id: string,
  actorId: string,
  draft: FreeBoardDraft,
): FreeBoardPost[] {
  requireAuthor(posts, id, actorId)
  const changes = validateDraft(draft)
  return posts.map((post) => (post.id === id ? { ...post, ...changes } : post))
}

// 댓글 수와 관계없이 본인 글을 삭제한다. 글에 포함된 댓글도 함께 제거된다.
export function deleteFreeBoardPost(
  posts: FreeBoardPost[],
  id: string,
  actorId: string,
): FreeBoardPost[] {
  requireAuthor(posts, id, actorId)
  return posts.filter((post) => post.id !== id)
}

export function addFreeBoardReply(
  posts: FreeBoardPost[],
  postId: string,
  actor: FreeBoardActor,
  content: string,
): FreeBoardPost[] {
  if (!posts.some((post) => post.id === postId))
    throw new Error('게시글을 찾을 수 없어요.')
  if (
    !nonempty(actor.id) ||
    !nonempty(actor.name) ||
    !validLanguage(actor.language)
  )
    throw new Error('작성자 정보를 확인해 주세요.')
  if (!validContent(content, 1000))
    throw new Error('댓글은 1~1,000자로 입력해 주세요.')
  const reply: FreeBoardReply = {
    id: crypto.randomUUID(),
    authorId: actor.id,
    author: actor.name,
    language: actor.language,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  }
  return posts.map((post) =>
    post.id === postId ? { ...post, replies: [...post.replies, reply] } : post,
  )
}

export function updateFreeBoardReply(
  posts: FreeBoardPost[],
  postId: string,
  replyId: string,
  actorId: string,
  action: { type: 'edit'; content: string } | { type: 'delete' },
): FreeBoardPost[] {
  const post = posts.find((item) => item.id === postId)
  const reply = post?.replies.find((item) => item.id === replyId)
  if (!actorId || !reply || reply.authorId !== actorId)
    throw new Error('내가 작성한 댓글만 수정하거나 삭제할 수 있어요.')
  if (action.type === 'edit' && !validContent(action.content, 1000))
    throw new Error('댓글은 1~1,000자로 입력해 주세요.')
  return posts.map((item) =>
    item.id !== postId
      ? item
      : {
          ...item,
          replies:
            action.type === 'delete'
              ? item.replies.filter((reply) => reply.id !== replyId)
              : item.replies.map((reply) =>
                  reply.id === replyId
                    ? { ...reply, content: action.content.trim() }
                    : reply,
                ),
        },
  )
}
