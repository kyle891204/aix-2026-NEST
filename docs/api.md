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

`id`는 Google `sub`이며 회원 DB의 가입 완료 여부를 뜻하지 않는다.
`googleClientId`가 비어 있으면 로그인이 아직 설정되지 않은 상태다.
오류 형식은 `{ code, message, fields: {} }`다. 대표 코드는 `AUTH_REQUIRED`(401),
`AUTH_INVALID_CREDENTIAL`(401), `AUTH_CHALLENGE_EXPIRED`(401), `AUTH_CSRF_INVALID`(403),
`AUTH_NOT_CONFIGURED`(503), `AUTH_PROVIDER_UNAVAILABLE`(503)다.
10분이 지난 로그인 시도는 `/auth/session`을 다시 읽어 새 nonce로 재시도한다.
설정·배포·한계는 [로그인 문서](authentication.md)를 참고한다.

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

향후 `@Valid` DTO를 사용하는 엔드포인트에서 검증이 실패하면 HTTP 400을 반환한다.

```json
{
  "code": "INVALID_REQUEST",
  "message": "입력 값을 확인해 주세요.",
  "fields": { "preferredLanguage": "must not be blank" }
}
```

현재 기능 DTO는 아직 없으며 위 내용은 형식 예시다. 기타 오류는 아직 공통 형식으로 통일하지 않았다.

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
개발용 검사 API는 `prod` 프로필에서는 비활성화한다. 자세한 설정은 `lms-testing.md`를 참고한다.

## 다음 구현 후보 - 아직 호출하지 말 것

| 경로 | 역할 |
| --- | --- |
| GET/PATCH `/profiles/me` | 본인 프로필·선호 언어 |
| GET `/notices`, `/notices/{id}` | 권한 있는 공지의 목록·상세 |
| POST `/notices/{id}/translations` | 선호 언어 번역 요청 |
| GET/POST `/community/posts` | 게시글 조회·작성 |
| POST `/community/posts/{id}/comments` | 답글 작성 |

위 후보는 팀 합의 후 DTO·응답·오류·권한 기준과 함께 확정한다.
`frontend/src/features/notices/types.ts`의 타입도 검토용 초안이다.
대상 판별은 `APPLICABLE / NOT_APPLICABLE / NEEDS_REVIEW`, 번역은 `PENDING / SUCCEEDED / FAILED`로 구분하는 안을 제안한다.
번역 실패여도 `originalContent`를 제공하고 원문을 숨기지 않는다.

제품 API의 서버 세션 인증 경로 보호를 추가했다. 각 비공개 기능 구현 시 본인 소유권·과목 열람 권한을 추가 검증한다.
기존 공통 계정 LMS 데모는 별도 데모 암호로 보호하며 Google 로그인이 사용자별 LMS 권한을 부여하지 않는다.
