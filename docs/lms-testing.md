# 한양대 LMS 조회 테스트

## 확인할 수 있는 것

- 본인 계정 정보와 활성 수강 과목 목록.
- 과목명·코드·강의계획 원본 HTML·공개 설명·과목 시간대.
- 기간별 과목 공지의 제목·원문 HTML·게시 시각·원문 링크.
- 과제 이름·설명·마감·제출 가능 시작·제출 차단·제출 방식·배점.
- 주차별 학습 모듈과 모듈 내부 항목의 제목·종류·원문 링크.
- 각 API의 오류, 빈 목록, 페이지 상한으로 일부만 조회된 상태.

자동 검사는 로컬 가상 LMS를 사용합니다. 실제 한양대 계정의 과목·공지·과제 반환은 아직 미검증입니다.
검증 범위는 [검증 기록](lms-verification.md), 동작 원리는 [코드 설명](lms-code-walkthrough.md)을 참고하세요.

## 1. backend/.env 설정

저장소의 `backend/`에서 `.env`가 없는 첫 설정에만 실행합니다.

```bash
cp -n .env.example .env
```

`.env`가 이미 있다면 복사하지 말고 해당 파일을 편집합니다.

```dotenv
SERVER_PORT=8081
LMS_API_BASE_URL=https://learning.hanyang.ac.kr/api/v1
LMS_API_TOKEN=여기에_한양대_LMS_개인_액세스_토큰
```

- 일반 한양대 Open API 개발자센터의 키와 LMS 개인 토큰은 다릅니다.
- 값에 따옴표·`export`를 붙이지 않습니다. 프론트 `.env`나 `VITE_*`에는 토큰을 넣지 않습니다.
- Spring Boot는 실행 디렉터리의 `.env`를 읽습니다. IDE의 작업 디렉터리를 `backend/`로 맞춥니다.
- 수정한 값은 백엔드 재시작 후 반영됩니다. 브라우저 새로고침만으로는 서버 토큰이 바뀌지 않습니다.
- OS/IDE 환경변수는 `.env`보다 우선할 수 있습니다. 이전 `LMS_API_TOKEN`이 설정되어 있다면 확인하세요.
- `.env`는 `.gitignore`로 제외됩니다. 토큰을 채팅에 공유할 필요가 없습니다.

## 2. 서버 실행

백엔드는 Java 21, 프론트는 Node 24를 사용합니다.

```bash
# 터미널 A: 저장소의 backend/ 폴더에서
# macOS 기본 Java가 17이면 먼저 JDK 21로 전환
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
./mvnw spring-boot:run
```

```bash
# 터미널 B: 저장소의 frontend/ 폴더에서
npm ci
npm run dev
```

