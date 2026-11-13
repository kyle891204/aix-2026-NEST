import { useLanguage } from '../../shared/i18n/language-context'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { schoolMessage } from '../../shared/i18n/school-message'
import { ApiError } from '../../shared/api/client'
import { useAuth } from '../auth/auth-context'
import { getAcademicSchedules, type AcademicSchedules } from './api'
import {
  dateRangeLabel,
  eventTiming,
  groupByStartMonth,
  kstToday,
  monthLabel,
  msUntilKstMidnight,
  upcomingRange,
  weekDays,
} from './academic-format'
import {
  addAcademicSchedule,
  isAcademicSaved,
  type PersonalChange,
  type PersonalSchedule,
} from './personal-schedule-store'
import { PersonalSchedules } from './PersonalSchedules'
import { usePersonalSchedules } from './usePersonalSchedules'
import './schedule.css'

const OFFICIAL_URL = 'https://www.hanyang.ac.kr/-93'

type Load =
  | { status: 'signed-out' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: AcademicSchedules }

export function AcademicSchedulePage() {
  const { session } = useAuth()
  const accountId = session?.user?.id ?? null
  // 계정이 바뀌면 다시 만들어 이전 계정의 일정이 화면에 남지 않게 한다.
  return <ScheduleTabs key={accountId ?? 'signed-out'} accountId={accountId} />
}

