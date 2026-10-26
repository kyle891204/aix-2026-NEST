# Team 03 Frontend

React + TypeScript + Vite + React Router.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

개발 주소: `http://127.0.0.1:5173`.
로그인에는 백엔드가 함께 실행되어야 합니다. `backend/.env`에 `GOOGLE_CLIENT_ID`와
로컬 HTTP용 `AUTH_COOKIE_SECURE=false`를 설정합니다. ID가 없으면 로그인 준비 상태를 표시합니다.
등록할 주소와 배포 설정은 [로그인 문서](../docs/authentication.md)를 참고하세요.

`src/features/profile`, `notices`, `community`에서 MVP 기능을 구현합니다.
`src/features/schedule`은 후속 기능입니다.
서비스용 공지·게시글·프로필 API는 아직 연결하지 않았습니다.
`/lms-test`는 백엔드 `.env` 토큰으로 수강 과목·공지 API를 검사하는 개발 화면입니다.
폰 테스트: 같은 Wi-Fi에서 `npm run dev:mobile`을 실행하고 PC 로컬 IP 주소로 접속합니다.
로그인 화면은 기존 NEST Figma A00 시안을 참고했으며 나머지 화면은 모바일 우선 최소 구성입니다.

프로젝트 전체 실행 방법은 상위 `README.md`, API 계약은 `../docs/api.md`를 참고하세요.
