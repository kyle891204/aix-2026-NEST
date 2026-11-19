import { useLanguage } from '../../shared/i18n/language-context'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { deadlineLabel } from '../schedule/academic-format'
import {
  addDeadlineSchedules,
  isSaved,
  type PersonalSchedule,
} from '../schedule/personal-schedule-store'
import { usePersonalSchedules } from '../schedule/usePersonalSchedules'
import {
  getCourseNotifications,
  getCourses,
  setCourseDemoPassword,
  type CourseNotification,
  type CourseNotifications,
  type NotificationType,
} from './api'
import {
  needsDemoPassword,
  useCourseLoad,
  useHistoryState,
  useScrollMemory,
} from './course-load'
import { courseLabel } from './course-names'
import {
  TYPE_LABELS,
  canSave,
  detailPath,
  hasDeadlineField,
  isPastDue,
  kstLabel,
  materialLabel,
  safeLinkUrl,
  scheduleSource,
  type CourseItemState,
} from './course-notice-format'
import { BackLink, CourseFootnote, DemoPasswordForm, Retry } from './course-ui'
import './courses.css'

type Filter = 'ALL' | NotificationType

const FILTERS: Filter[] = ['ALL', 'ANNOUNCEMENT', 'ASSIGNMENT', 'MATERIAL']

function parseFilter(value: string | null): Filter {
  return FILTERS.includes(value as Filter) ? (value as Filter) : 'ALL'
}

// S09 과목별 공지·과제. 과목 카드(S08)에서 들어오며, 필요한 마감을 골라 개인 일정에 저장한다.
export function CourseNoticesPage() {
  const { t } = useLanguage()
  const { session } = useAuth()
  const accountId = session?.user?.id ?? null
  const { courseId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = parseFilter(searchParams.get('type'))
  const [passwordTried, setPasswordTried] = useState(false)
  // 과목 이름은 과목 목록에서 찾는다. 목록을 못 읽어도 알림은 보여준다.
  const courses = useCourseLoad(
    'courses',
    getCourses,
    '과목 목록을 불러오지 못했어요.',
  )
  const notices = useCourseLoad(
    courseId,
    () => getCourseNotifications(courseId),
    '과목알림을 불러오지 못했어요.',
  )
  const course =
    courses.load?.status === 'ready'
      ? courses.load.data.courses.find((item) => item.courseId === courseId)
      : undefined
  const label = course ? courseLabel(course) : null
  // 상세를 보고 돌아오면 보던 위치로 되돌린다.
  const rememberScroll = useScrollMemory(notices.load?.status === 'ready')

  if (needsDemoPassword(courses.load, notices.load))
    return (
      <div className="course-notices">
        <BackLink to="/course-notices" />
        <h1>{t('과목알림')}</h1>
        <DemoPasswordForm
          wrong={passwordTried}
          onSubmit={(password) => {
            setCourseDemoPassword(password)
            setPasswordTried(true)
            courses.retry()
            notices.retry()
          }}
        />
      </div>
    )

  return (
    <div className="course-notices" onClickCapture={rememberScroll}>
      <BackLink to="/course-notices" />
      <h1>{label?.name ?? t('과목알림')}</h1>
      <p className="home-description">
        {t('필요한 마감만 선택해 개인 일정에 저장하세요.')}
      </p>
      {notices.load?.status === 'ready' && (
        <p className="course-summary">
          <strong>
            {t('총 {count}건', {
              count: notices.load.data.notifications.length,
            })}
          </strong>
        </p>
      )}

      <div
        className="course-tabs course-tabs--compact"
        role="group"
        aria-label={t('알림 종류')}
      >
        {FILTERS.map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={filter === value}
            onClick={() =>
              setSearchParams(value === 'ALL' ? {} : { type: value }, {
                replace: true,
              })
            }
          >
            {t(
              value === 'ALL'
                ? '전체'
                : value === 'MATERIAL'
                  ? '학습자료'
                  : TYPE_LABELS[value],
            )}
          </button>
        ))}
      </div>

      {notices.load?.status === 'loading' && (
        <p className="course-status">{t('알림을 불러오고 있어요…')}</p>
      )}
      {notices.load?.status === 'error' && (
        <Retry message={notices.load.message} onRetry={notices.retry} />
      )}
      {/* 과목이나 계정이 바뀌면 선택과 저장 목록을 다시 만든다. */}
      {notices.load?.status === 'ready' && (
        <NoticeList
          key={`${accountId ?? 'signed-out'}#${notices.load.data.courseId}`}
          accountId={accountId}
          data={notices.load.data}
          filter={filter}
          courseName={label?.name ?? null}
        />
      )}

      <CourseFootnote />
    </div>
  )
}

