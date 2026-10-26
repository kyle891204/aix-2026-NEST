# 배포

개발 변경은 `develop`에 통합하고, 검증 후 `develop` → `main` PR을 병합한다.
Vercel과 Render의 운영 배포 브랜치는 `main`이다.

## Render 백엔드

- 서비스 이름: `aix-2026-NEST-backend`
- 인스턴스: **Free**
- 브랜치: `main`
- Root Directory: `backend`
- Runtime: Docker
- Dockerfile Path: `./Dockerfile` (Root Directory 기준)
- Docker Build Context Directory: `.`
- Health Check Path: `/api/v1/health`
- 환경변수: `CORS_ALLOWED_ORIGINS=https://aix-2026-nest.vercel.app`
- 운영 URL: `https://aix-2026-nest-backend.onrender.com`

컨테이너는 Java 21로 빌드하고 실행한다. Render의 `PORT`를 사용하며,
`0.0.0.0`에 바인딩하고 `prod` 프로필을 활성화한다.
기존 `@Profile("!prod")` 설정에 따라 개인 LMS 토큰을 사용하는 개발용 API는
운영에서 비활성화된다. 실제 LMS 토큰이나 로컬 `.env`를 이미지에 넣지 않는다.

## Vercel 프론트

- Root Directory: `frontend`
- Production Branch: `main`
- 환경변수: `VITE_API_BASE_URL=https://aix-2026-nest-backend.onrender.com/api/v1`
- 환경변수를 수정하면 프론트를 다시 배포해야 한다.

## 무료 서비스 제한

Render 무료 웹 서비스는 15분간 요청이 없으면 절전하며, 다음 요청의 응답이
약 1분 지연될 수 있다. 월 750시간은 워크스페이스의 무료 서비스들이 공유한다.
로컬 파일은 재시작/재배포 시 유지되지 않는다. 무료 Render Postgres는 웹 서비스와
달리 30일 후 만료되므로 지속적인 DB 저장소로 사용하지 않는다.

정책: https://render.com/docs/free
