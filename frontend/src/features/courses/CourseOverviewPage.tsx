import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useLanguage } from '../../shared/i18n/language-context'
import { deadlineLabel } from '../schedule/academic-format'
import {
  getCourseOverview,
  setCourseDemoPassword,
  type CourseNotification,
  type CourseOverview,
  type NotificationType,
} from './api'
import {
  needsDemoPassword,
  useCourseLoad,
  useHistoryState,
} from './course-load'
import { courseLabel, splitByTerm, type CourseLabel } from './course-names'
import {
  TYPE_LABELS,
  detailPath,
  hasDeadlineField,
  isPastDue,
  kstLabel,
  type CourseItemState,
} from './course-notice-format'
import { CourseFootnote, DemoPasswordForm, Retry, TypeIcon } from './course-ui'
import './courses.css'

// S08 탭. "전체 과목"은 과목 카드와 모든 알림, 나머지는 그 종류의 알림만 보여준다.
type Tab = 'COURSES' | 'ANNOUNCEMENT' | 'ASSIGNMENT'
const TABS: { value: Tab; label: string }[] = [
  { value: 'COURSES', label: '전체 과목' },
  { value: 'ANNOUNCEMENT', label: '공지' },
  { value: 'ASSIGNMENT', label: '과제·마감' },
]
const CARD_TYPES: NotificationType[] = [
  'ANNOUNCEMENT',
  'ASSIGNMENT',
  'MATERIAL',
]
// 과목 카드 머리 색. 과목 순서대로 돌려 쓴다.
const CARD_COLORS = [
  '#3f5fff',
  '#8572bd',
  '#1f9d8b',
  '#e58a2e',
  '#d0567a',
  '#4a90c2',
]

function parseTab(value: string | null): Tab {
  return TABS.some((tab) => tab.value === value) ? (value as Tab) : 'COURSES'
}

export function CourseOverviewPage() {
  const { t } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  // 예전 주소(/course-notices?courseId=12)는 과목별 화면으로 보낸다.
  const legacyId = searchParams.get('courseId')
  const tab = parseTab(searchParams.get('tab'))
  const [passwordTried, setPasswordTried] = useState(false)
  const { load, retry } = useCourseLoad(
    legacyId ? null : 'overview',
    getCourseOverview,
    '과목알림을 불러오지 못했어요.',
  )

  if (legacyId)
    return (
      <Navigate
        to={`/course-notices/${encodeURIComponent(legacyId)}`}
        replace
      />
    )

  if (needsDemoPassword(load))
    return (
      <div className="course-notices">
        <h1>{t('과목알림')}</h1>
        <DemoPasswordForm
          wrong={passwordTried}
          onSubmit={(password) => {
            setCourseDemoPassword(password)
            setPasswordTried(true)
            retry()
          }}
        />
      </div>
    )

  return (
    <div className="course-notices">
      <h1>{t('과목알림')}</h1>
      {load?.status === 'loading' && (
        <p className="course-status">{t('과목알림을 불러오고 있어요…')}</p>
      )}
      {load?.status === 'error' && (
        <Retry message={load.message} onRetry={retry} />
      )}
      {load?.status === 'ready' && (
        <Overview
          data={load.data}
          tab={tab}
          onTab={(value) =>
            setSearchParams(value === 'COURSES' ? {} : { tab: value }, {
              replace: true,
            })
          }
        />
      )}
      <CourseFootnote
        truncated={load?.status === 'ready' && load.data.truncated}
      />
    </div>
  )
}

