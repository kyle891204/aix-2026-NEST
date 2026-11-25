# API 계약

API 접두사: `/api/v1`.
실제 구현된 API와 아래 검토용 후보를 구분한다.

## 현재 구현

### Google 로그인 / 세션

모든 인증 요청은 프론트와 같은 원본의 `/api/v1/auth/*`로 보낸다.
Google 토큰이나 세션 ID를 URL/브라우저 저장소에 넣지 않는다. 응답은 `Cache-Control: no-store`다.

| 메서드·경로 | 요청 | 응답 |
| --- | --- | --- |
| GET `/auth/session` | 없음 | `{ user: null 또는 { id, email }, googleClientId, csrfToken, nonce }` |
| POST `/auth/google` | JSON `{ credential }` + `X-CSRF-Token` | 인증 후 새 세션과 위와 같은 응답 |
| GET `/auth/me` | 세션 쿠키 | `{ id, email }`; 비로그인 401 |
| POST `/auth/logout` | 세션 쿠키 + `X-CSRF-Token` | `{ loggedOut: true }`; 세션 폐기 |

`AUTH_DEMO_GUEST=true`이면 `/auth/session`은 게스트 사용자와 CSRF 토큰을 반환한다.
기존 로그인 사용자는 유지하며, 게스트 ID는 세션별로 구분한다.
서버 로그인 보호 및 `Cache-Control: no-store` 적용 경로에
`/courses/**`, `/dashboard/**`, `/schedules/**`를 추가했다.
경로 보호 등록은 해당 API의 기능 구현 완료를 의미하지 않는다.
게스트 설정과 사용 제한은 [로그인 문서](features/auth.md)를 참고한다.

실제 로그인 사용자의 `id`는 Google `sub`이며, 게스트는 세션별 `guest-` ID를 사용한다.
이 값은 회원 DB의 가입 완료 여부를 뜻하지 않는다.
`googleClientId`가 비어 있으면 로그인이 아직 설정되지 않은 상태다.
오류 형식은 `{ code, message, fields: {} }`다. 대표 코드는 `AUTH_REQUIRED`(401),
`AUTH_INVALID_CREDENTIAL`(401), `AUTH_CHALLENGE_EXPIRED`(401), `AUTH_CSRF_INVALID`(403),
`AUTH_NOT_CONFIGURED`(503), `AUTH_PROVIDER_UNAVAILABLE`(503)다.
`/auth/**`를 제외한 `/api/v1/**`의 POST·PUT·PATCH·DELETE에는 세션과 일치하는 `X-CSRF-Token`이 필요하다.
없거나 틀리면 `AUTH_CSRF_INVALID`(403)다. 프론트는 `requestJson`이 자동 첨부한다.
10분이 지난 로그인 시도는 `/auth/session`을 다시 읽어 새 nonce로 재시도한다.
설정·배포·한계는 [로그인 문서](features/auth.md)를 참고한다.

### GET /api/v1/health

```json
{
  "status": "UP",
  "service": "team03-backend",
  "timestamp": "2026-10-14T00:00:00Z"
}
```

timestamp는 실행 시각을 UTC ISO 8601 형식으로 반환한다. 인증 없는 개발 연결 확인용 엔드포인트다. DB·LMS·AI 연결 상태를 의미하지 않는다.

### 요청 DTO 검증 실패 형식

`@Valid` DTO를 사용하는 엔드포인트에서 검증이 실패하면 HTTP 400을 반환한다.

```json
{
  "code": "INVALID_REQUEST",
  "message": "입력 값을 확인해 주세요.",
  "fields": { "preferredLanguage": "must not be blank" }
}
```

`@Valid` 요청 DTO는 로그인, 공지 번역, 게시글 번역(단건·묶음)에 쓴다. 위 `fields` 값은 형식 예시다. 기타 오류는 아직 공통 형식으로 통일하지 않았다.

### POST /api/v1/community/translations

장터·질문 글과 답글을 조회자의 선호 언어로 번역한다. 로그인 세션이 필요하며(비로그인 401 `AUTH_REQUIRED`) 응답은 `Cache-Control: no-store`다.
화면 연결은 아직 없다. 게시판 화면은 아래 묶음 번역 API를 쓴다.

