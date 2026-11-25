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

회원 DB·서버 동의/프로필 저장·개인별 LMS 연결은 아직 구현하지 않았습니다. 실제 한양대 계정 데이터 반환은 별도 검증이 필요합니다.

- [계정별 프로필 데모와 테스트](docs/demo-profile.md)

- [Google 로그인 설정과 검증 범위](docs/authentication.md)

- [LMS 실행·테스트 방법](docs/lms-testing.md)
- [코드 구성과 호출 흐름](docs/lms-code-walkthrough.md)
- [검증 기록](docs/lms-verification.md)
- [초기 디렉터리 구성안](docs/initial-structure.md)
- [와이어프레임 초안](docs/wireframes.md)

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
