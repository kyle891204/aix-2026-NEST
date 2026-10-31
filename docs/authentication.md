# Google 로그인 — 1차 구현

## 구현 범위

`배포 주소 접속 → /login → Google 계정 인증 → 이 탭의 프로필 설정 → 홈 → 내 계정 → 로그아웃`을 연결한다.
이 탭에 계정별 프로필이 있으면 설정을 건너뛴다.
공지·커뮤니티·프로필·LMS 화면에 직접 접속해도 인증 전에는 로그인 화면으로 이동한다.
로그인 후에는 처음 요청했던 앱 경로로 돌아간다. 서버를 기다리는 동안에도 로그인 화면이 표시된다.

이번 단계는 **Google 신원 확인과 서버 세션**이다. Google 계정은 인증할 수 있지만
NEST 회원 DB가 없으므로 기존 회원/신규 회원을 구분하거나 가입 완료로 기록하지 않는다.
회원 DB·서버 동의 이력·서버 프로필 저장·탈퇴는 다음 단계다.
프런트에는 계정별 Context + sessionStorage 프로필 데모를 연결했다.
로그인 후 이 탭의 프로필이 없으면 동의·입력으로 이동하며, 저장 후 홈에 표시한다.
같은 탭에서 재로그인하면 복원되지만 다른 기기의 회원 정보는 조회할 수 없다.
상세 동작과 검증 범위는 [프로필 데모](demo-profile.md)를 참고한다.
현재 화면의 로그인 처리 안내는 실제 동작 설명이며 최종 개인정보 처리방침을 대체하지 않는다.
실제 이용자 모집 전에는 운영 주체·문의처·보유 기간 등을 확정하고 가입/동의 기능과 연결한다.

Google 로그인은 학교 SSO·Canvas 연동이 아니다. 기존 `/lms-test`는 서버에 설정된
공통 계정 데모이며 별도의 데모 암호가 계속 필요하다. 사용자별 LMS 권한을 부여하지 않는다.
서버 LMS API에는 기존 `lms-demo` 접근 제어를 유지한다.

## Google Cloud에 등록할 값

1. NEST용 프로젝트에서 Google Auth Platform의 Branding/Audience 설정을 완료한다.
2. OAuth 클라이언트의 애플리케이션 유형을 **웹 애플리케이션**으로 만든다.
3. 승인된 JavaScript 원본에 실제 사용하는 주소를 각각 추가한다.

```text
https://aix-2026-nest.vercel.app
http://localhost
http://localhost:5173
http://127.0.0.1
http://127.0.0.1:5173
```

포트가 다르면 실제 포트도 등록한다. 원본에는 경로(`/login` 등)를 붙이지 않는다.
Vercel Preview에서 시험하려면 해당 Preview 원본도 명시적으로 등록한다.
External/Testing 프로젝트가 테스트 사용자 등록을 요구하면 시연 계정을 추가한다.

Google Identity Services의 JavaScript 콜백 방식을 사용하므로 OAuth 리다이렉트 URI와
클라이언트 보안 비밀번호는 이 구현에 필요하지 않다. 공개 클라이언트 ID만 설정한다.

