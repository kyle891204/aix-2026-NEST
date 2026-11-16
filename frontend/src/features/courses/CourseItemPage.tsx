import { useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useLanguage } from '../../shared/i18n/language-context'
import { deadlineLabel } from '../schedule/academic-format'
import {
  getCourseNotifications,
  getCourses,
  setCourseDemoPassword,
  type CourseNotification,
} from './api'
import { needsDemoPassword, useCourseLoad } from './course-load'
import { courseLabel } from './course-names'
import {
  isPastDue,
  kstLabel,
  safeLinkUrl,
  type CourseItemState,
} from './course-notice-format'
import { BackLink, DemoPasswordForm, Retry } from './course-ui'
import './courses.css'

function arrivedState(value: unknown, itemId: string): CourseItemState | null {
  const state = value as Partial<CourseItemState> | null
  return state?.item?.id === itemId
    ? {
        item: state.item,
        courseName: state.courseName ?? null,
        from: state.from === 'overview' ? 'overview' : 'course',
      }
    : null
}

// S09-N 과목 공지 상세, S09-T 과제 상세. 목록에서 넘어오면 받은 항목을 바로 보여주고, 주소로 바로 열면 과목 알림을 다시 읽는다.
export function CourseItemPage() {
  const { t } = useLanguage()
  const { courseId = '', itemId = '' } = useParams()
  const location = useLocation()
  const arrived = arrivedState(location.state, itemId)
  const [passwordTried, setPasswordTried] = useState(false)
  const notices = useCourseLoad(
    arrived ? null : courseId,
    () => getCourseNotifications(courseId),
    '과목알림을 불러오지 못했어요.',
  )
  const courses = useCourseLoad(
    arrived ? null : 'courses',
    getCourses,
    '과목 목록을 불러오지 못했어요.',
  )
  const listPath = `/course-notices/${encodeURIComponent(courseId)}`
  // 앱의 목록에서 들어왔으면 그 목록으로 돌아가 고른 항목·펼침을 그대로 살린다. 주소로 바로 열었으면 과목별 화면으로 간다.
  const back = arrived ? -1 : listPath

  if (needsDemoPassword(notices.load, courses.load))
    return (
      <div className="course-notices">
        <BackLink to={back} />
        <h1>{t('과목알림')}</h1>
        <DemoPasswordForm
          wrong={passwordTried}
          onSubmit={(password) => {
            setCourseDemoPassword(password)
            setPasswordTried(true)
            notices.retry()
            courses.retry()
          }}
        />
      </div>
    )

  const loadedCourse =
    courses.load?.status === 'ready'
      ? courses.load.data.courses.find((course) => course.courseId === courseId)
      : undefined
  const courseName =
    arrived?.courseName ??
    (loadedCourse ? courseLabel(loadedCourse).name : null)
  const item =
    arrived?.item ??
    (notices.load?.status === 'ready'
      ? notices.load.data.notifications.find(
          (notification) => notification.id === itemId,
        )
      : undefined)

  return (
    <div className="course-notices">
      <BackLink to={back} />
      {notices.load?.status === 'loading' && (
        <p className="course-status">{t('알림을 불러오고 있어요…')}</p>
      )}
      {notices.load?.status === 'error' && (
        <Retry message={notices.load.message} onRetry={notices.retry} />
      )}
      {notices.load?.status === 'ready' && !item && (
        <p className="course-status">
          {t(
            '알림을 찾을 수 없어요. 최근 90일이 지났거나 LMS에서 삭제됐을 수 있어요.',
          )}
        </p>
      )}
      {item && (
        <ItemDetail
          item={item}
          courseName={courseName}
          // 과목별 화면에서 왔을 때만 뒤로 가기로 돌아간다. 전체 과목에서 왔으면 일정을 고를 과목별 화면으로 새로 간다.
          listTarget={arrived?.from === 'course' ? -1 : listPath}
        />
      )}
    </div>
  )
}

function ItemDetail({
  item,
  courseName,
  listTarget,
}: {
  item: CourseNotification
  courseName: string | null
  listTarget: string | -1
}) {
  const { t, language } = useLanguage()
  const announcement = item.type === 'ANNOUNCEMENT'
  const href = safeLinkUrl(item.sourceUrl)
  const posted = kstLabel(item.publishedAt, language)
  const kind = t(announcement ? '공지' : '과제')

  return (
    <>
      <h1>{item.title}</h1>
      <p className="home-description">
        {[courseName, kind].filter(Boolean).join(' · ')}
      </p>

      <section
        className={`course-due-card${isPastDue(item.dueAt) ? ' is-past' : ''}`}
      >
        <span>{t('마감 · KST')}</span>
        {item.dueAt ? (
          <strong>
            {deadlineLabel(item.dueAt, language).replace(/ · KST$/, '')}
          </strong>
        ) : (
          <strong>{t(announcement ? '마감 확인 필요' : '마감 없음')}</strong>
        )}
        {item.dueAt && isPastDue(item.dueAt) && <em>{t('마감 지남')}</em>}
        {/* 공지 마감은 본문 문구로 찾으므로 근거를 함께 알린다. */}
        {announcement && (
          <small>
            {item.dueAt
              ? t('공지 본문의 "까지·마감" 문구로 찾은 마감이에요.')
              : t(
                  '본문에서 마감을 찾지 못했어요. 혹시 모르니 원문을 확인해 주세요.',
                )}
          </small>
        )}
      </section>

      <section className="home-card course-body">
        <h2>{t(announcement ? '공지 내용' : '과제 설명')}</h2>
        {item.content ? (
          <p>{item.content}</p>
        ) : (
          <p className="course-meta">
            {t('본문이 비어 있어요. 원문에서 확인해 주세요.')}
          </p>
        )}
        {posted && (
          <p className="course-meta">{t('게시 {date}', { date: posted })}</p>
        )}
        {href && (
          <a href={href} target="_blank" rel="noreferrer">
            {t('LMS 원문 보기 ›')}
          </a>
        )}
      </section>

      <BackLink className="course-back-button" to={listTarget}>
        {t('목록으로 돌아가 일정 선택')}
      </BackLink>
    </>
  )
}
