import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  loadQuestion,
  saveQuestion,
  editQuestionPost,
  resolveQuestionPost,
  deleteQuestionPost,
  updateQuestionReply,
  QUESTIONS_KEY,
} from '../src/features/questions/question-store.ts'
function storage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}
function fixture() {
  const posts = loadQuestion(storage())
  posts[0] = {
    ...posts[0],
    example: false,
    authorId: 'owner',
    replies: [
      {
        id: 'r',
        authorId: 'reply-owner',
        author: '답변자',
        language: 'ko',
        content: '답변입니다',
        createdAt: '2026-10-30T00:00:00Z',
      },
    ],
  }
  return posts
}
test('question edits, category and resolution persist without losing replies', () => {
  const store = storage()
  const posts = fixture()
  const changed = editQuestionPost(posts, posts[0].id, 'owner', {
    category: 'life',
    title: '수정 질문',
    content: '수정 내용',
    language: 'ko',
  })
  saveQuestion(store, changed)
  assert.deepEqual(loadQuestion(store), changed)
  assert.equal(changed[0].replies.length, 1)
  assert.equal(posts[0].status, 'unresolved')
  const resolved = resolveQuestionPost(changed, changed[0].id, 'owner')
  saveQuestion(store, resolved)
  assert.equal(loadQuestion(store)[0].status, 'resolved')
  assert.throws(() =>
    editQuestionPost(resolved, resolved[0].id, 'owner', resolved[0]),
  )
  assert.throws(() => resolveQuestionPost(resolved, resolved[0].id, 'owner'))
  assert.throws(() => deleteQuestionPost(resolved, resolved[0].id, 'owner'))
  for (const action of [
    { type: 'edit', content: '수정 시도' },
    { type: 'delete' },
  ] as const) {
    assert.throws(
      () =>
        updateQuestionReply(
          resolved,
          resolved[0].id,
          'r',
          'reply-owner',
          action,
        ),
      /해결된 질문/,
    )
    assert.throws(
      () =>
        updateQuestionReply(
          loadQuestion(store),
          resolved[0].id,
          'r',
          'reply-owner',
          action,
        ),
      /해결된 질문/,
    )
  }
  assert.deepEqual(resolved[0].replies, changed[0].replies)
  // A previously stored resolved question with no replies remains locked too.
  const withoutReplies = resolved.map((post) => ({ ...post, replies: [] }))
  assert.throws(() =>
    deleteQuestionPost(withoutReplies, withoutReplies[0].id, 'owner'),
  )
  assert.throws(() =>
    editQuestionPost(
      withoutReplies,
      withoutReplies[0].id,
      'owner',
      withoutReplies[0],
    ),
  )
})
test('another account cannot edit a question or change its resolution', () => {
  const posts = fixture()
  assert.throws(() =>
    editQuestionPost(posts, posts[0].id, 'other', {
      ...posts[0],
    }),
  )
  const examples = loadQuestion(storage())
  assert.throws(() =>
    editQuestionPost(
      examples,
      examples[0].id,
      examples[0].authorId,
      examples[0],
    ),
  )
})
test('reply ownership is independent of question ownership and changes persist', () => {
  const posts = fixture()
  const store = storage()
  for (const actor of ['owner', 'other', '']) {
    assert.throws(() =>
      updateQuestionReply(posts, posts[0].id, 'r', actor, {
        type: 'edit',
        content: '수정',
      }),
    )
    assert.throws(() =>
      updateQuestionReply(posts, posts[0].id, 'r', actor, { type: 'delete' }),
    )
  }
  const changed = updateQuestionReply(posts, posts[0].id, 'r', 'reply-owner', {
    type: 'edit',
    content: ' 수정 답변 ',
  })
  saveQuestion(store, changed)
  assert.equal(loadQuestion(store)[0].replies[0].content, '수정 답변')
  saveQuestion(
    store,
    updateQuestionReply(changed, posts[0].id, 'r', 'reply-owner', {
      type: 'delete',
    }),
  )
  assert.equal(loadQuestion(store)[0].replies.length, 0)
  for (const content of [' ', 'x'.repeat(1001)])
    assert.throws(() =>
      updateQuestionReply(posts, posts[0].id, 'r', 'reply-owner', {
        type: 'edit',
        content,
      }),
    )
})
test('invalid data and storage errors are reported; question data uses a separate key', () => {
  const store = storage()
  store.setItem('nest:market-demo:v1', 'market')
  assert.equal(loadQuestion(store).length, 2)
  store.setItem(QUESTIONS_KEY, '{')
  assert.throws(() => loadQuestion(store))
  store.setItem(
    QUESTIONS_KEY,
    JSON.stringify({
      version: 1,
      posts: [{ ...fixture()[0], category: 'invalid' }],
    }),
  )
  assert.throws(() => loadQuestion(store))
  assert.throws(
    () =>
      saveQuestion(
        {
          getItem: () => null,
          setItem: () => {
            throw new Error('quota')
          },
        },
        fixture(),
      ),
    /quota/,
  )
})

test('zero replies allows deletion but prevents resolution; replies reverse those permissions', () => {
  const posts = fixture()
  assert.throws(() => deleteQuestionPost(posts, posts[0].id, 'owner'))
  const empty = updateQuestionReply(posts, posts[0].id, 'r', 'reply-owner', {
    type: 'delete',
  })
  assert.throws(() => resolveQuestionPost(empty, empty[0].id, 'owner'))
  const deleted = deleteQuestionPost(empty, empty[0].id, 'owner')
  assert.equal(deleted.length, empty.length - 1)
  assert.equal(empty.length, posts.length)
  for (const actor of ['other', '']) {
    assert.throws(() => resolveQuestionPost(posts, posts[0].id, actor))
    assert.throws(() => deleteQuestionPost(empty, empty[0].id, actor))
  }
  const edited = editQuestionPost(posts, posts[0].id, 'owner', {
    ...posts[0],
    title: 'updated',
    status: 'resolved',
  } as (typeof posts)[0])
  assert.equal(edited[0].status, 'unresolved')
  const store = storage()
  saveQuestion(store, deleted)
  assert.deepEqual(loadQuestion(store), deleted)
})
