# schedule

#10 학사일정. `GET /schedules/academic`으로 이번 달부터 학년도 끝(2월)까지의 학부 학사일정을 받아 월별로 보여준다.

개인 일정은 서버 API 없이 계정별 localStorage에 저장한다(`personal-schedule-store.ts`). 학사일정을 저장하고 삭제할 수 있다.

후속 기능: 공지·과제를 개인 일정으로 저장한다.

화면에서 직접 fetch하지 않고 `shared/api/client.ts`를 통해 요청한다. 아직 없는 API는 구현 완료처럼 표시하지 않는다.
