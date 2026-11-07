import { TranslationText } from '../translation/BoardTranslations'
import { useState } from 'react'
import { useFreeBoard } from './free-board-context'
import {
  updateFreeBoardReply,
  languageLabels,
  type FreeBoardReply,
} from './free-board-store'
import { dateLabel } from './free-board-format'

export function FreeBoardReplyCard({
  postId,
  reply,
}: {
  postId: string
  reply: FreeBoardReply
}) {
  const { posts, actor, commit, writable } = useFreeBoard()
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
        commit(updateFreeBoardReply(posts, postId, reply.id, actor.id, action))
      ) {
        setEditing(false)
        setDeleting(false)
        setError('')
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : '댓글 변경에 실패했어요.',
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
            댓글 수정
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
        <TranslationText itemId={`${postId}:reply:${reply.id}`}>
          <p className="market-body">{reply.content}</p>
        </TranslationText>
      )}
      <p className="market-meta">{dateLabel(reply.createdAt)} · KST</p>
      {canManage &&
        !editing &&
        (deleting ? (
          <div>
            <p>이 댓글을 삭제할까요?</p>
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