참고: [Google 로그인 설정](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid),
[JavaScript API](https://developers.google.com/identity/gsi/web/reference/js-reference).

## 로컬 실행

`backend/.env`에 다음을 설정하고 백엔드를 재시작한다. 클라이언트 ID가 비어 있으면
서버는 정상 기동하지만 로그인 화면에는 준비 중을 표시하고 로그인 요청은 503으로 닫힌다.

```dotenv
GOOGLE_CLIENT_ID=<Google Cloud에서 복사한 Client ID 전체>
AUTH_COOKIE_SECURE=false
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

복사한 Client ID에는 이미 `.apps.googleusercontent.com`이 포함되어 있다. 접미사를 추가하지 않는다.
`false`는 로컬 HTTP 전용이다. 프론트의 기본 API 주소는 `/api/v1`이며 Vite가 백엔드로
전달한다. 기존 `.env`를 쓰는 경우에도 위 두 값을 추가한다.

```bash
# backend/
./mvnw spring-boot:run

# frontend/ (별도 터미널)
npm ci
npm run dev
```

접속 주소는 `http://127.0.0.1:5173` 또는 `http://localhost:5173`이다.
IntelliJ로 실행할 때 백엔드의 작업 디렉터리는 저장소의 `backend`로 지정한다.
`.env`를 읽는 기준이 작업 디렉터리이므로 저장소 루트에서 실행하면 설정이 누락될 수 있다.

Google 인증 직후 `API 요청 실패 (403)`이 나타나면 실제 프론트 원본이
`CORS_ALLOWED_ORIGINS`에 포함되어 있는지 확인한다. Vite 프록시는 Host를 백엔드 주소로
바꾸지만 브라우저의 Origin은 유지한다. 기본 로컬 설정은 위 두 주소를 허용한다.
기존 `.env`가 CORS 값을 덮어쓰고 있으면 두 주소를 모두 추가한 뒤 백엔드를 재시작한다.
허용되지 않은 외부 주소와 CSRF 토큰 없는 로그인 요청은 계속 차단한다.

## Render / Vercel 반영

Render Environment:

```dotenv
GOOGLE_CLIENT_ID=<Google Cloud에서 복사한 Client ID 전체>
AUTH_COOKIE_SECURE=true
```

운영 쿠키의 Secure 기본값도 `true`다. 로컬 `.env`를 업로드하지 않는다.
프론트에 Google 비밀번호·클라이언트 보안 비밀번호·Google 토큰을 환경변수로 넣지 않는다.

프론트의 모든 API 요청은 같은 원본의 `/api/v1/*`를 쓴다(`VITE_API_BASE_URL`은 더 이상 사용하지 않는다).
`frontend/vercel.json`의 `/api/:path*` 외부 rewrite가 Render로 전달한다.
따라서 브라우저는 Vercel 호스트의 쿠키를 사용한다. 쿠키 Domain은 설정하지 않는다.
이는 Vercel/Render 사이의 제3자 쿠키에 의존하지 않기 위한 구성이다.
API rewrite는 SPA의 `/index.html` fallback보다 먼저 적용되어야 한다.

백엔드 변경을 먼저 배포하고 프론트를 배포한다. 저장소 원칙에 따라 기능 브랜치를
`develop`에 통합하고 검증 후 `main`에 반영한다. 자동 운영 배포 브랜치는 `main`이다.
이번 로컬 구현만으로 현재 운영 사이트가 바뀌지는 않는다.

참고: [Vercel 외부 rewrite](https://vercel.com/docs/routing/rewrites).

## 세션과 검증

- Google ID 토큰의 RSA 서명을 Google 공개키로 검증한다. issuer, audience, azp(있을 때),
  만료 시각, 검증된 이메일, sub, 로그인 시도별 nonce도 확인한다.
- 식별 키는 이메일이 아닌 Google `sub`다. 저장 정보는 `sub`와 이메일뿐이다.
- 로그인 전 세션에서 CSRF 토큰과 10분 유효 nonce를 발급한다. POST는 세션과 일치하는
  `X-CSRF-Token`을 요구한다. 인증 후에는 이전 세션을 폐기하고 새 세션을 만든다.
- 브라우저에는 `HttpOnly; Secure; SameSite=Lax; Path=/api` 세션 쿠키만 둔다.
  Google 토큰은 로그인 요청에만 사용하며 localStorage/sessionStorage/URL에 저장하지 않는다.
- 인증 응답은 `Cache-Control: no-store`다. ID 토큰과 세션 값을 로그에 기록하지 않는다.
- 서버 세션은 마지막 요청으로부터 30분 유효하다. 열린 앱은 보이는 동안 1분마다 세션을
  확인한다. 로그아웃과 Render 재시작/재배포 시 세션을 잃는다. 다중 인스턴스/영구 계정은
  공유 세션 저장소와 회원 DB를 추가한 뒤 지원한다.
- 프론트 경로 보호와 서버 본인 조회 권한을 모두 적용한다. 향후 제품 API 경로에는
  서버 인증 검사를 적용했으며, 각 기능 구현 시 본인/자료 소유권 검사도 추가해야 한다.

검증 참고: [Google 서버 토큰 검증](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token),
[Spring JWT 검증](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html).

## 확인 방법

프론트: `npm run build`, `npm run lint`, `npm run format:check`.
백엔드: `./mvnw verify`. 실제 Google 자격증명 없이 로컬 JWKS와 RSA 서명 토큰으로
정상/위조 서명·issuer·audience·만료·nonce·미검증 이메일을 검사하고, CSRF·세션 교체·로그아웃·운영 쿠키도 검사한다.

클라이언트 ID를 등록하고 배포한 뒤 실제 Google 팝업으로 다음을 추가 확인한다.

1. 시크릿 창에서 운영 주소 접속 → 로그인 화면. 취소하면 로그인 화면 유지.
2. Google 인증 → 홈. 개발자 도구에서 세션 쿠키의 HttpOnly/Secure/SameSite 확인.
3. 새로고침해도 로그인 유지. `/profile` 직접 접속 및 로그아웃 → 로그인 화면.
4. 로그아웃 후 뒤로 가기/보호 경로 직접 입력으로 계정 화면을 볼 수 없는지 확인.
5. Render 재시작으로 세션을 잃은 뒤 다시 로그인할 수 있는지 확인.

### 2026-10-27 로컬 검증 기록

- 백엔드 `./mvnw verify`: 36개 테스트 통과(기존 LMS 24개 + 인증/쿠키/CORS 12개).
- 프론트 빌드·Oxlint·Prettier 검사 통과.
- 실제 로컬 Vite → Spring 프록시: 익명 세션, CSRF/nonce, HttpOnly 및 `/api` 쿠키 경로,
  `no-store` 응답을 확인했다. 토큰·쿠키 원문은 검증 기록에 남기지 않았다.
- Google 인증 직후 403의 원인이던 `127.0.0.1:5173` CORS 누락을 수정했다.
  두 로컬 원본의 POST는 빈 자격증명의 DTO 검증 오류(400)까지 도달하고, 미허용 외부 원본은 403으로 차단됨을 실제 프록시로 확인했다.
- 브라우저: 로그인 화면·설정 미완료·개인정보 안내 펼치기를 확인했다.
- 임시 테스트 API/Google 버튼 응답으로 보호 경로 → 로그인 → 요청한 프로필 복귀,
  새로고침 복원, 로그아웃, 인증 실패 후 재시도를 확인했다. 테스트 응답은 배포 코드에 포함하지 않는다.

로컬 클라이언트 ID 설정과 Google 로그인 버튼 표시는 확인했다. 실제 Google 인증 후 NEST 세션 생성과 운영 Vercel 쿠키 전달은 추가 검증이 필요하다.