| 필드 | 규칙 |
| --- | --- |
| `text` | 필수, 공백 불가, 최대 3000자 |
| `targetLanguage` | 필수, `ko` / `en` / `zh`(간체) |
| `sourceLanguage` | 선택, `ko` / `en` / `zh`. 목표 언어와 같으면 Gemini를 호출하지 않고 원문을 반환한다. |
| `context` | 선택, 최대 200자. 해석 참고용이며 번역하지 않는다. |

```json
{ "translatedText": "Desk for sale", "targetLanguage": "en", "cached": false }
```

- 입력 오류는 위 검증 실패 형식(400 `INVALID_REQUEST`)을 따른다.
- 키 미설정·Gemini 응답 오류·네트워크 실패는 모두 502 `{ "code": "TRANSLATION_FAILED", "message": "...", "fields": {} }`다.
  화면은 원문을 유지하고 재시도를 제공한다. 원인은 서버 로그에만 남긴다.
- `cached`는 서버 메모리 캐시(1시간, 최대 200건) 재사용 여부이며 재시작·재배포 시 초기화된다.

### GET /api/v1/schedules/academic

학사일정(#10)을 조회한다. 로그인이 필요하다(게스트 포함). 학교 사이트가 자동 수집을 막고 있어
공식 페이지에서 옮긴 `seed/academic-calendar.json`으로 제공하며 자동 갱신되지 않는다.
개인 일정은 서버 API 없이 프론트 localStorage에 저장한다.

| 쿼리 | 필수 | 설명 |
| --- | --- | --- |
| `from` | Y | 조회 시작일 (`YYYY-MM-DD`) |
| `to` | Y | 조회 종료일 (`YYYY-MM-DD`). `from` 이후, 시작일과 종료일을 포함해 최대 366일 |

```json
{
  "sourceUrl": "https://www.hanyang.ac.kr/-93",
  "checkedAt": "2026-11-04",
  "schedules": [
    { "scheduleId": "academic-2026-0123456789-1", "title": "일정 제목", "startDate": "2026-11-02", "endDate": "2026-11-06" }
  ]
}
```

기간과 겹치는 일정을 시작일 순으로 돌려준다. 하루 일정은 `startDate`와 `endDate`가 같다.
`scheduleId` 형식은 `academic-<학년도>-<제목 해시 10자>-<같은 학년도·제목 안의 순서>`다.
`checkedAt`은 공식 페이지와 대조한 날짜이고, 일정을 넣기 전에는 null이다.
날짜 누락·형식 오류·기간 초과는 400 `INVALID_REQUEST`(`fields.from` 또는 `fields.to`)다.

일정 갱신: 브라우저에서 학사일정 페이지를 연 뒤 같은 브라우저로 `get_term_events` 응답을 파일로 저장하고,
`node scripts/academic-calendar-to-seed.mjs <파일>...`로 변환한다. 학년도별 파일을 모두 넘긴다(`sYear=2026`은 2026년 3월~2027년 2월).
`checkedAt`은 변환한 날로 들어간다. 예전에 저장한 파일을 다시 변환할 때는 `--checked-at=YYYY-MM-DD`로 저장한 날을 넣는다.

### POST /api/v1/community/translations/batch

게시판(장터·질문·자유)의 제목·본문·댓글·답글과 공지 목록 제목을 한 번에 번역한다. 위 단건 API는 그대로 두고, 화면은 이 API를 쓴다.
로그인·CSRF·`Cache-Control: no-store`는 다른 API와 같다. 요청 형식과 제한(1~100항목, 항목별 원문 3,000자 등), 항목별 결과(`SUCCEEDED`·`SKIPPED`·`FAILED`)는
[번역 문서](features/translation.md#새-api)에 있다. 일부 항목이 실패해도 HTTP 200이며 항목별 `status`를 확인한다.

### 공지 (전체 공지 S06·공지 상세 S07)

동작 규칙은 [공지 문서](features/notices.md)에 있다. 아래 세 API는 로그인이 필요하고(비로그인 401 `AUTH_REQUIRED`), POST라 `X-CSRF-Token`이 필요하다.
응답은 `Cache-Control: no-store`다. 프로필은 브라우저에만 있어 조회도 POST 본문으로 보내며, 서버는 저장하지 않는다.

프로필 본문(목록·상세 공통, 생략 가능):

| 필드 | 설명 |
| --- | --- |
| `nationality` | ISO 국가 코드 2자리 (예: `CN`) |
| `visaType` | 비자 코드 (예: `D-2`). 프로필에서 받지 않아 프론트는 항상 `null`을 보낸다 |
| `degree` | `BACHELOR` / `MASTER` / `DOCTORAL` / `EXCHANGE` / `LANGUAGE` |
| `year` | `"1"`~`"6"` |
| `collegeId` | 단과대 ID (예: `business-economics`). 없으면 ERICA 전체 공지만 본다 |

코드로 읽을 수 없는 값은 값 없음으로 판별하고, 길이가 길어도 400을 내지 않는다.

#### POST /api/v1/notices/search

| 쿼리 | 필수 | 설명 |
| --- | --- | --- |
| `source` | N | `UNIVERSITY` / `INTERNATIONAL` / `COLLEGE`. 없으면 전체 |
| `match` | N | `APPLICABLE` / `NEEDS_REVIEW`. 없으면 전체. `NOT_APPLICABLE`은 받지 않는다 |

```json
{
  "items": [
    {
      "noticeId": "<게시판 키>-<글 ID>", "source": "INTERNATIONAL", "sourceName": "<게시판 이름>", "category": "VISA",
      "title": "공지 제목", "postedAt": "2026-11-20", "analysisStatus": "CONFIRMED",
      "matchStatus": "APPLICABLE", "matchReasons": ["…"], "deadline": "2026-11-30T23:59:00+09:00", "sample": false
    }
  ],
  "truncated": false
}
```

- 해당 → 확인 필요 → 해당 안 됨 순이고, 같은 상태 안에서는 마감일이 이른 순이다. 마감이 지난 공지도 빼지 않으며, 마감이 없으면 뒤로 간다.
- 목록은 이미 분석한 공지만 분석 결과로 판별하고 Gemini를 부르지 않는다.
- `category`는 `VISA` / `SCHOLARSHIP` / `ACADEMIC` / `EVENT` / `ETC`, `postedAt`은 `yyyy-MM-dd` 또는 `null`이다. `truncated`는 현재 항상 `false`다.
- 잘못된 쿼리 값이나 읽을 수 없는 JSON은 400 `INVALID_REQUEST`, 학교 공지 목록을 한 번도 읽지 못했으면 503 `NOTICE_SOURCE_UNAVAILABLE`이다.

#### POST /api/v1/notices/{noticeId}/view

공지 상세. 목록과 같은 프로필 본문을 보낸다. 처음 여는 실제 공지는 이때 Gemini로 분석하고, 실패하면 분석 전 공지를 그대로 준다.

응답은 목록 항목의 필드에 다음을 더한다.

| 필드 | 설명 |
| --- | --- |
| `target` | 공지 대상 설명 |
| `targetConditions` | `{ nationalities, visaTypes, degrees, years }`. 목록이 비어 있으면 그 조건은 전체 대상 |
| `actions` | 해야 할 일 `[{ id, text }]` |
| `documents` | 준비 서류 이름 목록 |
| `attachments` | 첨부 `[{ name, url }]` |
| `originalContent`, `originalLanguage`, `sourceUrl` | 원문, 원문 언어, 원문 링크 |
| `savedScheduleId` | 현재 항상 `null`. 개인 일정은 브라우저에 저장한다 |

- 없는 공지와 다른 단과대 공지는 404 `NOTICE_NOT_FOUND`다.

#### POST /api/v1/notices/{noticeId}/translations

| 필드 | 규칙 |
| --- | --- |
| `targetLanguage` | 필수, `ko` / `en` / `zh`(간체) |
| `collegeId` | 선택. 다른 단과대 공지를 번역하지 않도록 상세와 같이 보낸다 |

```json
{
  "noticeId": "…", "targetLanguage": "en", "translationStatus": "SUCCEEDED",
  "translated": { "title": "…", "target": "…", "actions": [{ "id": "…", "text": "…" }], "documents": ["…"], "content": "…" },
  "retryable": false, "message": null
}
```

- 번역에 실패해도 HTTP 200이다. `translationStatus: "FAILED"`, `translated: null`, `retryable: true`와 재시도 안내 `message`를 준다. 원인은 서버 로그에만 남긴다.
- 원문과 같은 언어면 Gemini를 부르지 않는다. 본문이 3,000자를 넘으면 앞부분만 번역하고 안내 문구를 붙인다.
- 번역한 필드는 서버 캐시에 남아, 재시도하면 실패한 필드부터 이어서 호출한다.
- 검증 실패는 400 `INVALID_REQUEST`, 없는 공지는 404 `NOTICE_NOT_FOUND`다.

### POST /api/v1/dashboard

맞춤 공지 대시보드(#6). 판별 규칙은 [대시보드 문서](features/dashboard.md)에 있다. 로그인과 `X-CSRF-Token`이 필요하다.
본문은 위 공지 API의 프로필 본문과 같다. 생략하면 빈 프로필로 판별한다. `collegeId`는 공지를 고를 때만 쓴다.

| 쿼리 | 필수 | 설명 |
| --- | --- | --- |
| `limit` | N | 1~50, 기본 20. 벗어나면 400 `INVALID_REQUEST`(`fields.limit`) |

```json
{
  "profileCompleted": false,
  "missingProfileFields": ["visaType"],
  "matchedNotices": [
    {
      "noticeId": "…", "title": "공지 제목", "category": "VISA", "postedAt": "2026-11-20",
      "deadline": "2026-11-30T23:59:00+09:00", "sourceUrl": "https://…", "matchReasons": ["…"],
      "matchStatus": "NEEDS_REVIEW", "analysisStatus": "CONFIRMED", "savedScheduleId": null, "sample": false
    }
  ]
}
```

- 해당(`APPLICABLE`)과 확인 필요(`NEEDS_REVIEW`) 공지만 주고, 마감이 지난 공지는 뺀다.
- `missingProfileFields`는 코드로 읽지 못한 프로필 필드의 요청 필드명이다. 프론트가 `visaType`을 항상 `null`로 보내므로 `profileCompleted`는 늘 `false`이고, 화면은 국적·학위과정·학년이 빠졌을 때만 입력을 안내한다.
- 학교 공지 목록을 한 번도 읽지 못했으면 503 `NOTICE_SOURCE_UNAVAILABLE`이다.

### 과목알림 (#9)

동작 규칙은 [과목알림 문서](features/courses.md)에 있다. 공통 데모 계정 하나의 LMS 데이터이며, 사용자별 수강 여부는 판별하지 않는다.

- 로그인이 필요하다. 운영(`prod`)에서는 `lms-demo` 프로필일 때만 열리고, `X-LMS-Demo-Password` 헤더로 데모 암호를 확인한다.
  틀리면 401 `LMS_DEMO_UNAUTHORIZED`, 서버에 암호가 없으면 503 `LMS_DEMO_NOT_CONFIGURED`다. 설정은 [배포 문서](deployment.md#공통-계정-lms-데모)에 있다.
- LMS 오류는 `{ code, message, upstreamStatus }` 형식이다.

| 메서드·경로 | 쿼리 | 응답 |
| --- | --- | --- |
| GET `/courses` | 없음 | `{ courses: [{ courseId, courseName, courseCode, termName }], truncated }`. `termName`은 아직 `null` |
| GET `/courses/notifications` | `startDate`, `endDate` | `{ courses, notifications, errors: [{ courseId, type, code }], truncated }`. 전체 과목의 공지와 마감 있는 과제 |
| GET `/courses/{courseId}/notifications` | `type`, `startDate`, `endDate` | `{ courseId, notifications, errors: [{ type, code }], truncated }` |

- `type`: `ALL`(기본) / `ANNOUNCEMENT` / `ASSIGNMENT` / `MATERIAL`. 다른 값은 400 `INVALID_REQUEST`(`fields.type`)다.
- `startDate`·`endDate`(`YYYY-MM-DD`)는 **공지**의 게시 기간이다. 기본은 한국 날짜 기준 최근 90일이고, 종료일만 보내면 그 전 90일, 시작일만 보내면 오늘까지다.
  종료일이 시작일보다 앞서거나 기간이 366일을 넘으면 400 `INVALID_LMS_QUERY`다.
- 과목별 API의 과제는 기간과 관계없이 모두 준다. 전체 과목 API는 마감 있는 과제만 넣고, 마감 지난 과제는 시작일 이후에 마감된 것만 넣는다.
- 한 과목이나 한 유형이 실패하면 `errors`에 적고 나머지를 준다. 모두 실패하면 LMS 오류를 그대로 돌려준다. `truncated`는 LMS 페이지 상한에 걸린 목록이 있으면 `true`다.

알림 항목:

```json
{
  "courseId": "42", "id": "announcement-123", "type": "ANNOUNCEMENT", "title": "과제 안내",
  "publishedAt": "2026-11-10T09:00:00+09:00", "dueAt": "2026-11-20T23:59:00+09:00", "lockAt": null,
  "materialType": null, "moduleName": null, "sourceUrl": "https://…", "savedScheduleId": null, "content": "…"
}
```

- `id`는 `announcement-`·`assignment-`·`material-` 뒤에 LMS ID를 붙인 값이다.
- 공지의 `dueAt`은 본문에서 규칙으로 찾은 마감이고, 못 찾으면 `null`이다. 과제의 `dueAt`·`lockAt`은 LMS 값 그대로다.
- `content`는 공지 본문·과제 설명을 줄바꿈만 살린 글로 바꾼 값이며, 학습자료는 `null`이다. `savedScheduleId`는 현재 항상 `null`이다.

## 구현된 LMS 개발 검사 API

- GET `/dev/lms/profile`: 토큰 소유자 정보.
- GET `/dev/lms/courses`: 활성 과목 목록.
- GET `/dev/lms/courses/{courseId}`: 과목 코드·설명·강의계획 원본 HTML·시간대.
- GET `/dev/lms/courses/{courseId}/assignments`: 과제 설명·마감·제출 가능 시작·제출 차단·제출 방식.
- GET `/dev/lms/courses/{courseId}/modules`: 주차별 학습 모듈.
- GET `/dev/lms/courses/{courseId}/modules/{moduleId}/items`: 모듈 내부 항목·종류·원문 링크.
- GET `/dev/lms/announcements?courseId=...&startDate=...&endDate=...`: 과목 공지.

목록 응답: `{ "items": [], "pagesFetched": 1, "truncated": false }`.
오류 응답: `{ "code": "LMS_NOT_CONFIGURED", "message": "...", "upstreamStatus": null }`.
Course의 `course_code`, Announcement의 `posted_at`, `html_url`, `context_code`는 LMS 필드명을 유지한다.
추가 응답도 `syllabus_body`, `time_zone`, `course_id`, `due_at`, `unlock_at`, `lock_at`,
`submission_types`, `points_possible`, `locked_for_user`, `items_count`, `content_details` 등 Canvas 필드명을 유지한다.
ID는 양수여야 한다. 선택 필드가 누락되면 `null`을 유지한다. 날짜는 LMS 원본 ISO 8601 문자열이며
화면에서 한국 시간과 원본 값을 함께 보여준다. `due_at`와 `lock_at`는 서로 다른 의미다.
과제는 `override_assignment_dates=true`로 현재 조회 계정에 적용되는 날짜를 요청한다.
공지 조회 기간은 과제·모듈 조회를 제한하지 않는다. 각 API 실패는 해당 영역의 오류로 표시한다.
개발용 검사 API는 `prod` 프로필에서는 비활성화한다. 자세한 설정은 [LMS 문서](features/lms.md)를 참고한다.

## 다음 구현 후보 - 아직 호출하지 말 것

| 경로 | 역할 |
| --- | --- |
| GET/PATCH `/profiles/me` | 본인 프로필·선호 언어 |
| GET/POST `/community/posts` | 게시글 조회·작성 |
| POST `/community/posts/{id}/comments` | 답글 작성 |

위 후보는 팀 합의 후 DTO·응답·오류·권한 기준과 함께 확정한다.
공지 목록·상세·번역은 위 "공지" 절의 API로 구현했다. `frontend/src/features/notices/types.ts`는 그 전의 초안이며 지금은 어디에서도 쓰지 않는다.

제품 API의 서버 세션 인증 경로 보호를 추가했다. 각 비공개 기능 구현 시 본인 소유권·과목 열람 권한을 추가 검증한다.
기존 공통 계정 LMS 데모는 별도 데모 암호로 보호하며 Google 로그인이 사용자별 LMS 권한을 부여하지 않는다.
