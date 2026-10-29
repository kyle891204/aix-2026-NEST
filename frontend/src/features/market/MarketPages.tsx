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
  editMarketPost,
  updateMarketReply,
  type Reply,
  loadMarket,
  saveMarket,
  typeLabels,
  statusLabels,
  languageLabels,
  type MarketPost,
  type MarketLanguage,
  type TradeType,
  type TradeStatus,
} from './market-store'
import './market.css'

type MarketContextValue = {
  posts: MarketPost[]
  commit: (posts: MarketPost[]) => boolean
  actor: { id: string; name: string; language: MarketLanguage }
  writable: boolean
}
const MarketContext = createContext<MarketContextValue | null>(null)
function useMarket() {
  const context = useContext(MarketContext)
  if (!context) throw new Error('장터 화면 안에서 사용하세요.')
  return context
}
export function MarketLayout() {
  const { session } = useAuth()
  return <MarketSession key={session?.user?.id ?? 'preview'} />
}
function MarketSession() {
  const { session } = useAuth()
  const { savedProfile } = useDemoProfile()
  const [initial] = useState(() => {
    try {
      return { posts: loadMarket(window.sessionStorage), error: '' }
    } catch {
      return {
        posts: [] as MarketPost[],
        error:
          '이 탭의 장터 데이터를 불러오지 못했어요. 저장소 설정을 확인하고 새로고침해 주세요.',
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
  function commit(next: MarketPost[]) {
    if (!writable) return false
    try {
      saveMarket(window.sessionStorage, next)
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
    <MarketContext.Provider value={{ posts, commit, actor, writable }}>
      <section className="market-page">
        {error && (
          <p className="market-error" role="alert">
            {error}
          </p>
        )}
        <Outlet />
        <p className="market-footnote">
          목업 장터 · 작성한 글과 답글은 이 탭에서만 유지되며 다른 사용자에게
          전송되지 않아요.
        </p>
      </section>
    </MarketContext.Provider>
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
export function MarketListPage() {
  const { posts } = useMarket()
  const [query, setQuery] = useSearchParams()
  const type = query.get('type') ?? 'all'
  const status = query.get('status') ?? 'all'
  function filter(key: string, value: string) {
    const next = new URLSearchParams(query)
    next.set(key, value)
    setQuery(next, { replace: true })
  }
  const visible = posts.filter(
    (post) =>
      (type === 'all' || post.type === type) &&
      (status === 'all' || post.status === status),
  )
  return (
    <>
      <p className="market-eyebrow">L03</p>
      <h1>장터게시판</h1>
      <p className="market-intro">유학생끼리 필요한 물건을 나눠요.</p>
      <div className="market-count">
        <strong aria-live="polite">총 {visible.length}건</strong>
        <span>예시 데이터 · 탭 저장</span>
      </div>
      <Segments
        label="거래 유형"
        value={type}
        onChange={(v) => filter('type', v)}
        options={[
          { value: 'all', label: '전체' },
          { value: 'sell', label: '판매' },
          { value: 'buy', label: '구매' },
        ]}
      />
      <Segments
        label="거래 상태"
        value={status}
        onChange={(v) => filter('status', v)}
        options={[
          { value: 'all', label: '전체 상태' },
          { value: 'available', label: '판매중' },
          { value: 'completed', label: '판매완료' },
        ]}
      />
      <Link className="market-primary" to="new">
        판매·구매 글쓰기
      </Link>
      <div className="market-list">
        {visible.map((post) => (
          <Link className="market-card" key={post.id} to={post.id}>
            <p className="market-meta">
              {post.author} · {post.example ? '예시 사용자' : '작성자'}
            </p>
            <h2>
              [{typeLabels[post.type]}] {post.title}
            </h2>
            <p>
              가격: {post.example && '예시 '}
              {post.price.toLocaleString('ko-KR')}원
            </p>
            <p className="market-excerpt">{post.content.split('\n')[0]}</p>
            <p className="market-meta">
              원문 · {languageLabels[post.language]} |{' '}
              {statusLabels[post.status]}
              {post.replies.length > 0 && ` · 답글 ${post.replies.length}`}
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
      <Link className="market-back" to="/life/market">
        ← 장터 목록
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
export function MarketDetailPage() {
  const { postId } = useParams()
  const { posts, actor, commit, writable } = useMarket()
  const [reply, setReply] = useState('')
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
      <Link className="market-back" to="/life/market">
        ← 장터 목록
      </Link>
      <article className="market-card market-detail">
        <p className="market-meta">
          {post.author} · {post.example ? '예시 사용자' : '작성자'}
        </p>
        <span className="market-badge">{statusLabels[post.status]}</span>
        <h1>
          [{typeLabels[post.type]}] {post.title}
        </h1>
        <p className="market-price">{post.price.toLocaleString('ko-KR')}원</p>
        <p className="market-meta">
          {dateLabel(post.createdAt)} · KST · {languageLabels[post.language]}{' '}
          원문
        </p>
        <p className="market-body">{post.content}</p>
        <p>거래 희망 장소: {post.location || '답글에서 협의'}</p>
        {!post.example && post.authorId === actor.id && (
          <Link className="market-secondary" to="edit">
            글·거래 상태 수정
          </Link>
        )}
      </article>
      <section className="market-replies">
        <h2>답글 {post.replies.length}</h2>
        {!post.replies.length && (
          <p className="market-meta">궁금한 점이나 거래 의사를 남겨보세요.</p>
        )}
        {post.replies.map((item) => (
          <MarketReplyCard key={item.id} postId={post.id} reply={item} />
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
              placeholder="거래에 관해 궁금한 내용을 남겨주세요."
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
function MarketReplyCard({ postId, reply }: { postId: string; reply: Reply }) {
  const { posts, actor, commit, writable } = useMarket()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(reply.content)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const canManage = writable && actor.id === reply.authorId
  function apply(
    action: { type: 'edit'; content: string } | { type: 'delete' },
  ) {
    if (!canManage) return
    try {
      if (
        commit(updateMarketReply(posts, postId, reply.id, actor.id, action))
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
export function MarketFormPage() {
  const { postId } = useParams()
  const { posts, actor } = useMarket()
  const existing = posts.find((post) => post.id === postId)
  if (postId && !existing) return <MissingPost />
  if (existing && (existing.example || existing.authorId !== actor.id))
    return <MissingPost>내가 작성한 글만 수정할 수 있어요</MissingPost>
  return <MarketForm key={postId ?? 'new'} existing={existing} />
}
function MarketForm({ existing }: { existing?: MarketPost }) {
  const { posts, actor, commit, writable } = useMarket()
  const navigate = useNavigate()
  const [type, setType] = useState<TradeType>(existing?.type ?? 'sell')
  const [status, setStatus] = useState<TradeStatus>(
    existing?.status ?? 'available',
  )
  const [title, setTitle] = useState(existing?.title ?? '')
  const [content, setContent] = useState(existing?.content ?? '')
  const [price, setPrice] = useState(existing ? String(existing.price) : '')
  const [location, setLocation] = useState(existing?.location ?? '')
  const [language, setLanguage] = useState<MarketLanguage>(
    existing?.language ?? actor.language,
  )
  const [error, setError] = useState('')
  function submit(event: FormEvent) {
    event.preventDefault()
    const amount = Number(price)
    if (
      !title.trim() ||
      !content.trim() ||
      !price.trim() ||
      !Number.isSafeInteger(amount) ||
      amount < 0 ||
      amount > 999999999
    ) {
      setError('제목·내용과 올바른 가격(0~999,999,999원)을 입력해 주세요.')
      return
    }
    const changes = {
      type,
      status,
      title: title.trim(),
      content: content.trim(),
      price: amount,
      location: location.trim(),
      language,
    }
    const id = existing?.id ?? crypto.randomUUID()
    const next = existing
      ? editMarketPost(posts, id, actor.id, changes)
      : [
          {
            ...changes,
            id,
            authorId: actor.id,
            author: actor.name,
            createdAt: new Date().toISOString(),
            example: false,
            replies: [],
          },
          ...posts,
        ]
    if (commit(next)) navigate(`/life/market/${id}`, { replace: true })
  }
  return (
    <>
      <Link
        className="market-back"
        to={existing ? `/life/market/${existing.id}` : '/life/market'}
      >
        ← {existing ? '게시글로 돌아가기' : '장터 목록'}
      </Link>
      <h1>{existing ? '장터 글 수정' : '판매·구매 글쓰기'}</h1>
      <p className="market-intro">물건과 거래 조건을 자세히 알려주세요.</p>
      <form className="market-form" onSubmit={submit}>
        <Segments
          label="거래 유형"
          value={type}
          onChange={setType}
          options={[
            { value: 'sell', label: '판매' },
            { value: 'buy', label: '구매' },
          ]}
        />
        <label>
          제목
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={80}
            placeholder="어떤 물건을 판매하거나 구하시나요?"
          />
        </label>
        <label>
          가격 (원)
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="999999999"
            step="1"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="예: 10000 (무료 나눔은 0)"
          />
        </label>
        <label>
          거래 상태
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TradeStatus)}
          >
            <option value="available">판매중</option>
            <option value="completed">판매완료</option>
          </select>
        </label>
        <label>
          작성 언어
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as MarketLanguage)}
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
            placeholder="물건 상태, 거래 방법 등을 적어주세요."
          />
        </label>
        <label>
          거래 희망 장소 (선택)
          <input
            value={location}
            maxLength={100}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="예: 도서관 앞"
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
