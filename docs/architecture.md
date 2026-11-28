# 코드 구조와 3계층 책임

React는 표현 계층, Spring Boot의 서비스는 로직 계층, 저장소·외부 연동 모듈은 데이터 계층으로 나눈다. 계층마다 별도 서버를 띄운다는 뜻은 아니다.

| 계층 | 코드 위치 | 책임 |
| --- | --- | --- |
| 표현 | `frontend/src/app`, `features`, `shared/ui` | 입력·화면·원문/번역 표시·실패 안내 |
| API 진입·로직 | 백엔드 기능별 `controller`, `service`, `dto` | 인증·권한·입력 검증·공지 판별·게시글 처리 |
| 데이터·외부 연동 | 기능별 `repository`, `integrations/lms`, `school`, `ai` | 저장·조회·공지 수집·외부 AI 요청 |

현재 연결된 주요 흐름:

- 학교 공지: `NoticeController → NoticeService → CollectedNoticeRepository(integrations/school 수집) · NoticeAnalyses → NoticeAnalysisClient(Gemini 분석) · integrations/ai 번역`
- 맞춤 공지 대시보드: `DashboardController → DashboardService → matching/NoticeMatcher`
- 과목알림: `CourseController → CourseService → integrations/lms/HanyangLmsClient` (공통 데모 계정)
- 학사일정: `ScheduleController → ScheduleService` (공식 일정을 옮긴 seed JSON)
- 게시글·답글 번역: `community/CommunityTranslationController · BatchTranslationController → integrations/ai`
- 개발 검사: `LmsTestPage → LmsDevController → HanyangLmsClient`, `BackendStatus → HealthController`

Google 인증과 서버 세션을 이용한 로그인·로그아웃을 사용한다. 회원 DB·가입/동의 이력은 미구현이다.
인증 코드는 `auth` 패키지와 `features/auth`에 있으며 [설정 및 한계](features/auth.md)를 참고한다.

초기 폴더 구성은 [archive/initial-structure.md](archive/initial-structure.md), 검사 코드의 요청 흐름은 [features/lms.md](features/lms.md),
화면 초안은 [archive/wireframes.md](archive/wireframes.md)를 참고한다. 제안된 제품 기능과 현재 개발 검사 도구를 구분한다.

기능별 패키지와 폴더:

- `profile`: 프로필·한국어/영어/중국어 선호 언어.
- `notices`: 공지 수집 결과 조회·핵심정보 추출·개인화·번역.
- `community`: 게시글·답글 번역 API. 게시판 화면과 저장은 프론트 `market`·`questions`·`free-board`에 있다.
- `schedule`: 학사일정 조회. 개인 일정은 프론트 localStorage에 저장한다.

UI가 DB·LMS·AI 공급자를 직접 호출하지 않는다. 백엔드 서비스는 공급자별 코드를 수집·AI 모듈에 숨긴다.
번역 실패 시 공지 서비스가 원문과 실패 상태를 반환하고 화면에서 실패 안내와 원문을 표시한다.
인증된 LMS 공지의 원문·요약·번역은 모두 같은 열람 권한을 확인한 뒤 제공한다.

## 첫 개발 순서

1. 프로필과 서비스 로그인/권한의 API 계약을 합의한다.
2. 샘플 공지 한 건의 조회·분석·번역·원문 대안을 연결한다.
3. 게시글 작성·저장·조회와 선호 언어 번역을 연결한다.
4. 검수 데이터로 판별·번역·실패 경로를 확인한다.
5. 한양대 LMS 인증과 실제 과목 공지 반환을 검증하고 수집 모듈을 연결한다.

LMS 검증은 다른 개발과 동시에 먼저 착수할 수 있다. 이전 공개 응답 확인만으로 실제 토큰 연동이 성공했다고 보지는 않는다.

2026-11-26 기준: 1~4는 구현했다. 1의 프로필은 서버 API 없이 브라우저에 저장한다. 5는 [과목알림](features/courses.md)을 공통 LMS 데모 계정에 연결했다. 이날 배포본에서 과제 1건의 제출 조건을 원문과 대조하고, 해당 과제의 마감이 개인 일정에 저장되는 것을 확인했다. 개인별 LMS 계정 연동과 전체 수강 데이터의 정확성은 검증하지 않았다.
