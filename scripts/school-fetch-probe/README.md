# 학교 접속 비교용 Vercel 서울 함수

첨단융합대학의 공개 목록 URL 하나에 접속해 상태·소요 시간·최종 주소·페이지 제목을 반환한다.
공지 파싱·저장·자동 수집 기능은 없다. 기존 프론트엔드와 별도 프로젝트로 배포한다.

1. Vercel의 **Add New → Project**에서 이 저장소를 선택한다.
2. Root Directory를 **`scripts/school-fetch-probe`**, Framework Preset을 **Other**로 지정한다.
3. 별도 빌드 명령이나 출력 폴더를 지정하지 않고 배포한다. `vercel.json`이 서울(`icn1`)을 지정한다.
4. `https://발급된주소/api/probe`에 접속한다. Deployment Protection은 유지하고 본인 계정으로 확인한다.
5. JSON의 `region`이 `icn1`인지 확인한 뒤 `reached`, `ok`, `status`, `finalUrl`, `title`을 함께 본다.
6. 비교할 결과를 확보하면 임시 배포를 정리한다. 진단은 직접 호출할 때만 실행된다.

진단 API 자체의 HTTP 200은 학교 접속 성공을 뜻하지 않는다. 학교가 HTTP 200으로 차단 안내를 반환할 수도 있다.
본문 전체를 반환하지 않으며, URL을 외부 입력으로 받지 않는다.

서울의 Node.js 함수와 Render의 Java는 위치·출발 IP·TLS 구현이 모두 다르다.
성공하더라도 리전만 원인이라고 확정하거나 12개 게시판·상세·첨부가 모두 된다고 판단하지 않는다.

Render 코드의 설정·로그 해석은 [공지 수집 진단](../../docs/school-notice-fetch.md)을 참고한다.

공식 문서: [함수 리전](https://vercel.com/docs/functions/configuring-functions/region),
[Node.js 함수](https://vercel.com/docs/functions/runtimes/node-js).
