export type TradeType = 'sell' | 'buy'
export type TradeStatus = 'available' | 'completed'
export type MarketLanguage = 'ko' | 'en' | 'zh'
export interface Reply {
  id: string
  authorId: string
  author: string
  language: MarketLanguage
  content: string
  createdAt: string
}
export interface MarketPost {
  id: string
  authorId: string
  author: string
  language: MarketLanguage
  type: TradeType
  status: TradeStatus
  title: string
  content: string
  price: number
  location: string
  createdAt: string
  example: boolean
  replies: Reply[]
}
export const MARKET_KEY = 'nest:market-demo:v1'
export const typeLabels = { sell: '판매', buy: '구매' }
export const statusLabels = { available: '판매중', completed: '판매완료' }
export const languageLabels = { ko: '한국어', en: 'English', zh: '中文' }
export const examplePosts: MarketPost[] = [
  {
    id: 'example-book',
    authorId: 'example-lin',
    author: 'Lin',
    language: 'ko',
    type: 'sell',
    status: 'available',
    title: '전공 도서 판매합니다',
    content:
      '수업에서 사용한 전공 도서를 판매합니다.\n필기는 거의 없고 깨끗하게 사용했어요.\n직거래 장소는 답글에서 협의해요.',
    price: 10000,
    location: 'ERICA 캠퍼스',
    createdAt: '2026-10-28T00:00:00Z',
    example: true,
    replies: [],
  },
  {
    id: 'example-lamp',
    authorId: 'example-lin',
    author: 'Lin',
    language: 'ko',
    type: 'buy',
    status: 'available',
    title: '책상용 스탠드 구해요',
    content:
      '기숙사에서 사용할 스탠드를 찾고 있어요.\n작동이 잘 되는 제품이면 좋아요.',
    price: 15000,
    location: '기숙사 앞',
    createdAt: '2026-10-28T01:00:00Z',
    example: true,
    replies: [],
  },
]
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null
const text = (v: unknown): v is string => typeof v === 'string'
function validReply(v: unknown): v is Reply {
  return (
    record(v) &&
    ['id', 'authorId', 'author', 'content', 'createdAt'].every((k) =>
      text(v[k]),
    ) &&
    ['ko', 'en', 'zh'].includes(String(v.language)) &&
    Number.isFinite(Date.parse(String(v.createdAt)))
  )
}
function validPost(v: unknown): v is MarketPost {
  return (
    record(v) &&
    validReply({ ...v, content: v.content }) &&
    text(v.title) &&
    text(v.location) &&
    ['sell', 'buy'].includes(String(v.type)) &&
    ['available', 'completed'].includes(String(v.status)) &&
    typeof v.price === 'number' &&
    Number.isSafeInteger(v.price) &&
    v.price >= 0 &&
    typeof v.example === 'boolean' &&
    Array.isArray(v.replies) &&
    v.replies.every(validReply)
  )
}
export function loadMarket(storage: StorageLike): MarketPost[] {
  const raw = storage.getItem(MARKET_KEY)
  if (raw === null) return structuredClone(examplePosts)
  const data: unknown = JSON.parse(raw)
  if (
    !record(data) ||
    data.version !== 1 ||
    !Array.isArray(data.posts) ||
    !data.posts.every(validPost)
  )
    throw new Error('저장된 장터 데이터를 읽을 수 없습니다.')
  return data.posts
}
export function saveMarket(storage: StorageLike, posts: MarketPost[]) {
  if (!posts.every(validPost)) throw new Error('게시글 내용을 확인해 주세요.')
  storage.setItem(MARKET_KEY, JSON.stringify({ version: 1, posts }))
}
export function editMarketPost(
  posts: MarketPost[],
  id: string,
  actorId: string,
  changes: Pick<
    MarketPost,
    'type' | 'status' | 'title' | 'content' | 'price' | 'location' | 'language'
  >,
) {
  const post = posts.find((item) => item.id === id)
  if (!post || post.authorId !== actorId || post.example)
    throw new Error('내가 작성한 글만 수정할 수 있어요.')
  return posts.map((item) => (item.id === id ? { ...item, ...changes } : item))
}

export function updateMarketReply(
  posts: MarketPost[],
  postId: string,
  replyId: string,
  actorId: string,
  action: { type: 'edit'; content: string } | { type: 'delete' },
): MarketPost[] {
  const post = posts.find((item) => item.id === postId)
  const reply = post?.replies.find((item) => item.id === replyId)
  if (!actorId || !reply || reply.authorId !== actorId)
    throw new Error('내가 작성한 답글만 수정하거나 삭제할 수 있어요.')
  if (
    action.type === 'edit' &&
    (!action.content.trim() || action.content.length > 1000)
  )
    throw new Error('답글은 1~1,000자로 입력해 주세요.')
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
