import { useLanguage } from '../../shared/i18n/language-context'
import { eventTiming, fullDateRangeLabel } from './academic-format'
import {
  removeSchedule,
  type PersonalChange,
  type PersonalSchedule,
} from './personal-schedule-store'

export function PersonalSchedules({
  schedules,
  recentIds,
  today,
  onChange,
}: {
  schedules: PersonalSchedule[]
  recentIds: string[]
  today: string
  onChange: (change: PersonalChange) => boolean
}) {
  const { t } = useLanguage()

  function remove(item: PersonalSchedule) {
    if (
      window.confirm(t('"{title}" 일정을 삭제할까요?', { title: item.title }))
    )
      onChange((current) => removeSchedule(current, item.id))
  }

  return (
    <>
      {recentIds.length > 0 && (
        <div className="saved-banner" role="status">
          <strong>
            {t('선택한 {count}개 일정을 저장했어요.', {
              count: recentIds.length,
            })}
          </strong>
        </div>
      )}
      {schedules.length > 0 && (
        <section className="saved-section">
          <h2>{t('저장한 일정')}</h2>
          <ul>
            {schedules.map((item) => (
              <SavedCard
                key={item.id}
                item={item}
                today={today}
                onRemove={() => remove(item)}
              />
            ))}
          </ul>
        </section>
      )}
      {schedules.length === 0 && (
        <p className="schedule-status">
          {t(
            '아직 저장한 일정이 없어요. 학교 학사일정에서 필요한 일정을 저장해 보세요.',
          )}
        </p>
      )}
      <p className="schedule-note">
        {t(
          '동일한 항목은 중복 저장하지 않습니다. 개인 일정은 이 브라우저에만 저장되고 다른 기기에서는 보이지 않아요.',
        )}
      </p>
    </>
  )
}

function SavedCard({
  item,
  today,
  onRemove,
}: {
  item: PersonalSchedule
  today: string
  onRemove: () => void
}) {
  const { t, language } = useLanguage()

  return (
    <li className={`saved-card saved-card--${eventTiming(item, today)}`}>
      <div className="saved-card-head">
        <span>{t('학사일정')}</span>
        <small>{t('저장됨')}</small>
        <button
          type="button"
          aria-label={t('{title} 삭제', { title: item.title })}
          onClick={onRemove}
        >
          {t('삭제')}
        </button>
      </div>
      <div className="saved-card-body">
        <div>
          <strong>{item.title}</strong>
          <p>{fullDateRangeLabel(item, language)}</p>
        </div>
        {item.sourceUrl && (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={t('{title} 공식 일정 확인', { title: item.title })}
          >
            ›
          </a>
        )}
      </div>
    </li>
  )
}
