import { formatBoardDate as dateLabel } from '../../../shared/i18n/language'
import { useLanguage } from '../../../shared/i18n/language-context'
import {
  TranslationText,
  ReplyLanguageSelect,
} from '../../translation/components/BoardTranslations'
import { questionMessages } from '../question-messages'
import { useState, type ReactNode, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuestion } from '../question-context'
import { QuestionReplyCard } from '../components/QuestionReplyCard'
import {
  editQuestionPost,
  resolveQuestionPost,
  deleteQuestionPost,
  categoryLabels,
  statusLabels,
  languageLabels,
  type QuestionPost,
  type QuestionLanguage,
  type QuestionCategory,
} from '../question-store'
import '../../market/market.css'

export { QuestionLayout } from './QuestionLayout'

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
  const { t } = useLanguage()

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
      <h1>{t('질문게시판')}</h1>
      <div className="market-count">
        <strong aria-live="polite">
          {t('총 {count}건', { count: visible.length })}
        </strong>
      </div>
      <Segments
        label={t('질문 카테고리')}
        value={category}
        onChange={(v) => filter('category', v)}
        options={[
          { value: 'all', label: t('전체') },
          { value: 'school', label: t('학교생활') },
          { value: 'class', label: t('수업') },
          { value: 'life', label: t('생활') },
        ]}
      />
      <Segments
        label={t('해결 상태')}
        value={status}
        onChange={(v) => filter('status', v)}
        options={[
          { value: 'all', label: t('전체 상태') },
          { value: 'unresolved', label: t('미해결') },
          { value: 'resolved', label: t('해결') },
        ]}
      />
      <Link className="market-primary" to="new">
        {t('질문하기')}
      </Link>
      <div className="market-list">
        {visible.map((post) => (
          <Link className="market-card" key={post.id} to={post.id}>
            <p className="market-meta">
              {post.author} · {post.example ? t('예시 사용자') : t('작성자')}
            </p>
            <TranslationText itemId={`${post.id}:title`}>
              <h2>{post.title}</h2>
            </TranslationText>
            <TranslationText itemId={`${post.id}:preview`}>
              <p className="market-excerpt">{post.content.split('\n')[0]}</p>
            </TranslationText>
            <p className="market-meta">
              {t('원문 ·')} {languageLabels[post.language]} |{' '}
              {t(categoryLabels[post.category])} ·{' '}
              {t(statusLabels[post.status])}
              {` · ${t('답글 {count}', { count: post.replies.length })}`}
            </p>
          </Link>
        ))}
      </div>
      {!visible.length && (
        <div className="market-card market-empty">
          <h2>{t('아직 해당하는 글이 없어요')}</h2>
          <p>{t('다른 필터를 선택하거나 첫 글을 남겨보세요.')}</p>
          <button onClick={() => setQuery({})}>{t('전체 글 보기')}</button>
        </div>
      )}
    </>
  )
}

function MissingPost({ children }: { children?: ReactNode }) {
  const { t } = useLanguage()

  return (
    <>
      <h1>{children ?? t('게시글을 찾을 수 없어요')}</h1>
      <Link className="market-back" to="/life/questions">
        {t('← 질문 목록')}
      </Link>
    </>
  )
}

export function QuestionDetailPage() {
  const { t, language: uiLanguage } = useLanguage()

  const { postId } = useParams()
  const { posts, actor, commit, writable } = useQuestion()
  const [reply, setReply] = useState('')
  const [replyLanguage, setReplyLanguage] = useState<QuestionLanguage>(
    actor.language,
  )
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
    entry.language = replyLanguage
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
        {t('← 질문 목록')}
      </Link>
      <article className="market-card market-detail">
        <p className="market-meta">
          {post.author} · {post.example ? t('예시 사용자') : t('작성자')}
        </p>
        <span className="market-badge">
          {t(categoryLabels[post.category])} · {t(statusLabels[post.status])}
        </span>
        <TranslationText itemId={`${post.id}:title`}>
          <h1>{post.title}</h1>
        </TranslationText>

        <p className="market-meta">
          {dateLabel(post.createdAt, uiLanguage)} · KST ·{' '}
          {languageLabels[post.language]} {t('원문')}
        </p>
        <TranslationText itemId={`${post.id}:content`}>
          <p className="market-body">{post.content}</p>
        </TranslationText>

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
                  {t(actionError)}
                </p>
              )}
            </div>
          ))}
      </article>
      <section className="market-replies">
        <h2>{t('답글 {count}', { count: post.replies.length })}</h2>
        {!post.replies.length && (
          <p className="market-meta">
            {t('아는 정보가 있다면 첫 답글을 남겨주세요.')}
          </p>
        )}
        {post.replies.map((item) => (
          <QuestionReplyCard key={item.id} postId={post.id} reply={item} />
        ))}
        <form onSubmit={submitReply}>
          <ReplyLanguageSelect
            value={replyLanguage}
            onChange={setReplyLanguage}
            disabled={!writable}
          />
          <label>
            {t('답글 작성')}
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              maxLength={1000}
              required
              rows={3}
              placeholder={t('질문에 도움이 되는 답글을 남겨주세요.')}
            />
          </label>
          <button
            className="market-primary"
            disabled={!writable || !reply.trim()}
          >
            {t('답글 등록')}
          </button>
        </form>
      </section>
    </>
  )
}

export function QuestionFormPage() {
  const { t } = useLanguage()

  const { postId } = useParams()
  const { posts, actor } = useQuestion()
  const existing = posts.find((post) => post.id === postId)
  if (postId && !existing) return <MissingPost />
  if (existing && (existing.example || existing.authorId !== actor.id))
    return <MissingPost>{t('내가 작성한 글만 수정할 수 있어요')}</MissingPost>
  if (existing?.status === 'resolved')
    return <MissingPost>{questionMessages[actor.language].locked}</MissingPost>
  return <QuestionForm key={postId ?? 'new'} existing={existing} />
}

function QuestionForm({ existing }: { existing?: QuestionPost }) {
  const { t } = useLanguage()

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
        ← {existing ? t('게시글로 돌아가기') : t('질문 목록')}
      </Link>
      <h1>{existing ? t('질문 글 수정') : t('질문하기')}</h1>
      <p className="market-intro">
        {t('상황과 궁금한 점을 자세히 알려주세요.')}
      </p>
      <form className="market-form" onSubmit={submit}>
        <Segments
          label={t('질문 카테고리')}
          value={category}
          onChange={setCategory}
          options={[
            { value: 'school', label: t('학교생활') },
            { value: 'class', label: t('수업') },
            { value: 'life', label: t('생활') },
          ]}
        />
        <label>
          {t('제목')}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={80}
            placeholder={t('어떤 점이 궁금한가요?')}
          />
        </label>
        <label>
          {t('작성 언어')}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as QuestionLanguage)}
          >
            {Object.entries(languageLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {t(label)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('내용')}
          <textarea
            rows={7}
            required
            maxLength={3000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('질문의 배경과 궁금한 내용을 적어주세요.')}
          />
        </label>
        {error && (
          <p className="market-error" role="alert">
            {t(error)}
          </p>
        )}
        <button className="market-primary" disabled={!writable}>
          {existing ? t('수정 내용 저장') : t('글 등록')}
        </button>
      </form>
    </>
  )
}