// 화면을 켜 둔 채 자정을 넘기거나 다른 앱에 있다가 돌아와도 오늘 날짜를 다시 계산한다.
function useKstToday() {
  const [today, setToday] = useState(() => kstToday())
  useEffect(() => {
    const refresh = () => setToday(kstToday())
    // 타이머가 자정 직전에 깨어나지 않도록 1초 여유를 둔다.
    let timer = window.setTimeout(function tick() {
      refresh()
      timer = window.setTimeout(tick, msUntilKstMidnight() + 1000)
    }, msUntilKstMidnight() + 1000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])
  return today
}

function ScheduleTabs({ accountId }: { accountId: string | null }) {
  const { t, language } = useLanguage()

  // 로그인 세션(게스트 포함)을 먼저 받은 뒤 요청한다. 동시에 보내면 게스트 세션이 둘 생길 수 있다.
  const { loading: authLoading } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'mine' ? 'mine' : 'academic'
  const today = useKstToday()
  // 날짜가 바뀌어도 조회 기간은 달이 바뀔 때만 달라지므로 그때만 다시 요청한다.
  const { from, to } = upcomingRange(today)
  const [attempt, setAttempt] = useState(0)
  // 결과에 재시도 횟수를 붙여 두고, 현재 횟수와 다르면 불러오는 중으로 본다.
  const [result, setResult] = useState<{ attempt: number; load: Load } | null>(
    null,
  )
  const load = !authLoading && result?.attempt === attempt ? result.load : null
  const personal = usePersonalSchedules(accountId)

  function showAcademic() {
    setSearchParams({}, { replace: true })
  }

  useEffect(() => {
    if (authLoading) return
    let active = true
    getAcademicSchedules(from, to)
      .then((data) => {
        if (active) setResult({ attempt, load: { status: 'ready', data } })
      })
      .catch((cause: unknown) => {
        const code = cause instanceof ApiError ? cause.code : null
        // 로그인하지 않은 미리보기에서는 다시 시도해도 성공할 수 없으므로 로그인 안내만 보여준다.
        const load: Load =
          code === 'AUTH_REQUIRED'
            ? { status: 'signed-out' }
            : {
                status: 'error',
                message: code
                  ? `학사일정을 불러오지 못했어요. (${code})`
                  : '학사일정을 불러오지 못했어요.',
              }
        if (active) setResult({ attempt, load })
      })
    return () => {
      active = false
    }
  }, [authLoading, attempt, from, to])

  return (
    <div className="academic-schedule">
      <h1>{t('학사일정')}</h1>
      {tab === 'mine' && (
        <p className="schedule-lead">
          {t('필요한 일정만 골라 개인 일정으로 관리해요.')}
        </p>
      )}
      <p className="schedule-summary">
        <strong>
          {tab === 'mine'
            ? t('저장 일정 총 {count}건', { count: personal.schedules.length })
            : load?.status === 'ready'
              ? t('학교 일정 총 {count}건', {
                  count: load.data.schedules.length,
                })
              : t('학교 일정')}
        </strong>
        {tab === 'academic' &&
          load?.status === 'ready' &&
          load.data.checkedAt && (
            <span>{t('{date} 기준', { date: load.data.checkedAt })}</span>
          )}
      </p>

      <div className="schedule-tabs" role="group" aria-label={t('일정 종류')}>
        <button
          type="button"
          aria-pressed={tab === 'academic'}
          onClick={showAcademic}
        >
          {t('학교 학사일정')}
        </button>
        <button
          type="button"
          aria-pressed={tab === 'mine'}
          onClick={() => setSearchParams({ tab: 'mine' }, { replace: true })}
        >
          {t('개인 저장')}
        </button>
      </div>

      {personal.saveFailed && (
        <p className="schedule-error" role="alert">
          {t(
            '브라우저에 저장하지 못했어요. 저장 공간이나 브라우저 설정을 확인해 주세요.',
          )}
        </p>
      )}

      {!accountId && !authLoading ? (
        <p className="schedule-status">
          {t('로그인하면 일정을 볼 수 있어요.')}{' '}
          <Link to="/login">{t('로그인하기 ›')}</Link>
        </p>
      ) : tab === 'mine' ? (
        <PersonalSchedules
          schedules={personal.schedules}
          recentIds={personal.recentIds}
          today={today}
          onChange={personal.update}
        />
      ) : (
        <>
          <WeekCard today={today} />
          {!load && (
            <p className="schedule-status">
              {t('학사일정을 불러오고 있어요…')}
            </p>
          )}
          {load?.status === 'signed-out' && (
            <p className="schedule-status">
              {t('로그인하면 학사일정을 볼 수 있어요.')}{' '}
              <Link to="/login">{t('로그인하기 ›')}</Link>
            </p>
          )}
          {load?.status === 'error' && (
            <div className="schedule-error" role="alert">
              <p>{schoolMessage(language, load.message)}</p>
              <button
                type="button"
                onClick={() => setAttempt((value) => value + 1)}
              >
                {t('다시 시도')}
              </button>
            </div>
          )}
          {load?.status === 'ready' && (
            <EventList
              data={load.data}
              today={today}
              saved={personal.schedules}
              onChange={personal.update}
            />
          )}

          <footer className="schedule-source">
            <p>{t('학교 일정은 자동으로 갱신되지 않아요.')}</p>
            <a
              href={
                load?.status === 'ready' ? load.data.sourceUrl : OFFICIAL_URL
              }
              target="_blank"
              rel="noreferrer"
            >
              {t('공식 학사일정 보기 ›')}
            </a>
          </footer>
        </>
      )}
    </div>
  )
}

function WeekCard({ today }: { today: string }) {
  const { t, language } = useLanguage()

  return (
    <section className="schedule-week">
      <h2>{monthLabel(today.slice(0, 7), language)}</h2>
      <ol>
        {weekDays(today).map((item) => (
          <li
            key={item.date}
            aria-current={item.date === today ? 'date' : undefined}
          >
            {item.day} {t(item.weekday)}
          </li>
        ))}
      </ol>
      <p>{t('ERICA 학부 일정 · 이번 달부터 보여드려요')}</p>
    </section>
  )
}

function EventList({
  data,
  today,
  saved,
  onChange,
}: {
  data: AcademicSchedules
  today: string
  saved: PersonalSchedule[]
  onChange: (change: PersonalChange) => boolean
}) {
  const { t, language } = useLanguage()

  if (data.schedules.length === 0)
    return <p className="schedule-status">{t('아직 올라온 일정이 없어요.')}</p>
  const thisMonth = today.slice(0, 7)
  return (
    <>
      {groupByStartMonth(data.schedules, thisMonth).map((group) => (
        <section className="schedule-month" key={group.month}>
          {/* 이번 달은 위의 주간 카드가 제목 역할을 한다. */}
          {group.month !== thisMonth && (
            <h2>{monthLabel(group.month, language)}</h2>
          )}
          <ul>
            {group.events.map((event) => {
              const timing = eventTiming(event, today)
              const isSaved = isAcademicSaved(saved, event.scheduleId)
              return (
                <li
                  className={`schedule-event schedule-event--${timing}`}
                  key={event.scheduleId}
                >
                  <strong>{event.title}</strong>
                  <span>
                    {t('학교 학사일정')} · {dateRangeLabel(event, language)}
                    {timing === 'ongoing' && <em>{t('진행 중')}</em>}
                  </span>
                  {/* 이미 끝난 일정은 새로 저장할 필요가 없어 버튼을 보여주지 않는다. */}
                  {(isSaved || timing !== 'past') && (
                    <div className="schedule-event-actions">
                      <button
                        type="button"
                        disabled={isSaved}
                        aria-label={
                          isSaved
                            ? t('{title} 저장됨', { title: event.title })
                            : t('{title} 내 일정에 저장', {
                                title: event.title,
                              })
                        }
                        onClick={() =>
                          onChange((current) =>
                            addAcademicSchedule(current, event, data.sourceUrl),
                          )
                        }
                      >
                        {isSaved ? t('저장됨') : t('내 일정에 저장')}
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </>
  )
}