function Overview({
  data,
  tab,
  onTab,
}: {
  data: CourseOverview
  tab: Tab
  onTab: (tab: Tab) => void
}) {
  const { t } = useLanguage()
  // 펼침 상태는 상세를 보고 뒤로 돌아와도 남도록 방문 기록에 둔다.
  const [showPast, setShowPast] = useHistoryState('showPastTerms', false)
  const { current, past } = splitByTerm(data.courses)
  const labels = new Map(
    data.courses.map((course) => [course.courseId, courseLabel(course)]),
  )
  // 마감 지난 공지·과제는 과목별 화면과 같이 진행 중 목록과 요약 건수에서 빼고,
  // "공지"·"과제·마감" 탭에서 버튼으로 따로 펼친다.
  const [showPastDue, setShowPastDue] = useHistoryState('showPastDue', false)
  const pastDue = data.notifications.filter(
    (item) => hasDeadlineField(item) && isPastDue(item.dueAt),
  )
  const pastDueInTab = pastDue.filter((item) => item.type === tab)
  const pastLabels =
    tab === 'ANNOUNCEMENT'
      ? {
          show: '마감 지난 공지 {count}개 보기',
          hide: '마감 지난 공지 숨기기',
          title: '마감 지난 공지',
        }
      : {
          show: '마감 지난 과제 {count}개 보기',
          hide: '마감 지난 과제 숨기기',
          title: '마감 지난 과제',
        }
  const ongoing = data.notifications.filter((item) => !pastDue.includes(item))
  const items = ongoing.filter((item) => tab === 'COURSES' || item.type === tab)
  const errors = data.errors.filter(
    (error) => tab === 'COURSES' || error.type === tab,
  )
  const shownCourses = showPast ? [...current, ...past] : current

  return (
    <>
      <p className="course-summary">
        <strong>
          {t('알림 {count}건 · 수강 {courses}과목', {
            count: ongoing.length,
            courses: current.length,
          })}
        </strong>
      </p>

      <div className="course-tabs" role="group" aria-label={t('알림 종류')}>
        {TABS.map((item) => (
          <button
            type="button"
            key={item.value}
            aria-pressed={tab === item.value}
            onClick={() => onTab(item.value)}
          >
            {t(item.label)}
          </button>
        ))}
      </div>

      {tab === 'COURSES' && (
        <>
          {data.courses.length === 0 && (
            <p className="course-status">
              {t('조회할 수 있는 수강 과목이 없어요.')}
            </p>
          )}
          <ul className="course-grid">
            {shownCourses.map(({ course, label }, index) => (
              <li key={course.courseId}>
                <CourseCard
                  courseId={course.courseId}
                  label={label}
                  color={CARD_COLORS[index % CARD_COLORS.length]}
                />
              </li>
            ))}
          </ul>
          {past.length > 0 && (
            <button
              type="button"
              className="course-past-toggle"
              onClick={() => setShowPast(!showPast)}
            >
              {showPast
                ? t('지난 학기 과목 숨기기')
                : t('지난 학기 과목 {count}개 보기', { count: past.length })}
            </button>
          )}
        </>
      )}

      {errors.map((error) => (
        <p
          className="course-error"
          role="alert"
          key={`${error.courseId}#${error.type}`}
        >
          {t('{course}의 {type}을(를) 불러오지 못했어요. ({code})', {
            course: labels.get(error.courseId)?.name ?? error.courseId,
            type: t(TYPE_LABELS[error.type]),
            code: error.code,
          })}
        </p>
      ))}
      {items.length === 0 && errors.length === 0 && (
        <p className="course-status">
          {t('진행 중인 {type}이(가) 없어요.', {
            type: t(tab === 'COURSES' ? '알림' : TYPE_LABELS[tab]),
          })}
        </p>
      )}
      <OverviewList items={items} labels={labels} />
      {pastDueInTab.length > 0 && (
        <>
          <button
            type="button"
            className="course-past-toggle"
            aria-expanded={showPastDue}
            onClick={() => setShowPastDue(!showPastDue)}
          >
            {showPastDue
              ? t(pastLabels.hide)
              : t(pastLabels.show, { count: pastDueInTab.length })}
          </button>
          {showPastDue && (
            <section className="course-past">
              <h2>{t(pastLabels.title)}</h2>
              <OverviewList items={pastDueInTab} labels={labels} />
            </section>
          )}
        </>
      )}
    </>
  )
}

function CourseCard({
  courseId,
  label,
  color,
}: {
  courseId: string
  label: CourseLabel
  color: string
}) {
  const { t } = useLanguage()
  const path = `/course-notices/${encodeURIComponent(courseId)}`
  return (
    <div className="course-tile">
      <Link className="course-tile-main" to={path}>
        <span className="course-tile-head" style={{ background: color }}>
          {label.short}
        </span>
        <strong>{label.name}</strong>
        {label.term && <span className="course-meta">{label.term}</span>}
      </Link>
      {/* 아이콘을 누르면 그 종류 탭이 열린 과목별 화면(S09)으로 간다. */}
      <span className="course-tile-icons">
        {CARD_TYPES.map((type) => (
          <Link
            key={type}
            to={`${path}?type=${type}`}
            aria-label={t('{course} {type} 보기', {
              course: label.name,
              type: t(TYPE_LABELS[type]),
            })}
          >
            <TypeIcon type={type} />
          </Link>
        ))}
      </span>
    </div>
  )
}

function OverviewList({
  items,
  labels,
}: {
  items: CourseNotification[]
  labels: Map<string, CourseLabel>
}) {
  return (
    <ul className="course-list">
      {items.map((item) => (
        <li key={`${item.courseId}#${item.id}`}>
          <OverviewCard item={item} label={labels.get(item.courseId)} />
        </li>
      ))}
    </ul>
  )
}

function OverviewCard({
  item,
  label,
}: {
  item: CourseNotification
  label: CourseLabel | undefined
}) {
  const { t, language } = useLanguage()
  const ongoing = !!item.dueAt && !isPastDue(item.dueAt)
  const pastDue = hasDeadlineField(item) && isPastDue(item.dueAt)
  const posted = kstLabel(item.publishedAt, language)
  const date = item.dueAt
    ? deadlineLabel(item.dueAt, language)
    : posted
      ? t('게시 {date}', { date: posted })
      : null
  const meta = [date, label?.name].filter(Boolean).join(' · ')
  // 서버는 공지·과제만 보내지만, 상세가 없는 종류가 와도 카드가 깨지지 않게 한다.
  const path =
    detailPath(item) ?? `/course-notices/${encodeURIComponent(item.courseId)}`
  return (
    <Link
      className={`home-card course-card course-card--row${pastDue ? ' course-card--past' : ''}`}
      to={path}
      // 상세가 목록을 다시 불러오지 않게 항목을 넘기고, "뒤로"가 이 화면으로 돌아오게 한다.
      state={
        {
          item,
          courseName: label?.name ?? null,
          from: 'overview',
        } satisfies CourseItemState
      }
    >
      <span className="course-card-content">
        <span className="course-badges">
          <span className={`course-badge course-badge--${item.type}`}>
            {t(TYPE_LABELS[item.type])}
          </span>
          {ongoing && <span className="course-due-tag">{t('진행 중')}</span>}
          {pastDue && (
            <span className="course-badge course-badge--past">
              {t('마감 지남')}
            </span>
          )}
        </span>
        <strong>{item.title}</strong>
        {meta && <span className="course-meta">{meta}</span>}
      </span>
      <span className="course-card-open" aria-hidden="true">
        ›
      </span>
    </Link>
  )
}
