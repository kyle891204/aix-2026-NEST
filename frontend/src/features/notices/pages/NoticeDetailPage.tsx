import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'
import { useDemoProfile } from '../../profile/demo-profile-context'
import { loadActionChecks, saveActionChecks } from '../action-checks'
import {
  isSignedOut,
  noticeProfile,
  translateNotice,
  viewNotice,
  type NoticeDetail,
  type NoticeTranslation,
} from '../api'
import {
  formatDeadline,
  matchLabel,
  needsTranslation,
  postedLabel,
} from '../notice-display'
import { NoticeLoading } from '../NoticeLoading'
import '../notices.css'

const TRANSLATION_FAILED =
  '원문을 계속 확인할 수 있습니다. 번역을 다시 요청할 수 있어요.'

export function NoticeDetailPage() {
  const { noticeId = '' } = useParams()
  const { savedProfile } = useDemoProfile()
  // 세션과 CSRF 토큰을 받기 전에 요청하면 게스트 세션이 둘 생길 수 있어 세션 확인을 기다린다.
  const { session, loading: authLoading } = useAuth()
  const accountId = session?.user?.id ?? null
  const language = savedProfile?.profile.language ?? 'ko'
  const profile = JSON.stringify(noticeProfile(savedProfile?.profile ?? null))
  const [checks, setChecks] = useState<string[]>(() => {
    if (!accountId) return []
    try {
      return loadActionChecks(window.localStorage, accountId, noticeId)
    } catch {
      return []
    }
  })
  const [checkError, setCheckError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [tab, setTab] = useState<'easy' | 'original'>('easy')
  const [translationAttempt, setTranslationAttempt] = useState(0)
  const [loaded, setLoaded] = useState<{
    key: string
    notice: NoticeDetail | null
    error: string | null
    signedOut?: boolean
  } | null>(null)
  const [translationResult, setTranslationResult] = useState<{
    key: string
    value: NoticeTranslation
  } | null>(null)

  // 응답의 key가 현재 요청과 다르면 아직 불러오는 중으로 본다.
  const loadKey = `${noticeId}:${profile}:${attempt}`
  const current = !authLoading && loaded?.key === loadKey ? loaded : null
  const notice = current?.notice ?? null
  const loadError = current?.error ?? null
  const signedOut = current?.signedOut ?? false

  useEffect(() => {
    if (authLoading) return
    let active = true
    viewNotice(noticeId, JSON.parse(profile))
      .then((value) => {
        if (active) setLoaded({ key: loadKey, notice: value, error: null })
      })
      .catch((cause: unknown) => {
        if (!active) return
        setLoaded(
          isSignedOut(cause)
            ? { key: loadKey, notice: null, error: null, signedOut: true }
            : {
                key: loadKey,
                notice: null,
                error: '공지를 불러오지 못했어요.',
              },
        )
      })
    return () => {
      active = false
    }
  }, [authLoading, noticeId, profile, loadKey])

  function toggleCheck(actionId: string, checked: boolean) {
    if (!accountId) return
    const next = checked
      ? [...checks, actionId]
      : checks.filter((id) => id !== actionId)
    try {
      saveActionChecks(window.localStorage, accountId, noticeId, next)
      setChecks(next)
      setCheckError(false)
    } catch {
      // 저장에 실패하면 체크를 바꾸지 않고 안내한다.
      setCheckError(true)
    }
  }

  // 선호 언어가 원문과 다르면 버튼 없이 자동으로 번역한다.
  const shouldTranslate =
    notice !== null && needsTranslation(language, notice.originalLanguage)
  const translationKey = `${loadKey}:${language}:${translationAttempt}`
  const translation =
    translationResult?.key === translationKey ? translationResult.value : null
  const translating = shouldTranslate && translation === null

  useEffect(() => {
    if (!shouldTranslate) return
    let active = true
    translateNotice(noticeId, language, JSON.parse(profile).collegeId)
      .catch((): NoticeTranslation => ({
        translationStatus: 'FAILED',
        translated: null,
        retryable: true,
        message: null,
      }))
      .then((value) => {
        if (active) setTranslationResult({ key: translationKey, value })
      })
    return () => {
      active = false
    }
  }, [shouldTranslate, noticeId, language, profile, translationKey])

  if (signedOut) {
    return (
      <div className="notice-page">
        <Link className="notice-back" to="/notices">
          ‹ 뒤로
        </Link>
        <p className="notice-hint">
          로그인하면 공지를 볼 수 있어요. <Link to="/login">로그인하기 ›</Link>
        </p>
      </div>
    )
  }
  if (loadError) {
    return (
      <div className="notice-page">
        <Link className="notice-back" to="/notices">
          ‹ 뒤로
        </Link>
        <div className="notice-message" role="alert">
          <p>{loadError}</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            다시 시도
          </button>
        </div>
      </div>
    )
  }
  if (!notice) {
    return (
      <div className="notice-page">
        <NoticeLoading />
      </div>
    )
  }

  // 번역에 실패하면 원문을 그대로 보여주고 원문과 번역을 섞지 않는다.
  const translated = translation?.translated ?? null
  const failed = translation?.translationStatus === 'FAILED'
  const badge = matchLabel(notice.matchStatus)
  const target = translated ? translated.target : notice.target
  const actions = translated ? translated.actions : notice.actions
  const documents = translated ? translated.documents : notice.documents

  return (
    <div className="notice-page">
      <Link className="notice-back" to="/notices">
        ‹ 뒤로
      </Link>
      <h1>{translated?.title ?? notice.title}</h1>

      <div className="notice-badges">
        {badge && (
          <span className={`notice-badge is-${notice.matchStatus}`}>
            {badge}
          </span>
        )}
        {notice.sourceName && (
          <span className="notice-badge">{notice.sourceName}</span>
        )}
        {notice.sample && <span className="notice-badge">예시 데이터</span>}
        {failed && (
          <span className="notice-badge is-NEEDS_REVIEW">번역 실패</span>
        )}
      </div>

      {translating && (
        <p className="notice-hint" aria-live="polite">
          선호 언어로 번역하고 있어요. 그동안 원문을 볼 수 있어요.
        </p>
      )}
      {failed && !translating && (
        <div className="notice-message" role="alert">
          <strong>번역을 완료하지 못했어요</strong>
          <p>{translation?.message ?? TRANSLATION_FAILED}</p>
          {translation?.retryable && (
            <button
              type="button"
              onClick={() => setTranslationAttempt((n) => n + 1)}
            >
              번역 다시 시도
            </button>
          )}
        </div>
      )}

      <div className="notice-segment" role="group" aria-label="공지 보기 방식">
        <button
          type="button"
          aria-pressed={tab === 'easy'}
          onClick={() => setTab('easy')}
        >
          쉬운 설명
        </button>
        <button
          type="button"
          aria-pressed={tab === 'original'}
          onClick={() => setTab('original')}
        >
          원문
        </button>
      </div>

      {tab === 'original' ? (
        <section className="notice-card">
          <span className="notice-hint">
            게시일 {postedLabel(notice.postedAt)}
          </span>
          <p className="notice-body">{notice.originalContent}</p>
          {notice.attachments.length > 0 && (
            <ul className="notice-files">
              {notice.attachments.map((file) => (
                <li key={file.url}>
                  <a href={file.url} target="_blank" rel="noreferrer">
                    {file.name}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {notice.sourceUrl && (
            <a href={notice.sourceUrl} target="_blank" rel="noreferrer">
              학교 홈페이지에서 원문 보기 ↗
            </a>
          )}
        </section>
      ) : (
        <>
          <section className="notice-reason">
            <h2>해당 이유</h2>
            {notice.matchReasons.length > 0 ? (
              notice.matchReasons.map((reason) => <p key={reason}>{reason}</p>)
            ) : (
              <p>확인된 해당 이유가 없어요. 원문을 확인해 주세요.</p>
            )}
          </section>

          {target && (
            <section>
              <h2>대상</h2>
              <p className="notice-card notice-body">{target}</p>
            </section>
          )}

          <section>
            <h2>해야 할 일</h2>
            {actions.length > 0 ? (
              <ul className="notice-card notice-actions">
                {actions.map((action) => (
                  <li key={action.id}>
                    <input
                      type="checkbox"
                      disabled={!accountId}
                      checked={checks.includes(action.id)}
                      aria-label={action.text}
                      onChange={(event) =>
                        toggleCheck(action.id, event.target.checked)
                      }
                    />
                    <span>{action.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="notice-hint">
                정리된 할 일이 없어요. 원문을 확인해 주세요.
              </p>
            )}
          </section>

          {checkError && (
            <p className="notice-message" role="alert">
              체크 상태를 저장하지 못했어요. 다시 시도해 주세요.
            </p>
          )}

          <section>
            <h2>마감 · 한국 시간</h2>
            <p className="notice-card notice-body">
              {formatDeadline(notice.deadline) ??
                '마감일이 제공되지 않았어요. 원문을 확인해 주세요.'}
            </p>
          </section>

          <section>
            <h2>준비 서류</h2>
            <p className="notice-card notice-body">
              {documents.length > 0
                ? documents.join(' · ')
                : '정리된 서류가 없어요. 원문을 확인해 주세요.'}
            </p>
          </section>

          {translated && (
            <section>
              <h2>공지 내용</h2>
              <p className="notice-card notice-body">{translated.content}</p>
            </section>
          )}

          {/* #10 일정 API가 연결되면 활성화한다. */}
          <button type="button" className="notice-primary" disabled>
            개인 일정에 저장 (준비 중)
          </button>
        </>
      )}
    </div>
  )
}
