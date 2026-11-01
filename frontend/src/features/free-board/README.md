# 자유게시판

기존 장터·질문게시판 흐름을 참고한 자유게시판 기본 구현이다. React Context와
`sessionStorage`를 사용하며 DB·게시글 저장 API는 사용하지 않는다.

## 파일 구조

- `free-board-store.ts`: 글·댓글 타입, 예시 글, 저장·복원, 입력 검증 및 작성자 검사
- `free-board-context.ts`: Context와 `useFreeBoard` 훅
- `FreeBoardLayout.tsx`: 로그인·프로필의 작성자 정보 연결, 탭 저장 및 저장 실패 처리
- `FreeBoardPages.tsx`: 목록, 상세, 작성·수정 화면
- `FreeBoardReplyCard.tsx`: 댓글 표시와 본인 댓글 수정·삭제
- `free-board-format.ts`: 한국 시간 날짜 표시
- `free-board.css`: 자유게시판 전용 스타일. 기존 `market.css`는 import만 한다.

## 동작 기준

- 글 목록·상세 조회, 글 작성·수정·삭제, 댓글 작성·수정·삭제를 제공한다.
- 글 작성자만 글을 수정·삭제한다. 댓글이 있어도 글을 삭제할 수 있고 댓글도 함께 제거된다.
- 댓글은 해당 댓글 작성자만 수정·삭제한다. 글 작성자가 타인의 댓글을 개별 삭제할 수는 없다.
- 해결·미해결 상태와 수정 잠금은 없다.
- 제목은 80자, 본문은 3,000자, 댓글은 1,000자까지 입력한다.
- 원문과 작성 언어를 보관한다. 번역 API는 아직 화면에 연결하지 않았다.
- 한국어·영어·중국어 각 2건의 예시 글은 읽기 전용이며 댓글을 달 수 있다.
- 한국어 예시 글 작성자는 송선우·김용태다.
- 글은 등록 순서대로 최신 글이 위에 놓인다. 수정해도 작성 시각과 댓글을 유지한다.
- 저장 키는 `nest:free-board-demo:v1`이며 장터·질문·프로필 저장소와 분리한다.
- 저장 실패 시 화면 상태를 성공으로 바꾸지 않고 입력을 유지한다.
- 손상된 저장 데이터는 오류를 표시하고 쓰기를 막아 기존 데이터를 덮어쓰지 않는다.
- 작성자는 기존 `session.user.id`, 표시 이름·언어는 저장 프로필을 따른다.
- 개발 미리보기는 기존 게시판과 같은 `local-preview` ID를 사용한다.
- 같은 탭의 로그인 계정들은 같은 게시글 목록을 보며, 작성자 ID로 관리 가능 여부를 구분한다.

## 화면 연결

사용자 승인에 따라 `App.tsx`에 아래 라우트와 개발 미리보기 경로를 연결하고,
`LifeHomePage.tsx`의 자유게시판 링크를 `/life/free`로 통일했다.
기존 장터·질문게시판 기능 코드는 변경하지 않는다.

`App.tsx`에서 아래 컴포넌트를 import한다.

```tsx
import {
  FreeBoardLayout,
  FreeBoardListPage,
  FreeBoardDetailPage,
  FreeBoardFormPage,
} from '../features/free-board/FreeBoardPages'
```

`ProtectedApp` 하위에 자유게시판 라우트를 추가한다.

```tsx
<Route path="/life/free" element={<FreeBoardLayout />}>
  <Route index element={<FreeBoardListPage />} />
  <Route path="new" element={<FreeBoardFormPage />} />
  <Route path=":postId" element={<FreeBoardDetailPage />} />
  <Route path=":postId/edit" element={<FreeBoardFormPage />} />
</Route>
```

개발 미리보기 경로 조건에 `location.pathname.startsWith('/life/free/')`를 추가한다.
`LifeHomePage.tsx`의 자유게시판 링크는 `/community`에서 `/life/free`로 연결한다.

## 확인 방법

`frontend`에서 `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`를 실행한다.
자유게시판 테스트는 `frontend/tests/free-board.test.ts`에 있다.

자동 테스트 33개(자유게시판 6개 포함), 타입 검사·빌드·lint 및 변경 파일 포맷 검사를 통과했다.
브라우저에서 LIFE 홈 → 자유게시판 이동, 글·댓글 작성, 새로고침 후 복원,
댓글이 있는 글 수정, 댓글 수정, 글 삭제 확인 및 취소를 확인했다.
댓글이 있는 글의 실제 삭제·작성자별 권한·저장 실패는 자동 테스트로 검증했다.
