import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  MARKET_KEY,
  loadMarket,
  saveMarket,
  editMarketPost,
  updateMarketReply,
} from '../src/features/market/market-store.ts'
function storage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}
test('new posts, trade status and replies survive reload', () => {
  const store = storage()
  const posts = loadMarket(store)
  const own = {
    ...posts[0],
    id: 'own',
    authorId: 'a',
    example: false,
    replies: [
      {
        id: 'reply',
        authorId: 'b',
        author: 'B',
        language: 'en' as const,
        content: 'Interested',
        createdAt: new Date().toISOString(),
      },
    ],
  }
  const updated = editMarketPost([own, ...posts], 'own', 'a', {
    ...own,
    status: 'completed',
    price: 23000,
  })
  saveMarket(store, updated)
  assert.deepEqual(loadMarket(store), updated)
  assert.equal(loadMarket(store)[0].replies[0].authorId, 'b')
})
test('another account and sample author cannot edit posts', () => {
  const posts = loadMarket(storage())
  const own = { ...posts[0], id: 'own', authorId: 'a', example: false }
  assert.throws(() => editMarketPost([own], 'own', 'b', own))
  assert.throws(() =>
    editMarketPost(posts, posts[0].id, posts[0].authorId, posts[0]),
  )
})
test('corrupt data is surfaced instead of silently overwritten', () => {
  const store = storage()
  store.setItem(MARKET_KEY, '{broken')
  assert.throws(() => loadMarket(store))
  store.setItem(
    MARKET_KEY,
    JSON.stringify({ version: 1, posts: [{ price: -1 }] }),
  )
  assert.throws(() => loadMarket(store))
})
test('storage write failures propagate and seed data is independent', () => {
  const first = loadMarket(storage())
  first[0].title = 'changed'
  assert.notEqual(loadMarket(storage())[0].title, 'changed')
  assert.throws(
    () =>
      saveMarket(
        {
          getItem: () => null,
          setItem: () => {
            throw new Error('quota')
          },
        },
        first,
      ),
    /quota/,
  )
})

test('only the reply author can edit or delete, including when actor owns the post', () => {
  const posts = loadMarket(storage())
  posts[0].replies = [
    {
      id: 'r',
      authorId: 'reply-owner',
      author: 'Author',
      language: 'ko',
      content: 'Original',
      createdAt: '2026-10-30T00:00:00Z',
    },
  ]
  for (const actor of ['', 'other', posts[0].authorId]) {
    assert.throws(() =>
      updateMarketReply(posts, posts[0].id, 'r', actor, {
        type: 'edit',
        content: 'Changed',
      }),
    )
    assert.throws(() =>
      updateMarketReply(posts, posts[0].id, 'r', actor, { type: 'delete' }),
    )
  }
  const edited = updateMarketReply(posts, posts[0].id, 'r', 'reply-owner', {
    type: 'edit',
    content: ' Changed ',
  })
  assert.equal(posts[0].replies[0].content, 'Original')
  assert.deepEqual(edited[0].replies[0], {
    ...posts[0].replies[0],
    content: 'Changed',
  })
  const store = storage()
  saveMarket(store, edited)
  assert.equal(loadMarket(store)[0].replies[0].content, 'Changed')
  saveMarket(
    store,
    updateMarketReply(edited, posts[0].id, 'r', 'reply-owner', {
      type: 'delete',
    }),
  )
  assert.equal(loadMarket(store)[0].replies.length, 0)
  for (const content of ['  ', 'a'.repeat(1001)])
    assert.throws(() =>
      updateMarketReply(posts, posts[0].id, 'r', 'reply-owner', {
        type: 'edit',
        content,
      }),
    )
  assert.throws(() =>
    updateMarketReply(posts, posts[0].id, 'missing', 'reply-owner', {
      type: 'delete',
    }),
  )
})

test('new language examples join existing posts without overwriting replies or duplicating', () => {
  const store = storage()
  const examples = loadMarket(store)
  for (const language of ['ko', 'en', 'zh'])
    assert.equal(
      examples.filter((post) => post.language === language).length,
      2,
    )
  const original = {
    ...examples[0],
    title: 'Preserved title',
    replies: [
      {
        id: 'existing-reply',
        authorId: 'student',
        author: 'Student',
        language: 'en' as const,
        content: 'Keep this reply',
        createdAt: '2026-11-01T00:00:00Z',
      },
    ],
  }
  const own = {
    ...examples[1],
    id: 'own-saved-post',
    authorId: 'student',
    example: false,
  }
  saveMarket(store, [own, original])
  const loaded = loadMarket(store)
  assert.deepEqual(loaded.slice(0, 2), [own, original])
  assert.equal(loaded.length, 6)
  assert.equal(loaded.filter((post) => post.language === 'en').length, 2)
  assert.equal(loaded.filter((post) => post.language === 'zh').length, 2)
  saveMarket(store, loaded)
  assert.deepEqual(loadMarket(store), loaded)
})

test('legacy chair example wording updates while saved replies and user posts remain intact', () => {
  const store = storage()
  const chair = loadMarket(store).find(
    (post) => post.id === 'example-chair-zh',
  )!
  const legacy = {
    ...chair,
    title: '出售二手书桌椅',
    content: '出售一把二手书桌椅，价格为20,000韩元。',
    replies: [
      {
        id: 'kept',
        authorId: 'student',
        author: 'Student',
        language: 'en' as const,
        content: 'Is this available?',
        createdAt: '2026-11-10T00:00:00Z',
      },
    ],
  }
  const own = { ...legacy, id: 'student-chair', example: false }
  saveMarket(store, [legacy, own])
  const raw = store.getItem(MARKET_KEY)
  const loaded = loadMarket(store)
  assert.equal(loaded[0].title, chair.title)
  assert.equal(loaded[0].content, chair.content)
  assert.deepEqual(loaded[0].replies, legacy.replies)
  assert.deepEqual(loaded[1], own)
  assert.equal(store.getItem(MARKET_KEY), raw)
  saveMarket(store, loaded)
  assert.deepEqual(loadMarket(store), loaded)
})
