import { useLanguage } from '../../../shared/i18n/language-context'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'
import {
  CHECKLIST_ITEMS,
  loadChecklist,
  saveChecklist,
  type Checklist,
  type Direction,
} from '../checklist-store'
import '../../notices/notices.css'

const TEXT = {
  entry: { title: '입국 준비', date: '예정 입국일' },
  exit: { title: '출국 준비', date: '예정 출국일' },
}

function loadInitial(accountId: string | null, direction: Direction) {
  const empty: Checklist = { plannedDate: '', completedKeys: [] }
  if (!accountId) return empty
  try {
    return loadChecklist(window.localStorage, accountId, direction)
  } catch {
    return empty
  }
}

export function ChecklistPage({ direction }: { direction: Direction }) {
  const { t } = useLanguage()

  const { session } = useAuth()
  const accountId = session?.user?.id ?? null
  const [checklist, setChecklist] = useState(() =>
    loadInitial(accountId, direction),
  )
  // 공지 할 일 체크와 달리 저장 버튼으로 저장하므로, 저장하지 않은 변경이 있으면 알려준다.
  const [saved, setSaved] = useState(checklist)
  const unsaved = JSON.stringify(checklist) !== JSON.stringify(saved)
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'failed'>(
    'idle',
  )

  function update(next: Checklist) {
    setChecklist(next)
    setSaveState('idle')
  }

  function toggle(key: string, checked: boolean) {
    update({
      ...checklist,
      completedKeys: checked
        ? [...checklist.completedKeys, key]
        : checklist.completedKeys.filter((item) => item !== key),
    })
  }

  function save() {
    if (!accountId) return
    try {
      saveChecklist(window.localStorage, accountId, direction, checklist)
      setSaved(checklist)
      setSaveState('saved')
    } catch {
      // 저장에 실패해도 입력한 값은 화면에 남겨 다시 시도할 수 있게 한다.
      setSaveState('failed')
    }
  }

  return (
    <div className="notice-page">
      <Link className="notice-back" to="/entry-exit">
        {t('‹ 뒤로')}
      </Link>
      <h1>{t(TEXT[direction].title)}</h1>

      <label className="notice-field">
        <span>{t(TEXT[direction].date)}</span>
        <input
          type="date"
          value={checklist.plannedDate}
          onChange={(event) =>
            update({ ...checklist, plannedDate: event.target.value })
          }
        />
      </label>

      <ul className="notice-card notice-actions">
        {CHECKLIST_ITEMS[direction].map((item, index) => (
          <li key={item.key}>
            <input
              type="checkbox"
              id={`checklist-${item.key}`}
              checked={checklist.completedKeys.includes(item.key)}
              onChange={(event) => toggle(item.key, event.target.checked)}
            />
            <label htmlFor={`checklist-${item.key}`}>
              {index + 1}. {t(item.label)}
            </label>
          </li>
        ))}
      </ul>

      <Link className="notice-card" to="/notices">
        <strong>{t('관련 학교 공지 ›')}</strong>
        <span className="notice-hint">
          {t('개인별 조건과 공지 원문을 함께 확인')}
        </span>
      </Link>

      <button
        type="button"
        className="notice-primary"
        disabled={!accountId}
        onClick={save}
      >
        {t('준비 진행상태 저장')}
      </button>

      {accountId && unsaved && (
        <p className="notice-hint" role="status">
          {t('저장하지 않은 변경이 있어요. 준비 진행상태 저장을 눌러 주세요.')}
        </p>
      )}
      {!accountId && (
        <p className="notice-hint">
          {t('로그인하면 준비 상태를 저장할 수 있어요.')}
        </p>
      )}
      {saveState === 'saved' && (
        <p className="notice-hint" role="status">
          {t('이 브라우저에 저장했어요.')}
        </p>
      )}
      {saveState === 'failed' && (
        <p className="notice-message" role="alert">
          {t(
            '저장하지 못했어요. 브라우저 저장 공간을 확인하고 다시 시도해 주세요.',
          )}
        </p>
      )}
    </div>
  )
}
