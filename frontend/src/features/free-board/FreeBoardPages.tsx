import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useFreeBoard } from './free-board-context'
import { FreeBoardReplyCard } from './FreeBoardReplyCard'
import {
  addFreeBoardReply,
  createFreeBoardPost,
  deleteFreeBoardPost,
  editFreeBoardPost,
  languageLabels,
  type FreeBoardLanguage,
  type FreeBoardPost,
} from './free-board-store'
import { dateLabel } from './free-board-format'

export { FreeBoardLayout } from './FreeBoardLayout'

export function FreeBoardListPage() {
  const { posts, writable } = useFreeBoard()
  return (
    <>
      <p className="market-eyebrow">L02</p>
      <h1>자유게시판</h1>
      <p className="market-intro">
        일상과 정보, 함께 나누고 싶은 이야기를 남겨요.
      </p>
      <div className="market-count">
        <strong aria-live="polite">총 {posts.length}건</strong>
        <span>예시 데이터 · 탭 저장</span>
      </div>
      {writable && (
        <Link className="market-primary" to="new">
          글쓰기
        </Link>
      )}
      <div className="market-list">
        {posts.map((post) => (
          <Link className="market-card" key={post.id} to={post.id}>
            <p className="market-meta">
              {post.author} · {post.example ? '예시 사용자' : '작성자'}
            </p>
            <h2>{post.title}</h2>
            <p className="market-excerpt">{post.content.split('\n')[0]}</p>
            <p className="market-meta">
              {languageLabels[post.language]} 원문 · 댓글 {post.replies.length}
            </p>
            <p className="market-meta">{dateLabel(post.createdAt)} · KST</p>
          </Link>
        ))}
      </div>
      {!posts.length && (
        <div className="market-card market-empty">
          <h2>아직 게시글이 없어요</h2>
          <p>첫 이야기를 남겨보세요.</p>
        </div>
      )}
    </>
  )
}

function MissingPost({ message = '게시글을 찾을 수 없어요' }) {
  return (
    <>
      <h1>{message}</h1>
      <Link className="market-back" to="/life/free">
        ← 자유게시판 목록
      </Link>
    </>
  )
}

export function FreeBoardDetailPage() {
  const { postId } = useParams()
  const { posts } = useFreeBoard()
  const post = posts.find((item) => item.id === postId)
  if (!post) return <MissingPost />
  // 같은 상세 경로에서 다른 글로 이동하면 댓글 입력과 삭제 확인을 초기화한다.
  return <FreeBoardDetail key={post.id} post={post} />
}

