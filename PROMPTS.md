# AI 활용 기록

## 2026-10-27 — Google 로그인 1차 구현

- 도구: Codex, Figma design-to-code.
- 요청 요지: 배포 프론트 링크에서 시작할 수 있도록 로그인부터 구현. 별도 기능 브랜치 사용.
- 작업 브랜치: `feat/login-page` (`develop` 기준).
- 참고: 기존 A00 로그인 Figma 시안, Google Identity Services 및 Spring JWT 검증 공식 문서.
- 작업: 로그인 화면, Google 토큰 서버 검증, CSRF/nonce, HttpOnly 세션, 보호 경로, 내 계정·로그아웃, Vercel API 프록시, 설정 문서.
- 범위: 회원가입·동의 이력·프로필 DB 저장은 후속 작업. 기존 공통 계정 LMS 데모 암호는 유지.
- 검증: 로컬 RSA/JWKS 토큰 테스트와 세션/API 테스트, 기존 LMS 회귀 검사 및 프론트 품질 검사. 상세는 `docs/authentication.md`.
- 후속 수정: 로컬 로그인 POST의 403을 재현하고 localhost/127.0.0.1 CORS 기본 허용을 맞춤. 전체 36개 테스트 및 실제 Vite 프록시의 로컬 허용/외부 거부 확인.
- 미검증: 로컬 클라이언트 ID와 버튼 표시까지 확인. 실제 Google 인증 후 NEST 세션 생성 및 운영 배포 후 쿠키 동작은 후속 확인 필요.
- 비밀정보: 실제 Google 토큰·Canvas 토큰·비밀번호는 기록하지 않음.

## 2026-10-24 — LMS 검증 도구 확장 및 초기 설계

- 도구: Codex.
- 요청 요지: Canvas API 연동 가능성 검사, 과목·공지·과제·마감 조회, 초기 디렉터리 구성, 와이어프레임 초안.
- 참고: 4·5·7주차 활동지, Canvas 대화 기록, 킥오프/LMS 검증 PDF, 기존 React + Spring Boot 코드, Canvas 공식 API 문서.
- 작업: 기존 개발용 LMS 조회를 과목 설명·과제·모듈/항목으로 확장하고, 가상 LMS 테스트와 구조·화면 초안을 작성.
- 검증 범위: 자동 검사 결과는 `docs/lms-verification.md`에 기록. 실제 한양대 계정의 반환 결과와 구분.
- 팀 검토 사항: 실제 계정 연동 결과, 커뮤니티/일정의 MVP 범위, 제안 구조와 와이어프레임 확정.
- 비밀정보: 실제 토큰과 실제 학생의 비공개 공지 원문은 기록하지 않음.