[테스트 페이지](http://127.0.0.1:5173/lms-test)를 엽니다. 하단 LMS 메뉴로도 이동할 수 있습니다.
이미 서버가 실행 중이면 같은 포트로 중복 실행하지 마세요. 토큰 변경 시 기존 백엔드를 종료하고 다시 실행합니다.

## 3. 화면에서 확인

로컬 기본 개발 프로필에서는 데모 암호를 비워도 됩니다. Render 배포의 공통 계정 데모는
발표자가 정한 데모 암호가 필요합니다. 실제 Canvas 토큰을 화면에 입력하지 않습니다.
배포 설정은 [배포 문서](deployment.md#공통-계정-lms-데모)를 참고하세요.

1. ‘데모 계정·수강 과목 조회’를 누릅니다.
2. 계정 이름과 실제 수강 과목이 일치하는지 확인합니다.
3. 과목과 공지 시작/종료일을 선택합니다.
4. ‘선택 과목의 설명·공지·과제·학습 목록 조회’를 누릅니다.
5. 과목 설명, 공지, 과제 마감과 제출 방식, 학습 모듈을 확인합니다.
6. 모듈의 ‘학습 항목 조회’를 눌러 자료·과제 등의 제목과 종류를 확인합니다.
7. 실제 LMS 화면과 제목·본문·날짜·시간을 대조하고 [검증 기록](lms-verification.md)의 실환경 표를 채웁니다.

각 영역은 따로 성공/실패를 표시합니다. 과제 요청 실패가 공지 결과를 숨기지 않습니다.
과목을 바꾸면 이전 과목의 결과는 지웁니다. 공지 기간을 바꾸면 기존 공지 결과도 지웁니다.

## 4. 날짜와 내용 해석

- 공지 기간은 공지에만 적용됩니다. 과제는 페이지 상한 내 전체 반환 목록을 조회합니다.
- `due_at`: 과제 제출 마감. `unlock_at`: 제출 가능 시작. `lock_at`: 제출 차단. 서로 대체하지 않습니다.
- `override_assignment_dates=true`로 조회 계정에 적용되는 기한을 요청합니다. 개인 연장·분반별 기한은 본인의 LMS와 대조합니다.
- 날짜는 한국 시간과 API 원본을 함께 표시합니다. `2026-10-25T14:59:00Z`는 한국 시간 10/25 23:59입니다.
- 날짜 `null`은 ‘API에 날짜가 제공되지 않음’입니다. 마감 없음으로 확정하거나 임의로 23:59를 만들지 않습니다.
- 공지의 `posted_at`는 게시 시각이며 제출 마감이 아닙니다. 공지 본문 속 마감 추출은 후속 AI 기능입니다.
- 강의계획·공지·과제의 HTML은 실행하지 않고 텍스트로 표시합니다. 원문 링크에서 실제 LMS와 대조할 수 있습니다.
- 모듈 조회는 항목 목록을 확인합니다. 파일 본문·동영상·페이지 본문을 자동 다운로드하지 않습니다.
- 빈 목록은 해당 기간/권한에서 반환된 항목이 없다는 의미입니다. API 미지원으로 곧바로 단정하지 않습니다.
- LMS 화면 일부가 LearningX 등 외부 도구라면 Canvas 모듈/과제 API와 일치하지 않을 수 있습니다. 차이를 기록합니다.

## 5. API 직접 검사

요청은 로컬 백엔드로 보내며 토큰 헤더를 직접 넣지 않습니다. 42와 8은 실제 반환 ID로 바꿉니다.

```bash
curl http://127.0.0.1:8081/api/v1/dev/lms/profile
curl http://127.0.0.1:8081/api/v1/dev/lms/courses
curl http://127.0.0.1:8081/api/v1/dev/lms/courses/42
curl http://127.0.0.1:8081/api/v1/dev/lms/courses/42/assignments
curl http://127.0.0.1:8081/api/v1/dev/lms/courses/42/modules
curl http://127.0.0.1:8081/api/v1/dev/lms/courses/42/modules/8/items
```

공지 예시:

```bash
curl --get http://127.0.0.1:8081/api/v1/dev/lms/announcements \
  --data-urlencode 'courseId=42' \
  --data-urlencode 'startDate=2026-10-01' \
  --data-urlencode 'endDate=2026-10-24'
```

공지 날짜를 생략하면 한국 시간 기준 최근 90일부터 오늘까지 조회합니다. 기간은 최대 366일이며 ID는 양수여야 합니다.
목록은 페이지당 50건·최대 5페이지로 제한하며 `truncated=true`면 일부 결과입니다.

## 6. 오류 확인

| 코드 | 확인할 것 |
| --- | --- |
| LMS_NOT_CONFIGURED | backend/.env 위치·키 이름·백엔드 재시작 |
| LMS_INVALID_TOKEN_FORMAT | 토큰 안의 공백·줄바꿈 |
| LMS_TOKEN_REJECTED | LMS 401. 발급 위치·만료·토큰 값 |
| LMS_PERMISSION_DENIED | LMS 403. 과목/기능 열람 권한 |
| LMS_RESOURCE_NOT_FOUND | LMS 404. API 주소·과목/모듈 ID |
| LMS_RATE_LIMITED | LMS 429. 잠시 후 재시도 |
| LMS_REDIRECT_BLOCKED | 실제 API 주소 확인 |
| LMS_CONNECTION_FAILED | 연결·인증서·타임아웃 |
| LMS_INVALID_RESPONSE | 예상 JSON 필드와 실제 응답 차이 |
| LMS_UNSAFE_PAGINATION | 다른 주소·경로 또는 반복된 다음 페이지 |

화면은 오류 코드, 로컬 서버 HTTP 상태, 있으면 상위 LMS HTTP 상태를 표시합니다.
예를 들어 토큰 거부는 `LMS_TOKEN_REJECTED · 서버 HTTP 502 · LMS HTTP 401`입니다.
LMS의 원본 오류 본문이나 인증 헤더는 반환하지 않습니다.

## 범위

`/api/v1/dev/lms/*`는 한 명의 서버 설정 토큰을 사용하는 개발 검사 API입니다.
`prod` 프로필에서는 비활성화됩니다. 실제 다중 사용자 서비스에는 로그인·개인별 연동·권한 검사가 추가로 필요합니다.
학교 본부·국제처·단과대 공개 게시판 수집은 `integrations/school`의 별도 작업입니다.

공식 문서: [Courses](https://developerdocs.instructure.com/services/canvas/resources/courses),
[Announcements](https://developerdocs.instructure.com/services/canvas/resources/announcements),
[Assignments](https://developerdocs.instructure.com/services/canvas/resources/assignments),
[Modules](https://developerdocs.instructure.com/services/canvas/resources/modules).