function FreeBoardDetail({ post }: { post: FreeBoardPost }) {
  const { posts, actor, writable, commit } = useFreeBoard()
  const navigate = useNavigate()
  const [reply, setReply] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const canManage = writable && !post.example && post.authorId === actor.id

  function deletePost() {
    if (!canManage) return
    try {
      if (commit(deleteFreeBoardPost(posts, post.id, actor.id)))
        navigate('/life/free', { replace: true })
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : '글을 삭제하지 못했어요.',
      )
    }
  }

  function submitReply(event: FormEvent) {
    event.preventDefault()
    if (!writable) return
    try {
      if (commit(addFreeBoardReply(posts, post.id, actor, reply))) {
        setReply('')
        setError('')
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : '댓글을 등록하지 못했어요.',
      )
    }
  }

  return (
    <>
      <Link className="market-back" to="/life/free">
        ← 자유게시판 목록
      </Link>
      <article className="market-card market-detail">
        <p className="market-meta">
          {post.author} · {post.example ? '예시 사용자' : '작성자'}
        </p>
        <h1>{post.title}</h1>
        <p className="market-meta">
          {dateLabel(post.createdAt)} · KST · {languageLabels[post.language]}{' '}
          원문
        </p>
        <p className="market-body">{post.content}</p>
        {canManage && (
          <>
            <div className="free-board-actions">
              <Link className="market-secondary" to="edit">
                글 수정
              </Link>
              <button
                className="market-secondary free-board-delete"
                type="button"
                onClick={() => {
                  setDeleting(true)
                  setError('')
                }}
              >
                글 삭제
              </button>
            </div>
            {deleting && (
              <section
                className="market-card free-board-confirm"
                aria-labelledby="free-board-delete-title"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setDeleting(false)
                }}
              >
                <h2 id="free-board-delete-title">이 글을 삭제할까요?</h2>
                <p>
                  글과 댓글 {post.replies.length}개가 함께 삭제돼요. 삭제 후에는
                  되돌릴 수 없어요.
                </p>
                <div className="market-reply-actions">
                  <button type="button" onClick={deletePost}>
                    삭제 확인
                  </button>
                  <button
                    type="button"
                    autoFocus
                    onClick={() => setDeleting(false)}
                  >
                    취소
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </article>
      {error && (
        <p className="market-error" role="alert">
          {error}
        </p>
      )}
      <section className="market-replies">
        <h2>댓글 {post.replies.length}</h2>
        {!post.replies.length && (
          <p className="market-meta">첫 댓글을 남겨보세요.</p>
        )}
        {post.replies.map((item) => (
          <FreeBoardReplyCard key={item.id} postId={post.id} reply={item} />
        ))}
        <form onSubmit={submitReply}>
          <label>
            댓글 작성
            <textarea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              maxLength={1000}
              required
              rows={3}
              disabled={!writable}
              placeholder="함께 나누고 싶은 이야기를 남겨주세요."
            />
          </label>
          <button
            className="market-primary"
            disabled={!writable || !reply.trim()}
          >
            댓글 등록
          </button>
        </form>
      </section>
    </>
  )
}

export function FreeBoardFormPage() {
  const { postId } = useParams()
  const { posts, actor, writable } = useFreeBoard()
  const existing = posts.find((post) => post.id === postId)
  if (postId && !existing) return <MissingPost />
  if (!writable)
    return <MissingPost message="지금은 글을 작성하거나 수정할 수 없어요" />
  if (existing && (existing.example || existing.authorId !== actor.id))
    return <MissingPost message="내가 작성한 글만 수정할 수 있어요" />
  return <FreeBoardForm key={postId ?? 'new'} existing={existing} />
}

function FreeBoardForm({ existing }: { existing?: FreeBoardPost }) {
  const { posts, actor, commit, writable } = useFreeBoard()
  const navigate = useNavigate()
  const [title, setTitle] = useState(existing?.title ?? '')
  const [content, setContent] = useState(existing?.content ?? '')
  const [language, setLanguage] = useState<FreeBoardLanguage>(
    existing?.language ?? actor.language,
  )
  const [error, setError] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!writable) return
    try {
      const draft = { title, content, language }
      const next = existing
        ? editFreeBoardPost(posts, existing.id, actor.id, draft)
        : createFreeBoardPost(posts, actor, draft)
      if (commit(next))
        navigate(`/life/free/${existing?.id ?? next[0].id}`, { replace: true })
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : '글을 저장하지 못했어요.',
      )
    }
  }

  return (
    <>
      <Link
        className="market-back"
        to={existing ? `/life/free/${existing.id}` : '/life/free'}
      >
        ← {existing ? '게시글로 돌아가기' : '자유게시판 목록'}
      </Link>
      <h1>{existing ? '자유게시판 글 수정' : '자유게시판 글쓰기'}</h1>
      <p className="market-intro">일상, 정보, 경험을 자유롭게 나눠보세요.</p>
      <form className="market-form" onSubmit={submit}>
        <label>
          제목
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={80}
            placeholder="제목을 입력해 주세요."
          />
        </label>
        <label>
          작성 언어
          <select
            value={language}
            onChange={(event) =>
              setLanguage(event.target.value as FreeBoardLanguage)
            }
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
            onChange={(event) => setContent(event.target.value)}
            placeholder="함께 나누고 싶은 이야기를 적어주세요."
          />
        </label>
        {error && (
          <p className="market-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="market-primary"
          disabled={!writable || !title.trim() || !content.trim()}
        >
          {existing ? '수정 내용 저장' : '글 등록'}
        </button>
      </form>
    </>
  )
}
