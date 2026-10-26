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
`prod`만 활성화하면 LMS 조회 API는 비활성화된다.
실제 LMS 토큰이나 로컬 `.env`를 이미지에 넣지 않는다.

## 공통 계정 LMS 데모

사용자별 토큰 입력은 지원하지 않는다. 접속자는 서버에 설정된 **하나의 데모 계정**의
데이터를 본다. 로컬 개발에서는 기존처럼 `backend/.env`의 `LMS_API_TOKEN`을 사용한다.
로컬 `.env`를 Render에 업로드하거나 GitHub에 커밋하지 않는다.

공개 배포에서 데모를 켜려면 Render 서비스의 Environment에 다음을 설정한다.

```dotenv
SPRING_PROFILES_ACTIVE=prod,lms-demo
LMS_API_TOKEN=<발표자가 Render에 직접 입력하는 본인 토큰>
LMS_DEMO_PASSWORD=<Canvas 토큰과 다른 영문/숫자 등의 충분히 긴 데모 암호>
```

- 실제 토큰과 암호는 발표자가 Render에 직접 입력한다. 채팅, PR, 로그에 붙이지 않는다.
- `LMS_DEMO_PASSWORD`가 비어 있으면 LMS API는 503으로 닫힌다.
- 데모 암호가 없거나 틀리면 모든 LMS 조회 API는 401을 반환한다.
- 프론트의 LMS 메뉴에서 데모 암호를 입력한다. Canvas 토큰을 입력하는 칸이 아니다.
- 암호는 브라우저 메모리에만 두며 로컬 저장소/쿠키에 저장하지 않는다. 화면을 나가거나
  새로고침하면 다시 입력한다. 실제 Canvas 토큰은 백엔드에서 Canvas로만 보낸다.
- LMS 결과는 `Cache-Control: no-store`로 응답한다.
- 데모를 끝내면 `lms-demo` 프로필과 `LMS_API_TOKEN`, `LMS_DEMO_PASSWORD`를 제거한다.

Render는 비밀 환경변수의 저장·실행 플랫폼이므로 토큰이 로컬 컴퓨터 밖으로 전혀
나가지 않는 구성은 아니다. Canvas API 호출에도 해당 토큰이 필요하다. GitHub와 Vercel의
프론트 빌드에는 토큰을 전달하지 않는다.

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
