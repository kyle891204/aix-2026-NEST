# API 계약

API 접두사: `/api/v1`.
실제 구현된 API와 아래 검토용 후보를 구분한다.

## 현재 구현

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
- GET `/dev/lms/announcements?courseId=...&startDate=...&endDate=...`: 과목 공지.

목록 응답: `{ "items": [], "pagesFetched": 1, "truncated": false }`.
오류 응답: `{ "code": "LMS_NOT_CONFIGURED", "message": "...", "upstreamStatus": null }`.
Course의 `course_code`, Announcement의 `posted_at`, `html_url`, `context_code`는 LMS 필드명을 유지한다.
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

비공개 기능을 추가하기 전에 인증·본인 소유권·과목 열람 권한을 구현한다. 현재 시작 프로젝트에는 인증 시스템이 없다.