function NoticeList({
  accountId,
  data,
  filter,
  courseName,
}: {
  accountId: string | null
  data: CourseNotifications
  filter: Filter
  courseName: string | null
}) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const personal = usePersonalSchedules(accountId)
  // 탭을 바꾸면 선택을 비운다. 다른 탭에서 고른 항목이 안 보이는 채로 저장 개수에 남지 않게 한다.
  // 상세를 보고 돌아와도 고른 항목이 남도록 방문 기록에 둔다.
  const [selection, setSelection] = useHistoryState<{
    filter: Filter
    ids: string[]
  }>('selection', { filter, ids: [] })
  const selected = selection.filter === filter ? selection.ids : []
  const setSelected = (update: (ids: string[]) => string[]) =>
    setSelection({ filter, ids: update(selected) })
  const errors = data.errors.filter(
    (error) => filter === 'ALL' || error.type === filter,
  )
  const items = data.notifications.filter(
    (item) => filter === 'ALL' || item.type === filter,
  )
  // 마감이 지난 공지·과제는 기본으로 접어 두고, 버튼을 누르면 목록 아래에 따로 보여준다.
  const [showPast, setShowPast] = useHistoryState('showPast', false)
  const pastItems = items.filter(
    (item) => hasDeadlineField(item) && isPastDue(item.dueAt),
  )
  const activeItems = items.filter((item) => !pastItems.includes(item))
  const saved = (item: CourseNotification) =>
    isSaved(personal.schedules, scheduleSource(item), item.id)
  const selectable = items.filter((item) => canSave(item) && !saved(item))

  function toggle(id: string, checked: boolean) {
    setSelected((ids) =>
      checked ? [...ids, id] : ids.filter((value) => value !== id),
    )
  }

  // 저장에 성공하면 개인 저장 탭으로 이동해 이번에 저장한 일정을 보여준다(S10-A·B·AB).
  function save() {
    const picked = data.notifications.filter(
      (item) => selected.includes(item.id) && item.dueAt,
    )
    let added: PersonalSchedule[] = []
    const ok = personal.update((current) => {
      const next = addDeadlineSchedules(
        current,
        picked.map((item) => ({
          sourceType: scheduleSource(item),
          sourceId: item.id,
          title: item.title,
          dueAt: item.dueAt as string,
          sourceUrl: safeLinkUrl(item.sourceUrl),
        })),
      )
      added = next.filter((item) => !current.includes(item))
      return next
    })
    if (!ok) return
    setSelected(() => [])
    navigate('/schedule?tab=mine', {
      state: { savedIds: added.map((item) => item.id) },
    })
  }

  function renderItem(item: CourseNotification) {
    return (
      <li key={item.id}>
        {canSave(item) && !saved(item) ? (
          <SelectableCard
            item={item}
            courseName={courseName}
            checked={selected.includes(item.id)}
            onToggle={(checked) => toggle(item.id, checked)}
          />
        ) : hasDeadlineField(item) && !item.dueAt ? (
          // 마감을 찾지 못한 공지·과제는 체크를 끄고 "마감 없음"으로 보여준다.
          <SelectableCard item={item} courseName={courseName} checked={false} />
        ) : (
          <NoticeCard item={item} courseName={courseName} saved={saved(item)} />
        )}
      </li>
    )
  }

  return (
    <>
      {data.truncated && (
        <p className="course-status">
          {t('LMS 조회 상한 때문에 일부 항목만 표시했어요.')}
        </p>
      )}
      {errors.map((error) => (
        <p className="course-error" role="alert" key={error.type}>
          {t(
            '{type}을(를) 불러오지 못했어요. 잠시 후 다시 시도해 주세요. ({code})',
            { type: t(TYPE_LABELS[error.type]), code: error.code },
          )}
        </p>
      ))}
      {activeItems.length === 0 && errors.length === 0 && (
        <p className="course-status">
          {t(
            pastItems.length > 0
              ? '진행 중인 {type}이(가) 없어요.'
              : '표시할 {type}이(가) 없어요.',
            { type: t(filter === 'ALL' ? '알림' : TYPE_LABELS[filter]) },
          )}
        </p>
      )}
      {selectable.length > 0 && (
        <div className="course-selection">
          <strong>{t('{count}개 선택', { count: selected.length })}</strong>
          {selected.length > 0 ? (
            <button type="button" onClick={() => setSelected(() => [])}>
              {t('전체 해제')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                setSelected(() => selectable.map((item) => item.id))
              }
            >
              {t('전체 선택')}
            </button>
          )}
        </div>
      )}
      <ul className="course-list">{activeItems.map(renderItem)}</ul>
      {personal.saveFailed && (
        <p className="course-error" role="alert">
          {t(
            '브라우저에 저장하지 못했어요. 저장 공간이나 브라우저 설정을 확인해 주세요.',
          )}
        </p>
      )}
      {/* 목록이 길어도 바로 누를 수 있게 하단 메뉴 위에 띄운다. 고르기 전에는 꺼 둔다(S09). */}
      {selectable.length > 0 && (
        <>
          <button
            type="button"
            className="course-save"
            disabled={selected.length === 0}
            onClick={save}
          >
            {selected.length > 0
              ? t('선택한 {count}개 일정 저장', { count: selected.length })
              : t('저장할 일정을 선택하세요')}
          </button>
          <p className="course-meta course-save-hint">
            {t('왼쪽 체크: 일정 선택 · 오른쪽 화살표: 상세 보기')}
          </p>
        </>
      )}
      {pastItems.length > 0 && (
        <button
          type="button"
          className="course-past-toggle"
          aria-expanded={showPast}
          onClick={() => setShowPast(!showPast)}
        >
          {showPast
            ? t('마감 지난 항목 숨기기')
            : t('마감 지난 항목 {count}개 보기', { count: pastItems.length })}
        </button>
      )}
      {showPast && pastItems.length > 0 && (
        <section className="course-past">
          <h2>{t('마감 지난 항목')}</h2>
          <ul className="course-list">{pastItems.map(renderItem)}</ul>
        </section>
      )}
    </>
  )
}

