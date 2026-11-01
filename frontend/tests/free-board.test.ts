import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  FREE_BOARD_KEY,
  addFreeBoardReply,
  createFreeBoardPost,
  deleteFreeBoardPost,
  editFreeBoardPost,
  loadFreeBoard,
  saveFreeBoard,
  updateFreeBoardReply,
  type FreeBoardActor,
} from '../src/features/free-board/free-board-store.ts'

function storage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

const owner: FreeBoardActor = { id: 'owner', name: '작성자', language: 'ko' }
const commenter: FreeBoardActor = {
  id: 'commenter',
  name: '댓글 작성자',
  language: 'en',
}
const draft = {
  title: ' 오늘의 이야기 ',
  content: ' 반가워요! ',
  language: 'ko' as const,
}

function fixture() {
  const posts = createFreeBoardPost([], owner, draft)
  return addFreeBoardReply(posts, posts[0].id, commenter, ' Hello! ')
}

test('free board creation and comments survive storage reload using a separate key', () => {
  const store = storage()
  store.setItem('nest:market-demo:v1', 'market-data')
  store.setItem('nest:questions-demo:v1', 'question-data')
  const posts = fixture()
  saveFreeBoard(store, posts)
  assert.deepEqual(loadFreeBoard(store), posts)
  assert.equal(posts[0].title, '오늘의 이야기')
  assert.equal(posts[0].replies[0].content, 'Hello!')
  assert.equal(store.getItem('nest:market-demo:v1'), 'market-data')
  assert.equal(store.getItem('nest:questions-demo:v1'), 'question-data')
})

test('owner can edit a post with comments and delete the post together with all comments', () => {
  const posts = fixture()
  const store = storage()
  const edited = editFreeBoardPost(posts, posts[0].id, owner.id, {
    ...draft,
    title: '수정한 이야기',
  })
  assert.deepEqual(edited[0].replies, posts[0].replies)
  assert.equal(posts[0].title, '오늘의 이야기')
  saveFreeBoard(store, edited)
  const deleted = deleteFreeBoardPost(
    loadFreeBoard(store),
    posts[0].id,
    owner.id,
  )
  saveFreeBoard(store, deleted)
  assert.deepEqual(loadFreeBoard(store), [])
  assert.equal(posts[0].replies.length, 1)
  const withoutComments = createFreeBoardPost([], owner, draft)
  assert.deepEqual(
    deleteFreeBoardPost(withoutComments, withoutComments[0].id, owner.id),
    [],
  )
})

test('only the post owner may edit or delete; samples stay read-only', () => {
  const posts = fixture()
  for (const actorId of ['', commenter.id, 'other']) {
    assert.throws(() => editFreeBoardPost(posts, posts[0].id, actorId, draft))
    assert.throws(() => deleteFreeBoardPost(posts, posts[0].id, actorId))
  }
  const samples = loadFreeBoard(storage())
  assert.throws(() =>
    editFreeBoardPost(samples, samples[0].id, samples[0].authorId, draft),
  )
  assert.throws(() =>
    deleteFreeBoardPost(samples, samples[0].id, samples[0].authorId),
  )
  assert.throws(() => deleteFreeBoardPost(posts, 'missing', owner.id))
})

test('comment ownership is independent of post ownership, with no resolution lock', () => {
  const posts = fixture()
  const postId = posts[0].id
  const replyId = posts[0].replies[0].id
  for (const actorId of ['', owner.id, 'other']) {
    assert.throws(() =>
      updateFreeBoardReply(posts, postId, replyId, actorId, {
        type: 'edit',
        content: '변경',
      }),
    )
    assert.throws(() =>
      updateFreeBoardReply(posts, postId, replyId, actorId, { type: 'delete' }),
    )
  }
  const editedPost = editFreeBoardPost(posts, postId, owner.id, {
    ...draft,
    title: '수정 후에도 댓글 수정 가능',
  })
  const editedReply = updateFreeBoardReply(
    editedPost,
    postId,
    replyId,
    commenter.id,
    { type: 'edit', content: ' Updated ' },
  )
  assert.equal(editedReply[0].replies[0].content, 'Updated')
  assert.equal(posts[0].replies[0].content, 'Hello!')
  const store = storage()
  saveFreeBoard(store, editedReply)
  const deleted = updateFreeBoardReply(
    loadFreeBoard(store),
    postId,
    replyId,
    commenter.id,
    { type: 'delete' },
  )
  assert.equal(deleted[0].replies.length, 0)
})

test('post and comment mutations reject empty or oversized input', () => {
  for (const invalid of [
    { ...draft, title: ' ' },
    { ...draft, title: 'x'.repeat(81) },
    { ...draft, content: ' ' },
    { ...draft, content: 'x'.repeat(3001) },
  ]) {
    assert.throws(() => createFreeBoardPost([], owner, invalid))
    const posts = fixture()
    assert.throws(() =>
      editFreeBoardPost(posts, posts[0].id, owner.id, invalid),
    )
  }
  const posts = fixture()
  for (const content of [' ', 'x'.repeat(1001)]) {
    assert.throws(() =>
      addFreeBoardReply(posts, posts[0].id, commenter, content),
    )
    assert.throws(() =>
      updateFreeBoardReply(
        posts,
        posts[0].id,
        posts[0].replies[0].id,
        commenter.id,
        { type: 'edit', content },
      ),
    )
  }
  assert.throws(() => addFreeBoardReply(posts, 'missing', commenter, '댓글'))
  assert.throws(() => createFreeBoardPost([], { ...owner, id: '' }, draft))
})

test('corrupt data and storage write failures surface without overwriting stored content', () => {
  const store = storage()
  store.setItem(FREE_BOARD_KEY, '{broken')
  assert.throws(() => loadFreeBoard(store))
  assert.equal(store.getItem(FREE_BOARD_KEY), '{broken')
  store.setItem(
    FREE_BOARD_KEY,
    JSON.stringify({
      version: 1,
      posts: [{ ...fixture()[0], language: 'invalid' }],
    }),
  )
  assert.throws(() => loadFreeBoard(store))
  const posts = fixture()
  assert.throws(
    () =>
      saveFreeBoard(
        {
          getItem: () => null,
          setItem: () => {
            throw new Error('quota')
          },
        },
        posts,
      ),
    /quota/,
  )
  assert.throws(() => saveFreeBoard(store, [{ ...posts[0], title: '' }]))
  const samples = loadFreeBoard(storage())
  samples[0].title = 'changed'
  assert.notEqual(loadFreeBoard(storage())[0].title, 'changed')
})
