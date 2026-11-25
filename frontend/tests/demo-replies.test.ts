import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  FREE_BOARD_KEY,
  loadFreeBoard,
  saveFreeBoard,
} from '../src/features/free-board/free-board-store.ts'
import {
  MARKET_KEY,
  loadMarket,
  saveMarket,
} from '../src/features/market/market-store.ts'
import {
  QUESTIONS_KEY,
  loadQuestion,
  saveQuestion,
} from '../src/features/questions/question-store.ts'
import { collectBoardItems } from '../src/features/translation/board-translation-items.ts'
import { SUPPORTED_LANGUAGES } from '../src/shared/types/language.ts'

function storage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

const boards = [
  {
    board: 'free',
    key: FREE_BOARD_KEY,
    load: loadFreeBoard,
    save: saveFreeBoard,
  },
  { board: 'market', key: MARKET_KEY, load: loadMarket, save: saveMarket },
  {
    board: 'questions',
    key: QUESTIONS_KEY,
    load: loadQuestion,
    save: saveQuestion,
  },
] as const

for (const { board, key, load } of boards) {
  test(`${board}: examples have one or two replies and cover all three source languages`, () => {
    const posts = load(storage())
    assert.equal(posts.length, 6)
    const ids = new Set<string>()
    const languages = new Map<string, number>()
    for (const post of posts) {
      assert.ok(post.replies.length >= 1 && post.replies.length <= 2)
      const items = collectBoardItems(
        board,
        [post],
        `/life/${board}/${post.id}`,
        '',
      )
      for (const reply of post.replies) {
        assert.ok(
          reply.content.trim().length > 0 && reply.content.length <= 1000,
        )
        assert.ok(Date.parse(reply.createdAt) > Date.parse(post.createdAt))
        assert.notEqual(reply.authorId, post.authorId)
        assert.ok(!ids.has(reply.id))
        ids.add(reply.id)
        languages.set(reply.language, (languages.get(reply.language) ?? 0) + 1)
        const item = items.find(
          (item) => item.id === `${board}:${post.id}:reply:${reply.id}`,
        )
        assert.equal(item?.text, reply.content)
        assert.equal(item?.sourceLanguage, reply.language)
        assert.ok(item?.context?.includes(post.title))
      }
    }
    assert.equal(ids.size, 9)
    for (const language of SUPPORTED_LANGUAGES)
      assert.equal(languages.get(language), 3)
  })

  test(`${board}: existing tabs gain missing demo replies while keeping saved content`, () => {
    const store = storage()
    const [seed] = load(store)
    const reply = {
      id: 'saved-user-reply',
      authorId: 'student',
      author: 'Student',
      language: 'en',
      content: 'Please keep my comment.',
      createdAt: '2026-11-20T00:00:00Z',
    }
    const legacy = { ...seed, title: 'Saved title', replies: [reply] }
    const own = {
      ...seed,
      example: false,
      authorId: 'student',
      replies: [reply],
    }
    const unknown = { ...legacy, id: 'unknown-example' }
    store.setItem(
      key,
      JSON.stringify({ version: 1, posts: [own, legacy, unknown] }),
    )
    const raw = store.getItem(key)
    const posts = load(store)
    assert.deepEqual(posts[0], own)
    assert.deepEqual(posts[1], { ...legacy, replies: [reply, ...seed.replies] })
    assert.deepEqual(posts[2], unknown)
    assert.equal(store.getItem(key), raw)
    assert.deepEqual(load(store), posts)
    // Persist the migration, then verify it stays idempotent on further reloads.
    store.setItem(key, JSON.stringify({ version: 1, posts }))
    assert.deepEqual(load(store), posts)
  })

  test(`${board}: a partially seeded tab keeps existing demo and user replies without duplication`, () => {
    const store = storage()
    const [seed] = load(store)
    const changed = {
      ...seed.replies[0],
      content: 'Saved content must be preserved.',
    }
    store.setItem(
      key,
      JSON.stringify({ version: 1, posts: [{ ...seed, replies: [changed] }] }),
    )
    const posts = load(store)
    assert.deepEqual(posts[0].replies, [changed, ...seed.replies.slice(1)])
    posts[0].replies[0].content = 'Changed in memory'
    assert.deepEqual(load(storage())[0].replies, seed.replies)
  })

  test(`${board}: previous three-comment mocks shrink without removing real replies or user posts`, () => {
    const store = storage()
    const examples = load(store)
    const previous = examples.map((post) => ({
      ...post,
      replies: SUPPORTED_LANGUAGES.map((language) => ({
        id: `demo-reply:${post.id}:${language}`,
        authorId: `demo-reply-author:${language}`,
        author: 'Demo',
        language,
        content: 'Previous mock comment',
        createdAt: '2026-11-10T00:00:00Z',
      })),
    }))
    const realReply = {
      ...previous[0].replies[0],
      id: 'real-reply',
      authorId: 'student',
    }
    previous[0].replies.push(realReply)
    const own = { ...previous[1], example: false, authorId: 'student' }
    const unknown = { ...previous[2], id: 'unknown-example' }
    const posts = [...previous, own, unknown]
    store.setItem(key, JSON.stringify({ version: 1, posts }))
    const raw = store.getItem(key)
    const loaded = load(store)
    for (let index = 0; index < examples.length; index++) {
      const allowed = new Set(examples[index].replies.map((reply) => reply.id))
      const retained = previous[index].replies.filter(
        (reply) => reply.id === realReply.id || allowed.has(reply.id),
      )
      assert.deepEqual(loaded[index].replies, retained)
    }
    assert.deepEqual(loaded.at(-2), own)
    assert.deepEqual(loaded.at(-1), unknown)
    assert.equal(store.getItem(key), raw)
    store.setItem(key, JSON.stringify({ version: 1, posts: loaded }))
    assert.deepEqual(load(store), loaded)
  })
}
