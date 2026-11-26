import { formatBoardDate as dateLabel } from '../../../shared/i18n/language'
import { useLanguage } from '../../../shared/i18n/language-context'
import {
  TranslationText,
  ReplyLanguageSelect,
} from '../../translation/components/BoardTranslations'
import { useState, type ReactNode, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMarket } from '../market-context'
import { MarketReplyCard } from '../components/MarketReplyCard'
import {
  editMarketPost,
  typeLabels,
  statusLabels,
  languageLabels,
  type MarketPost,
  type MarketLanguage,
  type TradeType,
  type TradeStatus,
} from '../market-store'
import '../market.css'

export { MarketLayout } from './MarketLayout'

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
  const { t, language: uiLanguage } = useLanguage()

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
      <h1>{t('장터게시판')}</h1>
      <div className="market-count">
        <strong aria-live="polite">
          {t('총 {count}건', { count: visible.length })}
        </strong>
      </div>
      <Segments
        label={t('거래 유형')}
        value={type}
        onChange={(v) => filter('type', v)}
        options={[
          { value: 'all', label: t('전체') },
          { value: 'sell', label: t('판매') },
          { value: 'buy', label: t('구매') },
        ]}
      />
      <Segments
        label={t('거래 상태')}
        value={status}
        onChange={(v) => filter('status', v)}
        options={[
          { value: 'all', label: t('전체 상태') },
          { value: 'available', label: t('판매중') },
          { value: 'completed', label: t('판매완료') },
        ]}
      />
      <Link className="market-primary" to="new">
        {t('판매·구매 글쓰기')}
      </Link>
      <div className="market-list">
        {visible.map((post) => (
          <Link className="market-card" key={post.id} to={post.id}>
            <p className="market-meta">
              {post.author} · {post.example ? t('예시 사용자') : t('작성자')}
            </p>
            <TranslationText
              itemId={`${post.id}:title`}
              prefix={`[${t(typeLabels[post.type])}] `}
            >
              <h2>
                [{t(typeLabels[post.type])}] {post.title}
              </h2>
            </TranslationText>
            <p>
              {t('가격:')} {post.example && t('예시 ')}
              {post.price.toLocaleString(uiLanguage)}
              {t('원')}
            </p>
            <TranslationText itemId={`${post.id}:preview`}>
              <p className="market-excerpt">{post.content.split('\n')[0]}</p>
            </TranslationText>
            <p className="market-meta">
              {t('원문 ·')} {languageLabels[post.language]} |{' '}
              {t(statusLabels[post.status])}
              {post.replies.length > 0 &&
                ` · ${t('답글 {count}', { count: post.replies.length })}`}
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
      <Link className="market-back" to="/life/market">
        {t('← 장터 목록')}
      </Link>
    </>
  )
}

export function MarketDetailPage() {
  const { t, language: uiLanguage } = useLanguage()

  const { postId } = useParams()
  const { posts, actor, commit, writable } = useMarket()
  const [reply, setReply] = useState('')
  const [replyLanguage, setReplyLanguage] = useState<MarketLanguage>(
    actor.language,
  )
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
      <Link className="market-back" to="/life/market">
        {t('← 장터 목록')}
      </Link>
      <article className="market-card market-detail">
        <p className="market-meta">
          {post.author} · {post.example ? t('예시 사용자') : t('작성자')}
        </p>
        <span className="market-badge">{t(statusLabels[post.status])}</span>
        <TranslationText
          itemId={`${post.id}:title`}
          prefix={`[${t(typeLabels[post.type])}] `}
        >
          <h1>
            [{t(typeLabels[post.type])}] {post.title}
          </h1>
        </TranslationText>
        <p className="market-price">
          {post.price.toLocaleString(uiLanguage)}
          {t('원')}
        </p>
        <p className="market-meta">
          {dateLabel(post.createdAt, uiLanguage)} · KST ·{' '}
          {languageLabels[post.language]} {t('원문')}
        </p>
        <TranslationText itemId={`${post.id}:content`}>
          <p className="market-body">{post.content}</p>
        </TranslationText>
        <TranslationText
          itemId={`${post.id}:location`}
          prefix={t('거래 희망 장소: ')}
        >
          <p>
            {t('거래 희망 장소:')} {post.location || t('답글에서 협의')}
          </p>
        </TranslationText>
        {!post.example && post.authorId === actor.id && (
          <Link className="market-secondary" to="edit">
            {t('글·거래 상태 수정')}
          </Link>
        )}
      </article>
      <section className="market-replies">
        <h2>{t('답글 {count}', { count: post.replies.length })}</h2>
        {!post.replies.length && (
          <p className="market-meta">
            {t('궁금한 점이나 거래 의사를 남겨보세요.')}
          </p>
        )}
        {post.replies.map((item) => (
          <MarketReplyCard key={item.id} postId={post.id} reply={item} />
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
              placeholder={t('거래에 관해 궁금한 내용을 남겨주세요.')}
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

export function MarketFormPage() {
  const { t } = useLanguage()

  const { postId } = useParams()
  const { posts, actor } = useMarket()
  const existing = posts.find((post) => post.id === postId)
  if (postId && !existing) return <MissingPost />
  if (existing && (existing.example || existing.authorId !== actor.id))
    return <MissingPost>{t('내가 작성한 글만 수정할 수 있어요')}</MissingPost>
  return <MarketForm key={postId ?? 'new'} existing={existing} />
}

function MarketForm({ existing }: { existing?: MarketPost }) {
  const { t } = useLanguage()

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
        ← {existing ? t('게시글로 돌아가기') : t('장터 목록')}
      </Link>
      <h1>{existing ? t('장터 글 수정') : t('판매·구매 글쓰기')}</h1>
      <p className="market-intro">
        {t('물건과 거래 조건을 자세히 알려주세요.')}
      </p>
      <form className="market-form" onSubmit={submit}>
        <Segments
          label={t('거래 유형')}
          value={type}
          onChange={setType}
          options={[
            { value: 'sell', label: t('판매') },
            { value: 'buy', label: t('구매') },
          ]}
        />
        <label>
          {t('제목')}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={80}
            placeholder={t('어떤 물건을 판매하거나 구하시나요?')}
          />
        </label>
        <label>
          {t('가격 (원)')}
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="999999999"
            step="1"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={t('예: 10000 (무료 나눔은 0)')}
          />
        </label>
        <label>
          {t('거래 상태')}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TradeStatus)}
          >
            <option value="available">{t('판매중')}</option>
            <option value="completed">{t('판매완료')}</option>
          </select>
        </label>
        <label>
          {t('작성 언어')}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as MarketLanguage)}
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
            placeholder={t('물건 상태, 거래 방법 등을 적어주세요.')}
          />
        </label>
        <label>
          {t('거래 희망 장소 (선택)')}
          <input
            value={location}
            maxLength={100}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('예: 도서관 앞')}
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
