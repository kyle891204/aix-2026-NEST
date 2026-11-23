import { useEffect, useId, useRef, useState } from 'react'
import { LANGUAGE_LOCALES } from '../../../shared/i18n/language'
import type { Language } from '../../../shared/types/language'
import {
  addDays,
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

// 화살표 키로 날짜 사이를 옮겨 다닌다. 좌우는 하루, 위아래는 한 주씩이다.
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
  // 달력 안에서 지금 테두리(포커스)가 있는 날짜.
  // 달력을 펼치면 고른 날짜(없으면 오늘)로 정하고, 화살표 키를 누르면 옆 날짜로 옮긴다.
  // 11월 30일에서 → 를 누르면 12월로 넘어가 12월 1일이 되도록, 달이 바뀌어도 이 날짜를 기억한다.
  const [activeIso, setActiveIso] = useState('')
  // 펼칠 때와 화살표 키를 누를 때만 테두리를 옮긴다. 이전·다음 달 버튼을 누를 때는 옮기지 않는다.
  const moveFocus = useRef(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const grid = useRef<HTMLDivElement>(null)
  const valueId = useId()
  const titleId = useId()
  const today = todayIso()

  function show() {
    // 지난번에 화살표로 옮기다 닫았더라도 다시 펼치면 고른 날짜(없으면 오늘)에서 시작한다.
    const start = parseIsoMonth(value) ? value : today
    setActiveIso(start)
    setView(parseIsoMonth(start)!)
    moveFocus.current = true
    setOpen(true)
  }

  function moveTo(iso: string) {
    setActiveIso(iso)
    setView(parseIsoMonth(iso)!)
    moveFocus.current = true
  }

  function close(returnFocus: boolean) {
    setOpen(false)
    if (returnFocus) trigger.current?.focus()
  }

  function pick(iso: string) {
    onChange(iso)
    close(true)
  }

  // 펼치거나 화살표 키를 누르면 그 날짜 칸으로 테두리를 옮긴다.
  useEffect(() => {
    if (!open || !moveFocus.current) return
    moveFocus.current = false
    grid.current
      ?.querySelector<HTMLButtonElement>('[data-focus="true"]')
      ?.focus()
  }, [open, activeIso])

  // 달력 바깥을 누르면 닫는다.
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const days = monthGrid(view)
  const inView = (iso: string) =>
    days.some((day) => day.iso === iso && day.inMonth)
  // 보고 있는 달 안에서 테두리를 둘 날짜. 이전·다음 달 버튼으로 다른 달을 보면
  // 그 달의 고른 날짜나 오늘, 둘 다 없으면 1일에 둔다.
  const focusIso =
    [activeIso, value, today].find(inView) ??
    days.find((day) => day.inMonth)!.iso

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
      // 키보드 Tab으로 달력 밖(예: 아래 체크박스)으로 옮겨 가면 달력을 닫는다.
      // 달력 안의 "2026년 11월" 글자나 요일 글자, 칸 사이 여백을 마우스로 눌렀을 때는 닫지 않는다.
      onBlur={(event) => {
        const next = event.relatedTarget
        if (open && next && !root.current?.contains(next)) setOpen(false)
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
              // 화면에 보이는 칸 안에서 세지 않고 날짜를 계산해서 옮긴다.
              // 그래서 11월 30일에서 → 를 누르면 12월 달력으로 넘어가 12월 1일이 된다.
              const step = ARROW_STEPS[event.key]
              const current = (event.target as HTMLElement).dataset.iso
              if (!step || !current) return
              event.preventDefault()
              moveTo(addDays(current, step))
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
                data-iso={day.iso}
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
