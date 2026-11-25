# 학교 공지

코드 위치: `frontend/src/features/notices/`, 백엔드 `notices/`·`integrations/school/`

## 공지 목록·상세·분석

#8. 전체 공지(S06)와 공지 상세(S07). [맞춤 공지 대시보드](dashboard.md)도 같은 공지와 판별 규칙을 쓴다.

- 학교·국제처·단과대 공개 게시판에서 수집한 공지를 서버 메모리에 둔다(DB 없음). 서버가 켜지면 바로 수집하고, 1시간이 지난 목록은 다음 조회 때 다시 읽는다. 이번에 못 읽은 게시판은 이전 공지를 유지한다. 수집 설정과 장애 진단은 아래 절에 있다.
- ERICA 전체 공지는 모두에게, 단과대 공지는 프로필의 단과대(`collegeId`)가 같은 학생에게만 보인다. 다른 단과대 공지는 주소로 열어도 없는 공지(404 `NOTICE_NOT_FOUND`)다.
- **AI 분석은 학생이 상세를 처음 열 때 그 공지만** Gemini로 한다. 호출 수를 줄이려는 것이다. 결과는 서버 메모리에 두고, 목록은 이미 분석한 결과만 쓰며 Gemini를 기다리지 않는다. 같은 공지를 동시에 열면 한 번만 호출한다.
- 분석에 실패하면(키 미설정·응답 오류 등) 분석 전 공지를 그대로 보여주고, 5분이 지난 뒤 다시 열면 다시 분석한다.
- 분석 결과는 형식에 맞는 값만 쓴다. 마감을 적었는데 날짜로 읽을 수 없으면 분석을 확실하다고 보지 않는다. 시간대 없는 마감은 한국 시간, 날짜만 있으면 그날 23:59로 본다.
- Gemini 분석 전에도 게시판 분류에 "학부"·"대학원"이 있으면 그 학위과정을 대상 조건으로 두고 분석이 확실한 것으로 판별한다. 분류로 알 수 없으면 "분석 전"이다. 분류의 "학사"는 학사과정이 아니라 학사 행정이라 학위과정 조건으로 쓰지 않는다.
- 해당 여부 판별 규칙은 [대시보드 문서](dashboard.md#판별-규칙)와 같다. 목록은 해당 → 확인 필요 → 해당 안 됨 순이고, 같은 상태 안에서는 마감일이 이른 순이다. 마감이 지난 공지도 빼지 않아 앞쪽에 올 수 있고, 마감 없는 공지는 뒤로 간다.
- 프로필은 브라우저에만 있어 조회도 `POST` 본문으로 보내고, URL에 남기거나 서버에 저장하지 않는다.
- 선호 언어가 원문과 다르면 상세를 자동 번역한다. 원문과 같은 언어면 호출하지 않는다. 원문이 3,000자를 넘으면 앞부분만 번역하고 나머지는 원문에서 보도록 안내한다. 번역에 실패하면 원문을 그대로 보여주고 원문과 번역을 섞지 않는다.
- 분석으로 마감이 나온 공지만 [개인 일정](schedule.md)에 저장할 수 있다. 로그인하지 않았거나, 마감이 지났거나, 예시 공지(`sample: true`)면 저장할 수 없다.

API: `POST /api/v1/notices/search`, `POST /notices/{id}/view`, `POST /notices/{id}/translations` (로그인 필요). [API 계약](../api.md)에는 아직 반영되지 않았다.

## 수집 진단과 설정 (Render)

> 이 절은 학교 공지 **수집 설정과 Render 장애 진단**을 다룬다.

브랜치: `fix/school-notice-fetch`.

Render에서 일부 HTTPS 게시판의 읽기 시간 초과·연결 종료가 반복되어, 수집 조건을 조정하고 연결과 파싱 실패를 구분하도록 보완했다.
지역·학교의 접근 정책·TLS·실행 자원 중 무엇이 실제 원인인지는 배포 후 비교가 필요하다.
로컬 코드와 자동 테스트 통과만으로 Render 문제가 해결되었다고 판단하지 않는다.

### 변경 범위

- 기존 수집기 안에서 시간제한과 게시판 단위 동시 요청 수를 조정한다.
- `NOTICE_TEST_BOARD`로 게시판 하나를 선택한다. 설정을 없애면 전체를 수집한다.
- GET의 읽기 시간 초과·연결 종료·일시적인 SSL/DNS 오류·HTTP 429/5xx만 제한적으로 재시도한다.
- 파싱 오류·HTTP 403 등 영구 오류·원인이 인증서 검증 실패인 오류는 재시도하지 않는다. 폼 POST도 자동 재전송하지 않는다.
- 성공 HTML의 최종 주소·소요 시간, 목록 파싱 건수, 최종 실패의 예외 스택을 로그로 구분한다.
- 프론트엔드·인증·DB·공지 파서·공지 표시 및 저장소의 갱신 주기는 변경하지 않는다.
- TLS 협상 상세 로그는 JVM 옵션으로 필요할 때만 활성화한다. 인증서 검증은 유지한다.

### 설정값

Spring 설정으로 읽으므로 Render 환경변수와 로컬 `.env`에서 모두 사용할 수 있다.

| 환경변수 | 기본값 | 범위·의미 |
| --- | --- | --- |
| `NOTICE_FETCH_TIMEOUT_MS` | `60000` | 1000~120000, jsoup 요청 제한(ms) |
| `NOTICE_FETCH_PARALLELISM` | `3` | 1~12, 동시에 읽는 게시판 수. 목록과 상세에 적용 |
| `NOTICE_FETCH_RETRIES` | `1` | 0~2, 첫 GET 실패 후 추가 시도 횟수 |
| `NOTICE_FETCH_RETRY_DELAY_MS` | `2000` | 0~30000, GET 재시도 전 대기(ms) |
| `NOTICE_TEST_BOARD` | 비어 있음 | 전체 수집. 등록된 게시판 키를 넣으면 그 게시판만 수집 |

범위를 벗어난 값이나 없는 게시판 키는 시작 시 명확한 설정 오류로 처리한다.
현재 jsoup 1.18.3의 초기 소켓 읽기 제한은 요청 제한의 절반이다. `60000`은 모든 단계에서 각각 60초를 기다린다는 뜻은 아니다.

### 1. 한 게시판으로 먼저 진단

코드 변경이 Render에 실제로 반영되도록 팀의 PR·머지 절차를 거쳐 배포 브랜치에 반영한다.
현재 운영 서비스의 배포 브랜치는 `main`이다. 다른 브랜치의 커밋은 그 자체로 운영 서비스에 반영되지 않는다.

Render → 백엔드 → **Environment**에 다음을 지정한다.

```dotenv
NOTICE_TEST_BOARD=erica-advanced-convergence
NOTICE_FETCH_TIMEOUT_MS=60000
NOTICE_FETCH_PARALLELISM=1
NOTICE_FETCH_RETRIES=0
```

**Save, rebuild, and deploy** 또는 새 커밋의 수동 배포를 사용한다.
이후 값만 바꿀 때는 **Save and deploy**로 기존 빌드에 환경변수를 적용할 수 있다.
실제 공지 수집이 켜져 있어야 하므로 `NOTICE_COLLECTION_ENABLED=false`로 두지 않는다.

진단 중에는 첨단융합대학 한 게시판만 수집한다. 수집 설정을 바꾸는 동안 기존 공지 목록의 범위가 달라질 수 있다.

로그에서 확인할 순서:

1. `School notice fetch settings: ...` — 배포에 적용된 설정값.
2. `NOTICE_TEST_BOARD active: collecting only erica-advanced-convergence` — 대상 제한 적용.
3. `School board erica-advanced-convergence HTML fetched in ...ms (finalUrl=...)` — HTML 요청 성공.
4. `School board erica-advanced-convergence parsed N entries` — 공지 목록 파싱 결과.
5. `Listed N school notices` — 그 수집에서 확보한 전체 목록 수.

| 결과 | 판단·다음 단계 |
| --- | --- |
| HTML 성공, parsed N에서 N > 0 | 목록 요청·파싱 성공. 2번에서 전체 수집 비교 |
| HTML 성공, parsed 0 | 차단 안내·리다이렉트·게시판 HTML 변경 등 확인. 연결 실패와 구분 |
| `could not be read after ...ms` | 아래 예외 스택의 원인을 확인하고 3번 진행 |

목록이 성공해도 상세 본문·첨부·폼 요청까지 모두 성공한 것은 아니다.
`School notice ... could not be read`가 별도로 있는지도 확인한다.

### 2. 전체 수집으로 전환

Render Environment에서 `NOTICE_TEST_BOARD`를 삭제하고 다음 값을 지정한다.

```dotenv
NOTICE_FETCH_TIMEOUT_MS=60000
NOTICE_FETCH_PARALLELISM=3
NOTICE_FETCH_RETRIES=1
NOTICE_FETCH_RETRY_DELAY_MS=2000
```

환경변수 변경을 배포한 뒤 게시판별 `HTML fetched`, `parsed`, 실패 로그를 비교한다.
재시도는 `School GET ... retry 1/1 in 2000ms`로 표시되며 무한 반복하지 않는다.

연결 실패가 계속되면 첫 수집이 오래 걸릴 수 있다. 기존 저장소는 첫 공지 조회가 초기 수집을 기다릴 수 있으므로 수집 완료 로그 후에 시연한다.
일부 게시판만 실패한 경우 다음 정기 갱신 기준은 기존처럼 1시간이며, 이번 수정은 그 갱신 주기를 바꾸지 않는다.
이전 공지의 유지와 재시작 시 메모리 초기화도 기존과 같다.

### 3. HTTPS 상세 진단과 서울 접속 비교

#### Render TLS 로그

한 게시판 모드·재시도 0회로 먼저 대상 요청을 제한한다.
Environment의 기존 `JAVA_TOOL_OPTIONS`를 유지하면서 끝에 `-Djavax.net.debug=ssl:handshake`를 추가한다.
Dockerfile의 기본값만 쓰고 있었다면 다음과 같이 설정한다.

```text
-XX:MaxRAMPercentage=70.0 -Djavax.net.debug=ssl:handshake
```

다른 JVM 옵션이 있었다면 지우지 않는다. **Save and deploy** 후 실패 시점 앞뒤의 `ClientHello`, `ServerHello`, `Fatal`, `Caused by`를 확인한다.
공유할 때는 해당 오류 부분만 전달하고 다른 API의 쿠키·토큰 등은 포함하지 않는다.
진단 후 추가한 TLS 로그 옵션만 제거하고 원래 JVM 설정으로 되돌린다.

#### Vercel 서울 함수

같은 저장소의 [`scripts/school-fetch-probe`](../../scripts/school-fetch-probe/README.md)를 별도 Vercel 프로젝트로 배포할 수 있게 준비했다.
기존 프론트의 `/api/*` 프록시와 분리되어 있고, 현재 Vercel 배포에는 영향을 주지 않는다.
Root Directory를 `scripts/school-fetch-probe`, Framework를 `Other`로 선택해 배포하고 `/api/probe`를 확인한다.

코드는 준비했지만 실제 배포·서울에서의 학교 접속 검증은 수행하지 않았다.
`region=icn1`과 학교 응답 상태·제목·최종 주소를 함께 확인한다.
위치뿐 아니라 IP와 Java/Node 구현도 달라지는 비교이므로 성공해도 리전만 원인이라고 단정하지 않는다.

### 검증

- Java 21 기준 `./mvnw -o verify`.
- 전체 백엔드 테스트 190개 및 패키징 통과. 별도 서울 진단 함수는 로컬 문법·응답 검증만 수행.
- 테스트용 HTML과 예외를 주입하며 학교·Gemini·Canvas에는 접속하지 않는다.
- 단일 게시판 선택/해제, 설정 오류, 제한된 동시 요청, 재시도 성공·소진·비활성화, 영구 오류·파싱 오류·인증서 오류, 중단 처리와 POST 미재시도를 확인한다.

참고: [Render 환경변수](https://render.com/docs/configure-environment-variables),
[Render Free 제한](https://render.com/docs/free),
[Java TLS 진단](https://docs.oracle.com/en/java/javase/21/security/java-secure-socket-extension-jsse-reference-guide.html),
[jsoup 1.18.3 연결 구현](https://github.com/jhy/jsoup/blob/jsoup-1.18.3/src/main/java/org/jsoup/helper/HttpConnection.java).
