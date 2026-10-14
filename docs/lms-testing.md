# 한양대 LMS 조회 테스트

## 현재 가능한 것

- 한양대 LMS에서 발급한 본인 토큰으로 본인 정보·활성 수강 과목 조회.
- 반환된 과목 ID와 날짜 범위로 과목 공지 제목·원문 HTML·게시 시각 조회.
- Canvas `Link: rel="next"` 페이지네이션 처리. 조회당 최대 5페이지·페이지당 50건으로 제한하고 잘렸는지 표시.
- 토큰 없음, 토큰 거부, 과목 권한 없음, 요청 제한, 연결 실패, 잘못된 응답 표시.
- 외부 리디렉션을 따라가지 않고, 다음 페이지가 다른 호스트·API 경로를 가리키면 요청 중단.

테스트 코드는 로컬 가상 LMS로 검증했습니다. **실제 한양대 토큰으로 공지 본문 반환은 아직 미검증**입니다.

## 1. 토큰 설정

프로젝트의 `backend/` 폴더에서:

```bash
cp .env.example .env
```

`backend/.env`를 다음처럼 편집합니다. 값에 따옴표를 붙이지 않고, `export` 없이 한 줄로 씁니다.

```dotenv
SERVER_PORT=8081
LMS_API_BASE_URL=https://learning.hanyang.ac.kr/api/v1
LMS_API_TOKEN=여기에_본인_LMS_액세스_토큰
```

일반 한양대 Open API 개발자센터의 키와 LMS 개인 토큰을 같은 것으로 보지 마세요.
`hy-mooc.hanyang.ac.kr/lms`는 접속 진입 페이지이며 기존 API 확인은 `learning.hanyang.ac.kr`에서 이루어졌습니다.
Spring Boot가 실행 작업 디렉터리의 `.env`를 properties 형식으로 읽도록 설정했습니다. IDE 실행 시 작업 디렉터리를 `backend/`로 맞추세요.
토큰 변경 후 백엔드를 재시작합니다. `.env`는 Git과 제공 ZIP에 포함하지 않습니다.

## 2. 실행·화면 테스트

```bash
# 터미널 A: backend/
./mvnw spring-boot:run

# 터미널 B: frontend/
npm ci
npm run dev
```

`http://127.0.0.1:5173/lms-test`를 열거나 하단 메뉴의 LMS를 누릅니다.

1. ‘본인 정보·수강 과목 조회’를 누릅니다.
2. 계정 이름과 과목 목록이 나오는지 확인합니다.
3. 과목과 시작·종료일을 선택합니다.
4. ‘과목 공지 조회’를 누릅니다.
5. 실제 LMS 화면의 제목·본문·게시 시각과 대조합니다.

HTML은 실행하지 않고 텍스트로 표시합니다. 빈 목록은 기간 내 공지가 없을 수도 있으므로 날짜·과목을 바꾸어 확인합니다.
이 화면에는 토큰 입력칸이 없습니다. 토큰은 서버가 LMS 요청 헤더에만 사용하며 화면 응답으로 돌려주지 않습니다.

실제 폰에서는 PC와 같은 Wi-Fi에서 `npm run dev:mobile`을 실행하고 PC의 로컬 IP 주소로 접속하세요.
폰에서도 상대 경로 `/api`를 사용하므로 토큰은 계속 백엔드에서만 처리합니다.

## 3. API로 직접 테스트

아래 요청은 로컬 서버로 보내며 별도의 토큰 헤더를 넣지 않습니다. 로컬 서버가 `.env` 토큰으로 LMS를 호출합니다.

```bash
curl http://127.0.0.1:8081/api/v1/dev/lms/profile
curl http://127.0.0.1:8081/api/v1/dev/lms/courses

# courseId를 실제 조회한 본인 과목 ID로 변경
curl --get http://127.0.0.1:8081/api/v1/dev/lms/announcements \
  --data-urlencode 'courseId=42' \
  --data-urlencode 'startDate=2026-10-01' \
  --data-urlencode 'endDate=2026-10-14'
```

날짜를 생략하면 한국 시간 기준 최근 90일부터 오늘까지 조회합니다. 시작·종료일은 포함하며, 종료일의 다음 날을 LMS에 전달해 종료일 당일 공지를 포함합니다.
날짜 범위는 최대 366일입니다. 과목 ID는 양수여야 합니다.

## 오류 확인

| code | 의미 |
| --- | --- |
| LMS_NOT_CONFIGURED | `.env` 파일 위치·키 이름·백엔드 재시작 확인 |
| LMS_TOKEN_REJECTED | LMS 응답 401. 토큰 값·발급 위치·만료 확인 |
| LMS_PERMISSION_DENIED | LMS 응답 403. 본인 수강 과목의 공지 열람 권한 확인 |
| LMS_RESOURCE_NOT_FOUND | LMS 응답 404. API 주소·과목 ID 확인 |
| LMS_RATE_LIMITED | LMS 응답 429. 잠시 후 재시도 |
| LMS_REDIRECT_BLOCKED | LMS가 3xx를 반환. 실제 API 주소 확인 |
| LMS_CONNECTION_FAILED | 접속·인증서·타임아웃 확인 |
| LMS_INVALID_RESPONSE | 예상 JSON 형식과 다른 응답 |

예를 들어 토큰 거부는 로컬 API에서 HTTP 502와 `upstreamStatus: 401`로 표시됩니다. LMS 원본 오류 본문이나 인증 헤더는 반환하지 않습니다.

## 조회 범위와 다음 개발

이 로직은 **LMS의 수강 과목 공지**를 조회합니다. 대학 본부·국제처·단과대의 공개 게시판 공지 전체를 조회하는 API는 아닙니다. 해당 정보원은 `integrations/school`에서 별도로 구현합니다.

`/api/v1/dev/lms/*`는 `.env`에 설정한 한 사람의 토큰을 사용하는 개발 검사 API이며 서비스용 로그인 API가 아닙니다. `prod` 프로필에서는 이 컨트롤러를 비활성화했습니다. 실제 다중 사용자 서비스에서는 사용자 로그인·개인별 연동·권한 확인을 구현한 후 일반 공지 API에 연결합니다.

공식 참고: [Canvas 공지 API](https://canvas.instructure.com/doc/api/announcements.html), [페이지네이션](https://canvas.instructure.com/doc/api/file.pagination.html), [인증](https://canvas.instructure.com/doc/api/file.oauth.html).
