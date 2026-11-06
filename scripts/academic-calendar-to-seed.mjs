// 브라우저에서 저장한 학사일정 파일(sYear별 get_term_events 응답)을 백엔드 seed로 변환한다.
// 사용: node scripts/academic-calendar-to-seed.mjs [--checked-at=YYYY-MM-DD] <저장한 파일>...
// checkedAt은 공식 페이지와 대조한 날이다. 예전에 저장한 파일을 다시 변환할 때는 저장한 날을 넣는다(기본값: 오늘).
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const OUTPUT = new URL(
  "../backend/src/main/resources/seed/academic-calendar.json",
  import.meta.url,
);
const SOURCE_URL = "https://www.hanyang.ac.kr/-93";
const DATE_TIME = /^(\d{4}-\d{2}-\d{2}) \d{2}:\d{2}$/;

function date(value, subject) {
  const match = DATE_TIME.exec(value);
  if (!match) throw new Error(`날짜를 읽을 수 없습니다: ${subject} (${value})`);
  return match[1];
}

// 학년도는 3월에 시작한다. 2027년 1~2월 일정은 2026학년도다.
function academicYear(startDate) {
  const [year, month] = startDate.split("-").map(Number);
  return month >= 3 ? year : year - 1;
}

function readEvents(path) {
  const saved = JSON.parse(readFileSync(path, "utf8"));
  if (saved.status !== true) throw new Error(`정상 응답이 아닙니다: ${path}`);
  return JSON.parse(saved.data).flatMap((month) => month.events);
}

const CHECKED_AT = /^--checked-at=(\d{4}-\d{2}-\d{2})$/;
const args = process.argv.slice(2);
const checkedAtArg = args.find((arg) => arg.startsWith("--checked-at"));
if (checkedAtArg && !CHECKED_AT.test(checkedAtArg)) {
  console.error("--checked-at=YYYY-MM-DD 형식으로 입력해 주세요.");
  process.exit(1);
}
const paths = args.filter((arg) => arg !== checkedAtArg);
if (paths.length === 0) {
  console.error("저장한 학사일정 파일 경로를 입력해 주세요.");
  process.exit(1);
}

// 일정 날짜가 바뀌어도 저장해 둔 개인 일정이 끊기지 않도록 학년도, 제목, 같은 학년도·제목 안의 순서로 ID를 만든다.
// 공식 응답에는 일정 고유 ID가 없다. 학년도가 없으면 내년 같은 제목의 일정이 올해 저장한 일정과 같은 ID가 된다.
const seen = new Map();
const events = paths
  .flatMap(readEvents)
  .map((event) => ({
    title: event.subject.trim(),
    startDate: date(event.startDateTime, event.subject),
    endDate: date(event.endDateTime, event.subject),
  }))
  .sort(
    (a, b) =>
      a.startDate.localeCompare(b.startDate) ||
      a.endDate.localeCompare(b.endDate) ||
      a.title.localeCompare(b.title),
  )
  .map((event) => {
    const year = academicYear(event.startDate);
    const key = `${year}:${event.title}`;
    const order = (seen.get(key) ?? 0) + 1;
    seen.set(key, order);
    const hash = createHash("sha256").update(event.title).digest("hex");
    return {
      scheduleId: `academic-${year}-${hash.slice(0, 10)}-${order}`,
      ...event,
    };
  });

const checkedAt = checkedAtArg
  ? CHECKED_AT.exec(checkedAtArg)[1]
  : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
      new Date(),
    );
writeFileSync(
  OUTPUT,
  `${JSON.stringify({ sourceUrl: SOURCE_URL, checkedAt, events }, null, 2)}\n`,
);
console.log(`${events.length}건을 저장했습니다 (${checkedAt} 기준).`);
