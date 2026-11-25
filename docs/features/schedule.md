# schedule

코드 위치: `frontend/src/features/schedule/`

#10 학사일정. `GET /api/v1/schedules/academic`으로 이번 달부터 학년도 끝(2월)까지의 학부 학사일정을 받아 월별로 보여준다.

개인 일정은 서버 API 없이 계정별 localStorage에 저장한다(`personal-schedule-store.ts`). 학사일정을 저장하고 삭제할 수 있다.
같은 브라우저의 다른 탭에서 저장한 일정을 덮어쓰지 않도록 저장 직전에 다시 읽고, `storage` 이벤트로 다른 탭의 변경을 반영한다.

학사일정 데이터 갱신 방법은 [API 계약](../api.md#get-apiv1schedulesacademic)의 "일정 갱신"을 참고한다.

공지 상세(`notices/pages/NoticeDetailPage.tsx`)와 과목별 공지·과제(`courses/CourseNoticesPage.tsx`)에서도 마감을 개인 일정으로 저장한다.

화면에서 직접 fetch하지 않고 `shared/api/client.ts`를 통해 요청한다. 아직 없는 API는 구현 완료처럼 표시하지 않는다.
