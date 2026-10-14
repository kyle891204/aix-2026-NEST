# Team 03 Frontend

React + TypeScript + Vite + React Router.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

개발 주소: `http://127.0.0.1:5173`.
시작 화면의 연결 확인에는 백엔드가 함께 실행되어야 합니다.

`src/features/profile`, `notices`, `community`에서 MVP 기능을 구현합니다.
`src/features/schedule`은 후속 기능입니다.
서비스용 공지·게시글·프로필 API는 아직 연결하지 않았습니다.
`/lms-test`는 백엔드 `.env` 토큰으로 수강 과목·공지 API를 검사하는 개발 화면입니다.
폰 테스트: 같은 Wi-Fi에서 `npm run dev:mobile`을 실행하고 PC 로컬 IP 주소로 접속합니다.
화면은 디자인 시안 없이 모바일 우선 최소 구성입니다.

프로젝트 전체 실행 방법은 상위 `README.md`, API 계약은 `../docs/api.md`를 참고하세요.
