import {
  createDemoReplies,
  mergeDemoReplies,
} from '../community/demo-replies.ts'

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
    replies: createDemoReplies('example-book', '2026-10-28T00:00:00Z', {
      en: 'Could you share the book title and edition? If it matches my course, I would be interested at 10,000 KRW. Would meeting near the library work for you?',
    }),
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
    replies: createDemoReplies('example-lamp', '2026-10-28T01:00:00Z', {
      ko: '사용하지 않는 스탠드가 하나 있어요. 밝기 조절이 되고 작동도 잘 됩니다. 12,000원에 드릴 수 있는데, 사진 먼저 확인해 보실래요?',
      zh: '我有一盏闲置的台灯，能正常使用，也可以调节亮度。12,000韩元可以出，需要的话我先发照片，确认后再约宿舍门口见面。',
    }),
  },
  {
    id: 'example-bike-en',
    authorId: 'example-emma',
    author: 'Emma',
    language: 'en',
    type: 'sell',
    status: 'available',
    title: 'City bike for sale',
    content:
      'I am selling my city bike for 50,000 KRW. The brakes and lights work well.\nWe can meet at the ERICA main gate at 3 PM on November 12. Please check the bike before paying; no advance payment is needed.',
    price: 50000,
    location: 'ERICA main gate',
    createdAt: '2026-11-07T00:00:00Z',
    example: true,
    replies: createDemoReplies('example-bike-en', '2026-11-07T00:00:00Z', {
      zh: '我对这辆50,000韩元的自行车感兴趣。请问车架尺寸是多少？11月12日下午3点在正门见面没问题，我想先检查刹车和车灯，再当面付款。',
    }),
  },
  {
    id: 'example-kettle-en',
    authorId: 'example-alex',
    author: 'Alex',
    language: 'en',
    type: 'buy',
    status: 'available',
    title: 'Looking for a small electric kettle',
    content:
      'I am looking for a clean electric kettle with a capacity of about 1 liter. My budget is up to 15,000 KRW.\nI can pick it up near the dormitory after 6 PM. Please leave a reply with its condition and price.',
    price: 15000,
    location: 'Near the ERICA dormitory',
    createdAt: '2026-11-07T01:00:00Z',
    example: true,
    replies: createDemoReplies('example-kettle-en', '2026-11-07T01:00:00Z', {
      ko: '1리터 전기주전자 하나 있어요. 내부는 세척해 뒀고 10,000원에 드릴 수 있어요. 오후 6시 이후 기숙사 근처에서 확인하고 가져가셔도 됩니다.',
      en: 'I have a one-liter kettle in good working condition. I can offer it for 10,000 KRW and send photos of the inside first. A pickup near the dormitory after 6 PM would work for me.',
    }),
  },
  {
    id: 'example-chair-zh',
    authorId: 'example-xiaoyu',
    author: '小雨',
    language: 'zh',
    type: 'sell',
    status: 'available',
    title: '出售一把二手学习椅（仅椅子）',
    content:
      '出售一把二手学习椅，价格为20,000韩元。只出售椅子，不包含书桌。椅子高度可以调节，没有明显损坏。\n可以在11月13日下午4点到宿舍门口当面交易。请先检查椅子，不需要提前付款。',
    price: 20000,
    location: 'ERICA宿舍门口',
    createdAt: '2026-11-07T02:00:00Z',
    example: true,
    replies: createDemoReplies('example-chair-zh', '2026-11-07T02:00:00Z', {
      ko: '책상 없이 의자만 20,000원인 거 확인했어요. 11월 13일 오후 4시에 기숙사 앞에서 높이 조절이 잘 되는지 확인하고 구매해도 될까요?',
    }),
  },
  {
    id: 'example-backpack-zh',
    authorId: 'example-chen',
    author: 'Chen',
    language: 'zh',
    type: 'buy',
    status: 'available',
    title: '求购能装笔记本电脑的双肩包',
    content:
      '想买一个能装下14英寸笔记本电脑的双肩包，预算为10,000韩元。\n希望拉链完好，肩带没有破损。可以在图书馆门口见面，请在回复中说明价格和使用情况。',
    price: 10000,
    location: 'ERICA图书馆门口',
    createdAt: '2026-11-07T03:00:00Z',
    example: true,
    replies: createDemoReplies('example-backpack-zh', '2026-11-07T03:00:00Z', {
      en: 'I have a backpack with a compartment that fits a 14-inch laptop. The zippers and straps are in good condition, and I am asking 8,000 KRW. I can send photos and meet at the library entrance.',
      zh: '我有一个能放14英寸笔记本电脑的双肩包，拉链和肩带都完好，想卖8,000韩元。可以先发照片，你觉得合适的话，我们再约图书馆门口见面。',
    }),
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
  // 기존 탭의 글·답글은 보존하고 새 외국어 예시만 ID 기준으로 추가한다.
  // 이전 내장 의자 예시의 문구만 갱신하고 저장된 답글과 사용자 글은 유지한다.
  const chair = examplePosts.find((post) => post.id === 'example-chair-zh')!
  const posts = data.posts.map((post) =>
    post.example && post.id === chair.id && post.title === '出售二手书桌椅'
      ? { ...post, title: chair.title, content: chair.content }
      : post,
  )
  const ids = new Set(posts.map((post) => post.id))
  const missing = examplePosts.filter(
    (post) => post.language !== 'ko' && !ids.has(post.id),
  )
  return mergeDemoReplies([...posts, ...structuredClone(missing)], examplePosts)
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
