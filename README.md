# NEST - 맞춤형 학사 및 생활 지원 서비스

> 한 줄 소개 — 누구의 어떤 문제를 해결하는가
> One line — whose problem does this solve?

**배포 URL / Live URL:** (13주차에 작성 / add in Week 13)

## 현재 개발 도구

React + TypeScript + Vite / Java 21 + Spring Boot로 구성되어 있습니다.

현재 구현된 기능:

- 공통: Google 로그인·서버 세션(시연용 게스트 모드), 가입 동의·프로필(브라우저 저장), 화면 문구 한국어·영어·중국어
- SCHOOL: 맞춤 공지 대시보드, 학교 공지 수집·AI 분석·번역, 과목알림(공통 데모 계정 LMS), 학사일정·개인 일정, 입출국 체크리스트
- LIFE: 자유·장터·질문게시판과 자동 번역, 긴급 연락처, 주변 편의시설 지도

회원 DB·서버 동의/프로필 저장·개인별 LMS 연결은 아직 구현하지 않았습니다. 실제 한양대 LMS 데이터는 공통 데모 계정의 과제 1건만 확인했고, 개인별 계정 연동과 전체 수강 데이터의 정확성은 검증하지 않았습니다.

### 문서

공통

- [API 계약](docs/api.md)
- [코드 구조와 3계층 책임](docs/architecture.md)
- [배포](docs/deployment.md)
- [개발 규칙 (브랜치·PR)](docs/development.md) — 구 `development.md` + `branch_rules.md`

기능별 (`docs/features/`)

| 문서 | 내용 | 관련 코드 | 이전 파일 |
| --- | --- | --- | --- |
| [auth.md](docs/features/auth.md) | Google 로그인·세션·게스트 모드 | `auth` | `authentication.md` |
| [profile.md](docs/features/profile.md) | 가입 동의·프로필 저장, 대시보드 판별 입력 | `profile`, `auth`(가입 화면) | `demo-profile.md` |
| [notices.md](docs/features/notices.md) | 공지 목록·상세·AI 분석·번역, 수집 설정·Render 장애 진단 | `notices`, `integrations/school` | `school-notice-fetch.md` |
| [dashboard.md](docs/features/dashboard.md) | 맞춤 공지 대시보드·해당 여부 판별 규칙 | `dashboard`, `matching` | (새 문서) |
| [courses.md](docs/features/courses.md) | 과목알림 (공통 데모 계정 LMS) | `courses`, `course` | (새 문서) |
| [lms.md](docs/features/lms.md) | LMS 조회 테스트·코드 흐름·검증 기록 | `lms-test`, `integrations/lms` | `lms-testing.md`, `lms-code-walkthrough.md`, `lms-verification.md` |
| [schedule.md](docs/features/schedule.md) | 학사일정·개인 일정 | `schedule` | `frontend/src/features/schedule/README.md` |
| [immigration.md](docs/features/immigration.md) | 입출국 준비 체크리스트 | `immigration` | (새 문서) |
| [boards.md](docs/features/boards.md) | 장터·질문·자유게시판 | `market`, `questions`, `free-board` | `market-demo.md`, `frontend/src/features/free-board/README.md` |
| [translation.md](docs/features/translation.md) | 게시글·댓글·답글 자동 번역 | `translation`, `integrations/ai`, 백엔드 `community` | `community-translation-review.md` |
| [i18n.md](docs/features/i18n.md) | 화면 고정 문구 다국어 | `shared/i18n` | `i18n-auth-life.md`, `i18n-school.md` |
| [emergency-contacts.md](docs/features/emergency-contacts.md) | 긴급 연락처 | `life` | `emergency-contacts.md` |
| [nearby-facilities.md](docs/features/nearby-facilities.md) | 주변 편의시설 지도 | `life` | `nearby-facilities.md` |

초기 계획 기록 (`docs/archive/`): [초기 디렉터리 구성안](docs/archive/initial-structure.md), [와이어프레임 초안](docs/archive/wireframes.md)

## 1. 문제 정의 / Problem Definition
- 사용자 / Users:
- 상황 / Situation:
- 페인포인트 / Pain point:
- 성공 기준 / Success criteria:

## 2. 사용자 확인 / User Validation
인터뷰 3명 요지 / Summary of three interviews:
1.
2.
3.

## 3. 실행 방법 / How to Run
```bash
git clone <repo-url>
# 설치 / install
# 실행 / run
```
필요한 환경변수 / Required environment variables: `.env.example` 참고

## 4. 아키텍처 / Architecture
![architecture](docs/architecture.png)

- 표현 계층 / Presentation:
- 로직 계층 / Logic:
- 데이터 계층 / Data:

## 5. 기술 스택과 선택 이유 / Tech Stack and Rationale

## 6. 팀 구성 / Team
| 이름 Name | 담당 영역 Area | 주요 이슈 Issues |
|---|---|---|
|  |  |  |

## 7. 라이선스 / License
MIT — 선택 이유 / Why:
