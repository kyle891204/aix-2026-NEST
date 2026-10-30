import { questionMessages } from './question-messages'
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type FormEvent,
} from 'react'
import {
  Link,
  Outlet,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { useDemoProfile } from '../profile/demo-profile-context'
import {
  editQuestionPost,
  resolveQuestionPost,
  deleteQuestionPost,
  updateQuestionReply,
  type Reply,
  loadQuestion,
  saveQuestion,
  categoryLabels,
  statusLabels,
  languageLabels,
  type QuestionPost,
  type QuestionLanguage,
  type QuestionCategory,
} from './question-store'
import '../market/market.css'

type QuestionContextValue = {
  posts: QuestionPost[]
  commit: (posts: QuestionPost[]) => boolean
  actor: { id: string; name: string; language: QuestionLanguage }
  writable: boolean
}
const QuestionContext = createContext<QuestionContextValue | null>(null)
function useQuestion() {
  const context = useContext(QuestionContext)
  if (!context) throw new Error('질문 화면 안에서 사용하세요.')
  return context
}
export function QuestionLayout() {
  const { session } = useAuth()
  return <QuestionSession key={session?.user?.id ?? 'preview'} />
}
function QuestionSession() {
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
    name: savedProfile?.profile.nickname ?? '체험 사용자',
    language: savedProfile?.profile.language ?? 'ko',
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
            {error}
          </p>
        )}
        <Outlet />
        <p className="market-footnote">
          목업 질문게시판 · 작성한 글과 답글은 이 탭에서만 유지되며 다른
          사용자에게 전송되지 않아요.
        </p>
      </section>
    </QuestionContext.Provider>
  )
}
function Segments<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="market-segments" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
export function QuestionListPage() {
  const { posts } = useQuestion()
  const [query, setQuery] = useSearchParams()
  const category = query.get('category') ?? 'all'
  const status = query.get('status') ?? 'all'
  function filter(key: string, value: string) {
    const next = new URLSearchParams(query)
    next.set(key, value)
    setQuery(next, { replace: true })
  }
  const visible = posts.filter(
    (post) =>
      (category === 'all' || post.category === category) &&
      (status === 'all' || post.status === status),
  )
  return (
    <>
      <p className="market-eyebrow">L04</p>
      <h1>질문게시판</h1>
      <p className="market-intro">궁금한 점을 나누고 함께 답을 찾아요.</p>
      <div className="market-count">
        <strong aria-live="polite">총 {visible.length}건</strong>
        <span>예시 데이터 · 탭 저장</span>
      </div>
      <Segments
        label="질문 카테고리"
        value={category}
        onChange={(v) => filter('category', v)}
        options={[
          { value: 'all', label: '전체' },
          { value: 'school', label: '학교생활' },
          { value: 'class', label: '수업' },
          { value: 'life', label: '생활' },
        ]}
      />
      <Segments
        label="해결 상태"
        value={status}
        onChange={(v) => filter('status', v)}
        options={[
          { value: 'all', label: '전체 상태' },
          { value: 'unresolved', label: '미해결' },
          { value: 'resolved', label: '해결' },
        ]}
      />
      <Link className="market-primary" to="new">
        질문하기
      </Link>
      <div className="market-list">
        {visible.map((post) => (
          <Link className="market-card" key={post.id} to={post.id}>
            <p className="market-meta">
              {post.author} · {post.example ? '예시 사용자' : '작성자'}
            </p>
            <h2>{post.title}</h2>
            <p className="market-excerpt">{post.content.split('\n')[0]}</p>
            <p className="market-meta">
              원문 · {languageLabels[post.language]} |{' '}
              {categoryLabels[post.category]} · {statusLabels[post.status]}
              {` · 답글 ${post.replies.length}`}
            </p>
          </Link>
        ))}
      </div>
      {!visible.length && (
        <div className="market-card market-empty">
          <h2>아직 해당하는 글이 없어요</h2>
          <p>다른 필터를 선택하거나 첫 글을 남겨보세요.</p>
          <button onClick={() => setQuery({})}>전체 글 보기</button>
        </div>
      )}
    </>
  )
}
function MissingPost({ children }: { children?: ReactNode }) {
  return (
    <>
      <h1>{children ?? '게시글을 찾을 수 없어요'}</h1>
      <Link className="market-back" to="/life/questions">
        ← 질문 목록
      </Link>
    </>
  )
}
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  }).format(new Date(date))
export function QuestionDetailPage() {
  const { postId } = useParams()
  const { posts, actor, commit, writable } = useQuestion()
  const [reply, setReply] = useState('')
  const navigate = useNavigate()
  const [confirmation, setConfirmation] = useState<'resolve' | 'delete' | null>(
    null,
  )
  const [actionError, setActionError] = useState('')
  const labels = questionMessages[actor.language]
  function confirmAction() {
    if (!post || !confirmation || !writable) return
    try {
      const next =
        confirmation === 'resolve'
          ? resolveQuestionPost(posts, post.id, actor.id)
          : deleteQuestionPost(posts, post.id, actor.id)
      if (commit(next)) {
        if (confirmation === 'delete')
          navigate('/life/questions', { replace: true })
        setConfirmation(null)
        setActionError('')
      }
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : '변경하지 못했어요.',
      )
    }
  }

  const post = posts.find((item) => item.id === postId)
  if (!post) return <MissingPost />
  function submitReply(event: FormEvent) {
    event.preventDefault()
    if (!reply.trim() || !post) return
    const entry = {
      id: crypto.randomUUID(),
      authorId: actor.id,
      author: actor.name,
      language: actor.language,
      content: reply.trim(),
      createdAt: new Date().toISOString(),
    }
    if (
      commit(
        posts.map((item) =>
          item.id === post.id
            ? { ...item, replies: [...item.replies, entry] }
            : item,
        ),
      )
    )
      setReply('')
  }
  return (
    <>
      <Link className="market-back" to="/life/questions">
        ← 질문 목록
      </Link>
      <article className="market-card market-detail">
        <p className="market-meta">
          {post.author} · {post.example ? '예시 사용자' : '작성자'}
        </p>
        <span className="market-badge">
          {categoryLabels[post.category]} · {statusLabels[post.status]}
        </span>
        <h1>{post.title}</h1>

        <p className="market-meta">
          {dateLabel(post.createdAt)} · KST · {languageLabels[post.language]}{' '}
          원문
        </p>
        <p className="market-body">{post.content}</p>

        {!post.example &&
          post.authorId === actor.id &&
          (post.status === 'resolved' ? (
            <p className="market-meta" role="status">
              {labels.locked}
            </p>
          ) : (
            <div>
              <button
                className="market-secondary"
                disabled={!writable || post.replies.length === 0}
                onClick={() => {
                  setConfirmation('resolve')
                  setActionError('')
                }}
              >
                {labels.resolve}
              </button>
              <Link className="market-secondary" to="edit">
                {labels.edit}
              </Link>
              <button
                className="market-secondary"
                disabled={!writable || post.replies.length > 0}
                onClick={() => {
                  setConfirmation('delete')
                  setActionError('')
                }}
              >
                {labels.remove}
              </button>
              <p className="market-meta">
                {post.replies.length === 0
                  ? labels.noReplies
                  : labels.hasReplies}
              </p>
              {confirmation && (
                <section
                  className="market-card"
                  role="alertdialog"
                  aria-labelledby="question-confirm-message"
                  aria-describedby="question-confirm-lock"
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') setConfirmation(null)
                  }}
                >
                  <p id="question-confirm-message">
                    {confirmation === 'resolve'
                      ? labels.resolvePrompt
                      : labels.deletePrompt}
                  </p>
                  <p id="question-confirm-lock">
                    {confirmation === 'resolve' ? labels.locked : ''}
                  </p>
                  <div className="market-reply-actions">
                    <button
                      type="button"
                      disabled={
                        !writable ||
                        (confirmation === 'resolve'
                          ? post.replies.length === 0
                          : post.replies.length > 0)
                      }
                      onClick={confirmAction}
                    >
                      {labels.confirm}
                    </button>
                    <button
                      type="button"
                      autoFocus
                      onClick={() => {
                        setConfirmation(null)
                        setActionError('')
                      }}
                    >
                      {labels.cancel}
                    </button>
                  </div>
                </section>
              )}
              {actionError && (
                <p className="market-error" role="alert">
                  {actionError}
                </p>
              )}
            </div>
          ))}
      </article>
      <section className="market-replies">
        <h2>답글 {post.replies.length}</h2>
        {!post.replies.length && (
          <p className="market-meta">
            아는 정보가 있다면 첫 답글을 남겨주세요.
          </p>
        )}
        {post.replies.map((item) => (
          <QuestionReplyCard key={item.id} postId={post.id} reply={item} />
        ))}
        <form onSubmit={submitReply}>
          <label>
            답글 작성
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              maxLength={1000}
              required
              rows={3}
              placeholder="질문에 도움이 되는 답글을 남겨주세요."
            />
          </label>
          <button
            className="market-primary"
            disabled={!writable || !reply.trim()}
          >
            답글 등록
          </button>
        </form>
      </section>
    </>
  )
}
function QuestionReplyCard({
  postId,
  reply,
}: {
  postId: string
  reply: Reply
}) {
  const { posts, actor, commit, writable } = useQuestion()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(reply.content)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const canManage =
    writable &&
    actor.id === reply.authorId &&
    posts.some((post) => post.id === postId && post.status === 'unresolved')
  function apply(
    action: { type: 'edit'; content: string } | { type: 'delete' },
  ) {
    if (!canManage) return
    try {
      if (
        commit(updateQuestionReply(posts, postId, reply.id, actor.id, action))
      ) {
        setEditing(false)
        setDeleting(false)
        setError('')
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : '답글 변경에 실패했어요.',
      )
    }
  }
  return (
    <article className="market-card">
      <p className="market-meta">
        {reply.author} · {languageLabels[reply.language]} 원문
      </p>
      {editing && canManage ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            apply({ type: 'edit', content: draft })
          }}
        >
          <label>
            답글 수정
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={1000}
              required
              rows={3}
              autoFocus
            />
          </label>
          <div className="market-reply-actions">
            <button type="submit" disabled={!draft.trim()}>
              저장
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false)
                setError('')
              }}
            >
              취소
            </button>
          </div>
        </form>
      ) : (
        <p className="market-body">{reply.content}</p>
      )}
      <p className="market-meta">{dateLabel(reply.createdAt)} · KST</p>
      {canManage &&
        !editing &&
        (deleting ? (
          <div>
            <p>이 답글을 삭제할까요?</p>
            <div className="market-reply-actions">
              <button type="button" onClick={() => apply({ type: 'delete' })}>
                삭제 확인
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleting(false)
                  setError('')
                }}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="market-reply-actions">
            <button
              type="button"
              onClick={() => {
                setDraft(reply.content)
                setEditing(true)
                setError('')
              }}
            >
              수정
            </button>
            <button type="button" onClick={() => setDeleting(true)}>
              삭제
            </button>
          </div>
        ))}
      {error && (
        <p className="market-error" role="alert">
          {error}
        </p>
      )}
    </article>
  )
}
export function QuestionFormPage() {
  const { postId } = useParams()
  const { posts, actor } = useQuestion()
  const existing = posts.find((post) => post.id === postId)
  if (postId && !existing) return <MissingPost />
  if (existing && (existing.example || existing.authorId !== actor.id))
    return <MissingPost>내가 작성한 글만 수정할 수 있어요</MissingPost>
  if (existing?.status === 'resolved')
    return <MissingPost>{questionMessages[actor.language].locked}</MissingPost>
  return <QuestionForm key={postId ?? 'new'} existing={existing} />
}
function QuestionForm({ existing }: { existing?: QuestionPost }) {
  const { posts, actor, commit, writable } = useQuestion()
  const navigate = useNavigate()
  const [category, setCategory] = useState<QuestionCategory>(
    existing?.category ?? 'school',
  )
  const [title, setTitle] = useState(existing?.title ?? '')
  const [content, setContent] = useState(existing?.content ?? '')
  const [language, setLanguage] = useState<QuestionLanguage>(
    existing?.language ?? actor.language,
  )
  const [error, setError] = useState('')
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 입력해 주세요.')
      return
    }
    const changes = {
      category,
      title: title.trim(),
      content: content.trim(),
      language,
    }
    const id = existing?.id ?? crypto.randomUUID()
    const next = existing
      ? editQuestionPost(posts, id, actor.id, changes)
      : [
          {
            ...changes,
            status: 'unresolved' as const,
            id,
            authorId: actor.id,
            author: actor.name,
            createdAt: new Date().toISOString(),
            example: false,
            replies: [],
          },
          ...posts,
        ]
    if (commit(next)) navigate(`/life/questions/${id}`, { replace: true })
  }
  return (
    <>
      <Link
        className="market-back"
        to={existing ? `/life/questions/${existing.id}` : '/life/questions'}
      >
        ← {existing ? '게시글로 돌아가기' : '질문 목록'}
      </Link>
      <h1>{existing ? '질문 글 수정' : '질문하기'}</h1>
      <p className="market-intro">상황과 궁금한 점을 자세히 알려주세요.</p>
      <form className="market-form" onSubmit={submit}>
        <Segments
          label="질문 카테고리"
          value={category}
          onChange={setCategory}
          options={[
            { value: 'school', label: '학교생활' },
            { value: 'class', label: '수업' },
            { value: 'life', label: '생활' },
          ]}
        />
        <label>
          제목
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={80}
            placeholder="어떤 점이 궁금한가요?"
          />
        </label>
        <label>
          작성 언어
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as QuestionLanguage)}
          >
            {Object.entries(languageLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          내용
          <textarea
            rows={7}
            required
            maxLength={3000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="질문의 배경과 궁금한 내용을 적어주세요."
          />
        </label>
        {error && (
          <p className="market-error" role="alert">
            {error}
          </p>
        )}
        <button className="market-primary" disabled={!writable}>
          {existing ? '수정 내용 저장' : '글 등록'}
        </button>
      </form>
    </>
  )
}