// 왼쪽(체크·내용)을 누르면 선택하고, 오른쪽 화살표는 앱의 상세(S09-N·S09-T)를 연다(S09 검토 안내).
function SelectableCard({
  item,
  courseName,
  checked,
  onToggle,
}: {
  item: CourseNotification
  courseName: string | null
  checked: boolean
  // 없으면 마감이 없어 고를 수 없는 카드다.
  onToggle?: (checked: boolean) => void
}) {
  const { t, language } = useLanguage()
  const path = detailPath(item)
  const due = item.dueAt ? deadlineLabel(item.dueAt, language) : null
  const posted = kstLabel(item.publishedAt, language)
  const announcement = item.type === 'ANNOUNCEMENT'
  return (
    <div
      className={`home-card course-card course-card--selectable${checked ? ' is-selected' : ''}${onToggle ? '' : ' is-disabled'}`}
    >
      <label>
        <input
          type="checkbox"
          checked={checked}
          disabled={!onToggle}
          onChange={(event) => onToggle?.(event.target.checked)}
        />
        <span className="course-card-content">
          <span className="course-badges">
            <span className={`course-badge course-badge--${item.type}`}>
              {t(TYPE_LABELS[item.type])}
            </span>
            <span className="course-due-tag">
              {t(
                due
                  ? '마감 있음'
                  : announcement
                    ? '마감 확인 필요'
                    : '마감 없음',
              )}
            </span>
          </span>
          <strong>{item.title}</strong>
          <span className="course-meta">
            {due
              ? announcement
                ? t('{date} · 공지 본문 기준', { date: due })
                : due
              : announcement && posted
                ? t('게시 {date}', { date: posted })
                : t('마감일 없음')}
          </span>
          {/* 공지 마감은 본문을 읽어 찾으므로, 못 찾았다고 마감이 없다고 단정하지 않는다. */}
          {!due && announcement && (
            <span className="course-meta course-meta--hint">
              {t(
                '본문에서 마감을 찾지 못했어요. 혹시 모르니 원문을 확인해 주세요.',
              )}
            </span>
          )}
        </span>
      </label>
      {path && (
        <Link
          className="course-card-open"
          to={path}
          state={{ item, courseName, from: 'course' } satisfies CourseItemState}
          aria-label={t('{title} 상세 보기', { title: item.title })}
        >
          ›
        </Link>
      )}
    </div>
  )
}

