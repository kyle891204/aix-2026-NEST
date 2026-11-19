import type { CourseSummary } from './api.ts'

export interface CourseLabel {
  // "202620HY23658_AI+X공학융합프로젝트"에서 앞의 학기·학수번호를 뗀 이름
  name: string
  // "2026-2"처럼 연도와 학기. 읽을 수 없으면 서버의 학기 이름, 그것도 없으면 null
  term: string | null
  // 학기 정렬용 "202620". 읽을 수 없으면 빈 문자열
  termKey: string
  // 과목 카드 머리에 크게 쓰는 짧은 이름(S08의 "AIX", "DB")
  short: string
}

// 한양 LMS 과목명은 "연도(4)·학기(2)·HY학수번호_과목명" 형식이다. 학기 10은 1학기, 20은 2학기다.
const LMS_NAME = /^(\d{4})(\d{2})[A-Z]{2}[0-9A-Z]+_(.+)$/
const TERMS: Record<string, string> = {
  '10': '1',
  '15': '여름',
  '20': '2',
  '25': '겨울',
}

export function courseLabel(course: CourseSummary): CourseLabel {
  const match = LMS_NAME.exec(course.courseName.trim())
  const name = match ? match[3].trim() : course.courseName.trim()
  const term = match
    ? `${match[1]}-${TERMS[match[2]] ?? match[2]}`
    : course.termName
  return {
    name,
    term,
    termKey: match ? `${match[1]}${match[2]}` : '',
    short: shortName(name),
  }
}

// 영문 약칭이 있으면 그것을("AI+X공학융합프로젝트" → "AIX", "프로젝트관리입문(CPMS)" → "CPMS"), 없으면 앞 네 글자를 쓴다.
export function shortName(name: string) {
  const latin = name.match(/[A-Za-z]+/g)?.join('') ?? ''
  if (latin.length >= 2) return latin.slice(0, 6).toUpperCase()
  return Array.from(name.replace(/[\s()[\]_·.,-]/g, ''))
    .slice(0, 4)
    .join('')
}

// 가장 최근 학기의 과목을 앞에 둔다. 학기를 읽을 수 없는 과목은 최근 학기 과목으로 본다.
export function splitByTerm(courses: CourseSummary[]) {
  const labeled = courses.map((course) => ({
    course,
    label: courseLabel(course),
  }))
  const latest = labeled.reduce(
    (max, item) => (item.label.termKey > max ? item.label.termKey : max),
    '',
  )
  return {
    current: labeled.filter(
      (item) => item.label.termKey === '' || item.label.termKey === latest,
    ),
    past: labeled.filter(
      (item) => item.label.termKey !== '' && item.label.termKey !== latest,
    ),
  }
}
