export type QuestionCategory = 'school' | 'class' | 'life'
export type QuestionStatus = 'unresolved' | 'resolved'
export type QuestionLanguage = 'ko' | 'en' | 'zh'
export interface Reply {
  id: string
  authorId: string
  author: string
  language: QuestionLanguage
  content: string
  createdAt: string
}
export interface QuestionPost {
  id: string
  authorId: string
  author: string
  language: QuestionLanguage
  category: QuestionCategory
  status: QuestionStatus
  title: string
  content: string
  createdAt: string
  example: boolean
  replies: Reply[]
}
export const QUESTIONS_KEY = 'nest:questions-demo:v1'
export const categoryLabels = {
  school: '학교생활',
  class: '수업',
  life: '생활',
}
export const statusLabels = { unresolved: '미해결', resolved: '해결' }
export const languageLabels = { ko: '한국어', en: 'English', zh: '中文' }
export const examplePosts: QuestionPost[] = [
  {
    id: 'student-card',
    authorId: 'example-lin',
    author: 'Lin',
    language: 'ko',
    category: 'school',
    status: 'unresolved',
    title: '학생증은 어디에서 발급받나요?',
    content: '이번 학기에 입학했어요. 어디에서 신청하나요?',
    createdAt: '2026-10-30T00:00:00Z',
    example: true,
    replies: [],
  },
  {
    id: 'team-project',
    authorId: 'example-lin',
    author: 'Lin',
    language: 'ko',
    category: 'class',
    status: 'unresolved',
    title: '팀 프로젝트 팀원은 어떻게 구하나요?',
    content: '아직 아는 사람이 많지 않아요. 좋은 방법이 있을까요?',
    createdAt: '2026-10-30T01:00:00Z',
    example: true,
    replies: [],
  },
  {
    id: 'example-library-en',
    authorId: 'example-emma',
    author: 'Emma',
    language: 'en',
    category: 'school',
    status: 'unresolved',
    title: 'How can I reserve a group study room?',
    content:
      'Our group has four students and wants to study at the library from 3 PM to 5 PM on November 12.\nDo we need to reserve a room online, and does everyone need to bring a student ID?',
    createdAt: '2026-11-07T00:00:00Z',
    example: true,
    replies: [],
  },
  {
    id: 'example-assignment-en',
    authorId: 'example-alex',
    author: 'Alex',
    language: 'en',
    category: 'class',
    status: 'unresolved',
    title: 'Does saving a draft count as submitting an assignment?',
    content:
      'My assignment is due at 11:59 PM on November 15. I uploaded a PDF, but the page still says it is a draft.\nDo I need to press a separate submit button? I want to check the submission status before the deadline.',
    createdAt: '2026-11-07T01:00:00Z',
    example: true,
    replies: [],
  },
  {
    id: 'example-bus-zh',
    authorId: 'example-xiaoyu',
    author: '小雨',
    language: 'zh',
    category: 'life',
    status: 'unresolved',
    title: '周末怎么从学校去地铁站？',
    content:
      '我想在11月14日星期六上午9点从ERICA校区去地铁站。\n周末有校车吗？如果没有，应该在哪里乘坐公交车？请告诉我在哪里可以查看最新时刻表。',
    createdAt: '2026-11-07T02:00:00Z',
    example: true,
    replies: [],
  },
  {
    id: 'example-presentation-zh',
    authorId: 'example-chen',
    author: 'Chen',
    language: 'zh',
    category: 'class',
    status: 'unresolved',
    title: '小组展示需要每个人都发言吗？',
    content:
      '我们小组有三个人，计划在11月16日进行10分钟的课堂展示。\n一般需要每个人都发言吗？我还不太熟悉韩语，想先和组员分配好时间，再向老师确认要求。',
    createdAt: '2026-11-07T03:00:00Z',
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
function validPost(v: unknown): v is QuestionPost {
  return (
    record(v) &&
    validReply({ ...v, content: v.content }) &&
    text(v.title) &&
    ['school', 'class', 'life'].includes(String(v.category)) &&
    ['unresolved', 'resolved'].includes(String(v.status)) &&
    typeof v.example === 'boolean' &&
    Array.isArray(v.replies) &&
    v.replies.every(validReply)
  )
}
export function loadQuestion(storage: StorageLike): QuestionPost[] {
  const raw = storage.getItem(QUESTIONS_KEY)
  if (raw === null) return structuredClone(examplePosts)
  const data: unknown = JSON.parse(raw)
  if (
    !record(data) ||
    data.version !== 1 ||
    !Array.isArray(data.posts) ||
    !data.posts.every(validPost)
  )
    throw new Error('저장된 질문게시판 데이터를 읽을 수 없습니다.')
  // 기존 탭의 글·답글은 보존하고 새 외국어 예시만 ID 기준으로 추가한다.
  const ids = new Set(data.posts.map((post) => post.id))
  const missing = examplePosts.filter(
    (post) => post.language !== 'ko' && !ids.has(post.id),
  )
  return [...data.posts, ...structuredClone(missing)]
}
export function saveQuestion(storage: StorageLike, posts: QuestionPost[]) {
  if (!posts.every(validPost)) throw new Error('게시글 내용을 확인해 주세요.')
  storage.setItem(QUESTIONS_KEY, JSON.stringify({ version: 1, posts }))
}
export function editQuestionPost(
  posts: QuestionPost[],
  id: string,
  actorId: string,
  changes: Pick<QuestionPost, 'category' | 'title' | 'content' | 'language'>,
) {
  const post = posts.find((item) => item.id === id)
  if (
    !post ||
    !actorId ||
    post.authorId !== actorId ||
    post.example ||
    post.status === 'resolved'
  )
    throw new Error('내가 작성한 글만 수정할 수 있어요.')
  return posts.map((item) =>
    item.id === id
      ? {
          ...item,
          category: changes.category,
          title: changes.title,
          content: changes.content,
          language: changes.language,
        }
      : item,
  )
}

export function updateQuestionReply(
  posts: QuestionPost[],
  postId: string,
  replyId: string,
  actorId: string,
  action: { type: 'edit'; content: string } | { type: 'delete' },
): QuestionPost[] {
  const post = posts.find((item) => item.id === postId)
  const reply = post?.replies.find((item) => item.id === replyId)
  if (post?.status === 'resolved')
    throw new Error('해결된 질문의 답글은 수정하거나 삭제할 수 없어요.')
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

export function resolveQuestionPost(
  posts: QuestionPost[],
  id: string,
  actorId: string,
): QuestionPost[] {
  const post = posts.find((item) => item.id === id)
  if (
    !post ||
    !actorId ||
    post.authorId !== actorId ||
    post.example ||
    post.status === 'resolved' ||
    post.replies.length === 0
  )
    throw new Error('답글이 있는 본인의 미해결 질문만 해결로 표시할 수 있어요.')
  return posts.map((item) =>
    item.id === id ? { ...item, status: 'resolved' } : item,
  )
}
export function deleteQuestionPost(
  posts: QuestionPost[],
  id: string,
  actorId: string,
): QuestionPost[] {
  const post = posts.find((item) => item.id === id)
  if (
    !post ||
    !actorId ||
    post.authorId !== actorId ||
    post.example ||
    post.status === 'resolved' ||
    post.replies.length > 0
  )
    throw new Error('답글이 없는 본인의 미해결 질문만 삭제할 수 있어요.')
  return posts.filter((item) => item.id !== id)
}