function NoticeCard({
  item,
  courseName,
  saved,
}: {
  item: CourseNotification
  courseName: string | null
  saved: boolean
}) {
  const { t } = useLanguage()
  const pastDue = hasDeadlineField(item) && isPastDue(item.dueAt)
  const content = (
    <>
      <div className="course-badges">
        <span className={`course-badge course-badge--${item.type}`}>
          {t(TYPE_LABELS[item.type])}
        </span>
        {pastDue && (
          <span className="course-badge course-badge--past">
            {t('마감 지남')}
          </span>
        )}
        {saved && <span className="course-badge">{t('저장됨')}</span>}
      </div>
      <h2>{item.title}</h2>
      <CardMeta item={item} />
    </>
  )

  const className = `home-card course-card${pastDue ? ' course-card--past' : ''}`
  // 공지·과제는 앱의 상세로 연다.
  const path = detailPath(item)
  if (path)
    return (
      <Link
        className={className}
        to={path}
        state={{ item, courseName, from: 'course' } satisfies CourseItemState}
      >
        {content}
      </Link>
    )
  // 학습자료는 상세가 없어 http·https 원문 링크만 새 탭으로 연다. 원문 권한은 LMS가 확인한다.
  const href = safeLinkUrl(item.sourceUrl)
  return href ? (
    <a
      className={`home-card course-card${pastDue ? ' course-card--past' : ''}`}
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {content}
    </a>
  ) : (
    <div
      className={`home-card course-card${pastDue ? ' course-card--past' : ''}`}
    >
      {content}
    </div>
  )
}

function CardMeta({ item }: { item: CourseNotification }) {
  const { t, language } = useLanguage()

  if (item.type === 'ASSIGNMENT') {
    const due = kstLabel(item.dueAt, language)
    const lock = kstLabel(item.lockAt, language)
    return (
      <>
        <p className="course-meta">
          {due ? t('마감 {date}', { date: due }) : t('마감일 없음')}
        </p>
        {lock && (
          <p className="course-meta">{t('제출 차단 {date}', { date: lock })}</p>
        )}
      </>
    )
  }
  if (item.type === 'ANNOUNCEMENT') {
    const posted = kstLabel(item.publishedAt, language)
    return posted ? (
      <p className="course-meta">{t('게시 {date}', { date: posted })}</p>
    ) : null
  }
  const details = [
    item.moduleName,
    t(materialLabel(item.materialType) ?? ''),
  ].filter(Boolean)
  return details.length > 0 ? (
    <p className="course-meta">{details.join(' · ')}</p>
  ) : null
}
