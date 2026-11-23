import { useEffect, useId, useRef, useState } from 'react'
import { LANGUAGE_LOCALES } from '../../../shared/i18n/language'
import type { Language } from '../../../shared/types/language'
import {
  fullDateLabel,
  monthGrid,
  monthTitle,
  parseIsoMonth,
  shiftMonth,
  todayIso,
  weekdayNames,
  type CalendarMonth,
} from '../calendar'

// 브라우저 기본 날짜 칸과 달력은 브라우저 언어를 따라 앱 언어로 바뀌지 않는다.
// 그래서 칸과 달력을 직접 그리고, 월·요일 이름은 Intl로 선택 언어에 맞춘다.
// 공용 번역 파일을 건드리지 않도록 이 칸에서만 쓰는 문구는 여기에 둔다.
const TEXT: Record<
  Language,
  {
    placeholder: string
    previous: string
    next: string
    today: string
    clear: string
  }
> = {
  ko: {
    placeholder: '년-월-일',
    previous: '이전 달',
    next: '다음 달',
    today: '오늘',
    clear: '지우기',
  },
  en: {
    placeholder: 'yyyy-mm-dd',
    previous: 'Previous month',
    next: 'Next month',
    today: 'Today',
    clear: 'Clear',
  },
  zh: {
    placeholder: '年-月-日',
    previous: '上个月',
    next: '下个月',
    today: '今天',
    clear: '清除',
  },
}

// 화살표 키로 날짜 사이를 옮겨 다닌다. 위아래는 한 주씩이다.
const ARROW_STEPS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
}

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  language: Language
  /** 칸 이름을 가진 요소의 id. */
  labelId: string
}

export function DatePicker({
  value,
  onChange,
  language,
  labelId,
}: DatePickerProps) {
  const text = TEXT[language]
  const locale = LANGUAGE_LOCALES[language]
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<CalendarMonth>(
    () => parseIsoMonth(value) ?? parseIsoMonth(todayIso())!,
  )
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const grid = useRef<HTMLDivElement>(null)
  const valueId = useId()
  const titleId = useId()
  const today = todayIso()

  function show() {
    setView(parseIsoMonth(value) ?? parseIsoMonth(today)!)
    setOpen(true)
  }

  function close(returnFocus: boolean) {
    setOpen(false)
    if (returnFocus) trigger.current?.focus()
  }

  function pick(iso: string) {
    onChange(iso)
    close(true)
  }

  // 열리면 고른 날짜(없으면 오늘)에 포커스를 둔다. 바깥을 누르면 닫는다.
  useEffect(() => {
    if (!open) return
    grid.current
      ?.querySelector<HTMLButtonElement>('[data-focus="true"]')
      ?.focus()
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const days = monthGrid(view)
  const focusIso = days.some((day) => day.iso === value && day.inMonth)
    ? value
    : days.some((day) => day.iso === today && day.inMonth)
      ? today
      : days.find((day) => day.inMonth)!.iso

  return (
    <div
      className="notice-date"
      ref={root}
      onKeyDown={(event) => {
        if (open && event.key === 'Escape') {
          event.stopPropagation()
          close(true)
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="notice-date-button"
        aria-labelledby={labelId}
        aria-describedby={valueId}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close(false) : show())}
      >
        <span id={valueId} className={value ? undefined : 'notice-date-empty'}>
          {value || text.placeholder}
        </span>
      </button>

      {open && (
        <div
          className="notice-calendar"
          role="dialog"
          aria-labelledby={titleId}
        >
          <div className="notice-calendar-head">
            <button
              type="button"
              aria-label={text.previous}
              onClick={() => setView(shiftMonth(view, -1))}
            >
              ‹
            </button>
            <strong id={titleId} aria-live="polite">
              {monthTitle(view, locale)}
            </strong>
            <button
              type="button"
              aria-label={text.next}
              onClick={() => setView(shiftMonth(view, 1))}
            >
              ›
            </button>
          </div>

          <div
            className="notice-calendar-grid"
            ref={grid}
            onKeyDown={(event) => {
              const step = ARROW_STEPS[event.key]
              if (!step || !grid.current) return
              const buttons = [
                ...grid.current.querySelectorAll<HTMLButtonElement>(
                  '.notice-calendar-day',
                ),
              ]
              const current = buttons.indexOf(
                document.activeElement as HTMLButtonElement,
              )
              if (current < 0) return
              event.preventDefault()
              const next = Math.min(
                Math.max(current + step, 0),
                buttons.length - 1,
              )
              buttons[next].focus()
            }}
          >
            {weekdayNames(locale).map((name) => (
              <span key={name} className="notice-calendar-weekday">
                {name}
              </span>
            ))}
            {days.map((day) => (
              <button
                key={day.iso}
                type="button"
                className={[
                  'notice-calendar-day',
                  day.inMonth ? '' : 'is-outside',
                  day.iso === today ? 'is-today' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={fullDateLabel(day.iso, locale)}
                aria-pressed={day.iso === value}
                tabIndex={day.iso === focusIso ? 0 : -1}
                data-focus={day.iso === focusIso}
                onClick={() => pick(day.iso)}
              >
                {day.day}
              </button>
            ))}
          </div>

          <div className="notice-calendar-foot">
            <button type="button" onClick={() => pick('')}>
              {text.clear}
            </button>
            <button type="button" onClick={() => pick(today)}>
              {text.today}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
