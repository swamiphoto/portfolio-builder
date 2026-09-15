# Draft / Publish Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public site change only when the user clicks Publish, and make the "unpublished changes" state survive page refreshes.

**Architecture:** Split the single per-user config into a **draft** (`site-config.json`, what the editor autosaves) and a **published snapshot** (`site-config.published.json`, what public pages read). Publish copies draft→published and stamps timestamps; dirty state is `draft.updatedAt > published.publishedAt`, computed on load. Every publish also writes a capped history snapshot. Legacy users are migrated transparently by seeding `published := draft` on first read.

**Tech Stack:** Next.js (pages router), Cloudflare R2 via `common/gcsClient.js` (S3 SDK), Jest.

**Spec:** `docs/superpowers/specs/2026-09-14-draft-publish-and-history-design.md`

## Global Constraints

- **Server owns timestamps.** The client never sets `updatedAt`/`publishedAt`; the server always overwrites them. Copied from spec: `hasUnpublishedChanges = draft.updatedAt > published.publishedAt`.
- **No image duplication.** Snapshots copy config JSON only (photo *references*), never image bytes.
- **History cap:** keep the newest **20** publish snapshots per user.
- **Migration must not darken live sites:** if no published file exists, seed `published := draft` (idempotent, on first read) so everyone starts clean/published.
- Storage paths are relative keys passed to `common/gcsClient.js` (`downloadJSON`, `uploadJSON`, `listFiles`, `deleteFiles`). Config reads must go through the existing normalization pipeline in `common/siteConfig.js` (`normalizePageEntity`, `dropSeededHomePage`, `normalizePrintStore`, `migrateSiteConfigThemes`).
- Follow the existing test style: lib tests mock `common/gcsClient` + `common/gcsUser` (see `__tests__/common/siteConfig.test.js`); API tests import the exported `handler` and call it with mock `req/res/user` (see `__tests__/api/upload-file.test.js`).

---

### Task 1: GCS path helpers for published + history

**Files:**
- Modify: `common/gcsUser.js`
- Test: `__tests__/common/gcsUser.test.js`

**Interfaces:**
- Consumes: `getUserPrefix(userId)` (existing).
- Produces:
  - `getUserPublishedConfigPath(userId): string` → `users/{id}/site-config.published.json`
  - `getUserHistoryPrefix(userId): string` → `users/{id}/history/`
  - `getUserHistoryPath(userId, ts: number): string` → `users/{id}/history/site-config-{ts}.json`

- [ ] **Step 1: Write the failing test**

Add to `__tests__/common/gcsUser.test.js`:

```js
import {
  getUserPublishedConfigPath,
  getUserHistoryPrefix,
  getUserHistoryPath,
} from '../../common/gcsUser'

describe('published + history paths', () => {
  it('builds the published config path', () => {
    expect(getUserPublishedConfigPath('u1')).toBe('users/u1/site-config.published.json')
  })
  it('builds the history prefix', () => {
    expect(getUserHistoryPrefix('u1')).toBe('users/u1/history/')
  })
  it('builds a timestamped history path', () => {
    expect(getUserHistoryPath('u1', 1757900000000)).toBe('users/u1/history/site-config-1757900000000.json')
  })
  it('throws without a userId', () => {
    expect(() => getUserPublishedConfigPath()).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/common/gcsUser.test.js -t "published + history"`
Expected: FAIL — functions are not exported.

- [ ] **Step 3: Implement the helpers**

Add to `common/gcsUser.js`:

```js
export function getUserPublishedConfigPath(userId) {
  return `${getUserPrefix(userId)}site-config.published.json`
}

export function getUserHistoryPrefix(userId) {
  return `${getUserPrefix(userId)}history/`
}

export function getUserHistoryPath(userId, ts) {
  if (ts == null) throw new Error('ts is required')
  return `${getUserHistoryPrefix(userId)}site-config-${ts}.json`
}
```

(`getUserPrefix` already throws when `userId` is missing, satisfying the throw test.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/common/gcsUser.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/gcsUser.js __tests__/common/gcsUser.test.js
git commit -m "feat(config): add published + history GCS path helpers"
```

---

### Task 2: Stamp `updatedAt` on every draft write

**Files:**
- Modify: `common/siteConfig.js` (`writeSiteConfig`, ~line 257)
- Test: `__tests__/common/siteConfig.test.js`

**Interfaces:**
- Produces: `writeSiteConfig(userId, config, opts?: { updatedAt?: number }): Promise<void>` — writes the draft with a server-owned `updatedAt` (from `opts.updatedAt`, else `Date.now()`), ignoring any incoming `config.updatedAt`.

- [ ] **Step 1: Write the failing test**

Add to `__tests__/common/siteConfig.test.js` (the file already mocks `gcsClient`/`gcsUser` at the top):

```js
describe('writeSiteConfig timestamps', () => {
  beforeEach(() => { uploadJSON.mockReset() })

  it('stamps server updatedAt, overwriting any incoming value', async () => {
    const spy = jest.spyOn(Date, 'now').mockReturnValue(111)
    await writeSiteConfig('u1', { pages: [], updatedAt: 999 })
    expect(uploadJSON).toHaveBeenCalledWith('users/u1/site-config.json', expect.objectContaining({ updatedAt: 111 }))
    spy.mockRestore()
  })

  it('honors an explicit updatedAt override (used by publish)', async () => {
    await writeSiteConfig('u1', { pages: [] }, { updatedAt: 222 })
    expect(uploadJSON).toHaveBeenCalledWith('users/u1/site-config.json', expect.objectContaining({ updatedAt: 222 }))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/common/siteConfig.test.js -t "writeSiteConfig timestamps"`
Expected: FAIL — `updatedAt` not present / not overridden.

- [ ] **Step 3: Implement**

In `common/siteConfig.js`, change `writeSiteConfig`:

```js
export async function writeSiteConfig(userId, config, { updatedAt } = {}) {
  await uploadJSON(getUserSiteConfigPath(userId), {
    ...config,
    updatedAt: updatedAt ?? Date.now(),
    pages: (config.pages || []).map((page) => normalizePageEntity(page)),
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/common/siteConfig.test.js`
Expected: PASS (existing tests still green).

- [ ] **Step 5: Commit**

```bash
git add common/siteConfig.js __tests__/common/siteConfig.test.js
git commit -m "feat(config): stamp server-owned updatedAt on draft writes"
```

---

### Task 3: Published read/write + seeding + dirty computation

**Files:**
- Modify: `common/siteConfig.js`
- Test: `__tests__/common/siteConfig.test.js`

**Interfaces:**
- Consumes: `getUserPublishedConfigPath` (Task 1), `readSiteConfig`, `writeSiteConfig` (Task 2), `downloadJSON`/`uploadJSON` (mocked in tests).
- Produces:
  - `writePublishedSiteConfig(userId, config, publishedAt: number): Promise<void>` — writes `{...config, publishedAt}` (normalized pages) to the published path.
  - `ensurePublishedSeeded(userId): Promise<Config|null>` — if the published file is absent, seed it from the draft (`publishedAt = draft.updatedAt ?? Date.now()`) and return the seeded config; returns `null` if there is no draft either.
  - `readPublishedSiteConfig(userId): Promise<Config|null>` — returns the normalized published config, seeding from the draft on first read; `null` if neither exists. Always carries `publishedAt`.
  - `computeHasUnpublishedChanges(draft, published): boolean` — `!published || (draft?.updatedAt ?? 0) > (published?.publishedAt ?? 0)`.

- [ ] **Step 1: Write the failing tests**

Add to `__tests__/common/siteConfig.test.js`. Note the top of the file mocks `getUserSiteConfigPath`; extend that mock to also return the published path:

```js
// UPDATE the existing gcsUser mock at the top of the file to add:
//   getUserPublishedConfigPath: jest.fn(userId => `users/${userId}/site-config.published.json`),
import {
  writePublishedSiteConfig,
  ensurePublishedSeeded,
  readPublishedSiteConfig,
  computeHasUnpublishedChanges,
} from '../../common/siteConfig'

const NoSuchKey = () => Object.assign(new Error('missing'), { name: 'NoSuchKey' })

describe('computeHasUnpublishedChanges', () => {
  it('is false when draft is not newer than published', () => {
    expect(computeHasUnpublishedChanges({ updatedAt: 5 }, { publishedAt: 5 })).toBe(false)
    expect(computeHasUnpublishedChanges({ updatedAt: 4 }, { publishedAt: 5 })).toBe(false)
  })
  it('is true when draft is newer', () => {
    expect(computeHasUnpublishedChanges({ updatedAt: 6 }, { publishedAt: 5 })).toBe(true)
  })
  it('is true when there is no published file', () => {
    expect(computeHasUnpublishedChanges({ updatedAt: 6 }, null)).toBe(true)
  })
})

describe('ensurePublishedSeeded', () => {
  beforeEach(() => { downloadJSON.mockReset(); uploadJSON.mockReset() })

  it('seeds published from draft when published is absent', async () => {
    // 1st call: published read → NoSuchKey; 2nd call: draft read → a config
    downloadJSON
      .mockRejectedValueOnce(NoSuchKey())
      .mockResolvedValueOnce({ pages: [], updatedAt: 42 })
    const seeded = await ensurePublishedSeeded('u1')
    expect(uploadJSON).toHaveBeenCalledWith('users/u1/site-config.published.json', expect.objectContaining({ publishedAt: 42 }))
    expect(seeded.publishedAt).toBe(42)
  })

  it('returns null when there is no draft either', async () => {
    downloadJSON.mockRejectedValue(NoSuchKey())
    expect(await ensurePublishedSeeded('u1')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/common/siteConfig.test.js -t "ensurePublishedSeeded|computeHasUnpublishedChanges"`
Expected: FAIL — functions not exported.

- [ ] **Step 3: Implement**

Add to `common/siteConfig.js` (reuse the existing normalization helper used by `readSiteConfig`; extract it if needed):

```js
import { getUserSiteConfigPath, getUserPublishedConfigPath } from './gcsUser'

// Same normalization pipeline readSiteConfig applies, factored out for reuse.
function normalizeConfig(config) {
  return migrateSiteConfigThemes(normalizePrintStore(dropSeededHomePage({
    ...config,
    pages: (config.pages || []).map((page) => normalizePageEntity(page)),
  })))
}

export function computeHasUnpublishedChanges(draft, published) {
  if (!published) return true
  return (draft?.updatedAt ?? 0) > (published?.publishedAt ?? 0)
}

export async function writePublishedSiteConfig(userId, config, publishedAt) {
  await uploadJSON(getUserPublishedConfigPath(userId), {
    ...config,
    publishedAt,
    pages: (config.pages || []).map((page) => normalizePageEntity(page)),
  })
}

export async function ensurePublishedSeeded(userId) {
  const draft = await readSiteConfig(userId)
  if (!draft) return null
  const publishedAt = draft.updatedAt ?? Date.now()
  await writePublishedSiteConfig(userId, draft, publishedAt)
  return { ...draft, publishedAt }
}

export async function readPublishedSiteConfig(userId) {
  try {
    const config = await downloadJSON(getUserPublishedConfigPath(userId))
    return normalizeConfig(config)
  } catch (err) {
    if (err?.name === 'NoSuchKey' || err?.Code === 'NoSuchKey') {
      return await ensurePublishedSeeded(userId)
    }
    throw err
  }
}
```

Refactor `readSiteConfig` to call `normalizeConfig` (behavior-preserving) so the two stay in sync.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/common/siteConfig.test.js`
Expected: PASS (all existing siteConfig tests still green).

- [ ] **Step 5: Commit**

```bash
git add common/siteConfig.js __tests__/common/siteConfig.test.js
git commit -m "feat(config): published read/write, seed-on-read migration, dirty compute"
```

---

### Task 4: Publish orchestration (write both + snapshot + prune)

**Files:**
- Create: `common/publishConfig.js`
- Test: `__tests__/common/publishConfig.test.js`

**Interfaces:**
- Consumes: `writeSiteConfig` (Task 2), `writePublishedSiteConfig` (Task 3), `getUserHistoryPrefix`/`getUserHistoryPath` (Task 1), `uploadJSON`/`listFiles`/`deleteFiles` from `common/gcsClient`.
- Produces:
  - `publishSiteConfig(userId, config): Promise<{ publishedAt: number }>` — with one `ts = Date.now()`: writes draft (`updatedAt: ts`), published (`publishedAt: ts`), a history snapshot, then prunes to 20.
  - `pruneHistory(userId, keep = 20): Promise<void>` — deletes all but the newest `keep` publish snapshots directly under `history/` (ignores the `history/autosave/` subfolder).

- [ ] **Step 1: Write the failing test**

Create `__tests__/common/publishConfig.test.js`:

```js
jest.mock('../../common/gcsClient', () => ({
  uploadJSON: jest.fn(),
  listFiles: jest.fn(),
  deleteFiles: jest.fn(),
  downloadJSON: jest.fn(),
}))
jest.mock('../../common/siteConfig', () => ({
  writeSiteConfig: jest.fn(),
  writePublishedSiteConfig: jest.fn(),
}))
jest.mock('../../common/gcsUser', () => ({
  getUserHistoryPrefix: (u) => `users/${u}/history/`,
  getUserHistoryPath: (u, ts) => `users/${u}/history/site-config-${ts}.json`,
}))

import { uploadJSON, listFiles, deleteFiles } from '../../common/gcsClient'
import { writeSiteConfig, writePublishedSiteConfig } from '../../common/siteConfig'
import { publishSiteConfig, pruneHistory } from '../../common/publishConfig'

describe('publishSiteConfig', () => {
  beforeEach(() => {
    uploadJSON.mockReset(); listFiles.mockReset(); deleteFiles.mockReset()
    writeSiteConfig.mockReset(); writePublishedSiteConfig.mockReset()
    listFiles.mockResolvedValue([])
  })

  it('writes draft and published with the same timestamp and a snapshot', async () => {
    const spy = jest.spyOn(Date, 'now').mockReturnValue(500)
    const cfg = { pages: [] }
    const res = await publishSiteConfig('u1', cfg)
    expect(res).toEqual({ publishedAt: 500 })
    expect(writeSiteConfig).toHaveBeenCalledWith('u1', cfg, { updatedAt: 500 })
    expect(writePublishedSiteConfig).toHaveBeenCalledWith('u1', cfg, 500)
    expect(uploadJSON).toHaveBeenCalledWith('users/u1/history/site-config-500.json', cfg)
    spy.mockRestore()
  })
})

describe('pruneHistory', () => {
  beforeEach(() => { listFiles.mockReset(); deleteFiles.mockReset() })

  it('keeps the newest N and deletes older publish snapshots', async () => {
    const keys = Array.from({ length: 23 }, (_, i) => `users/u1/history/site-config-${1000 + i}.json`)
    // include an autosave file that must be ignored by publish prune
    listFiles.mockResolvedValue([...keys, 'users/u1/history/autosave/site-config-1.json'])
    await pruneHistory('u1', 20)
    const deleted = deleteFiles.mock.calls[0][0]
    expect(deleted).toHaveLength(3)
    expect(deleted).toEqual(expect.arrayContaining([
      'users/u1/history/site-config-1000.json',
      'users/u1/history/site-config-1001.json',
      'users/u1/history/site-config-1002.json',
    ]))
    expect(deleted).not.toContain('users/u1/history/autosave/site-config-1.json')
  })

  it('does nothing when at or under the cap', async () => {
    listFiles.mockResolvedValue(['users/u1/history/site-config-1000.json'])
    await pruneHistory('u1', 20)
    expect(deleteFiles).not.toHaveBeenCalled()
  })
})
```

> Note: `listFiles` returns an array of key strings (confirm the exact return shape of `common/gcsClient.listFiles` during implementation — it may return objects with a `.key`/`.Key`; adapt the filter/sort accordingly and keep the test in sync).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/common/publishConfig.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `common/publishConfig.js`:

```js
// Server-side only. Orchestrates a publish: persist the draft, write the
// published snapshot the public site reads, archive a history snapshot, prune.
import { uploadJSON, listFiles, deleteFiles } from './gcsClient'
import { writeSiteConfig, writePublishedSiteConfig } from './siteConfig'
import { getUserHistoryPrefix, getUserHistoryPath } from './gcsUser'

const PUBLISH_SNAPSHOT_RE = /\/history\/site-config-(\d+)\.json$/

export async function pruneHistory(userId, keep = 20) {
  const raw = await listFiles(getUserHistoryPrefix(userId))
  const keys = raw.map(k => (typeof k === 'string' ? k : (k.key || k.Key)))
  const snaps = keys
    .map(key => {
      const m = key && key.match(PUBLISH_SNAPSHOT_RE)
      return m ? { key, ts: Number(m[1]) } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.ts - b.ts)
  const excess = snaps.slice(0, Math.max(0, snaps.length - keep)).map(s => s.key)
  if (excess.length) await deleteFiles(excess)
}

export async function publishSiteConfig(userId, config) {
  const ts = Date.now()
  await writeSiteConfig(userId, config, { updatedAt: ts })
  await writePublishedSiteConfig(userId, config, ts)
  await uploadJSON(getUserHistoryPath(userId, ts), config)
  await pruneHistory(userId, 20)
  return { publishedAt: ts }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/common/publishConfig.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/publishConfig.js __tests__/common/publishConfig.test.js
git commit -m "feat(config): publish orchestration with capped history snapshots"
```

---

### Task 5: Publish API route

**Files:**
- Create: `pages/api/admin/publish.js`
- Test: `__tests__/api/publish.route.test.js`

**Interfaces:**
- Consumes: `publishSiteConfig` (Task 4), `withAuth` (`common/withAuth`).
- Produces: `handler(req, res, user)` (named export) + `export default withAuth(handler)`. `POST` with body = config → `{ ok: true, publishedAt }`. Rejects non-POST with 405, invalid config (no `pages` array) with 400.

- [ ] **Step 1: Write the failing test**

Create `__tests__/api/publish.route.test.js`:

```js
/** @jest-environment node */
const mockPublish = jest.fn()
jest.mock('../../common/publishConfig', () => ({ publishSiteConfig: (...a) => mockPublish(...a) }))
jest.mock('../../common/withAuth', () => ({ withAuth: (h) => h }))

import { handler } from '../../pages/api/admin/publish'

const res = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() })
const USER = { id: 'u1' }

describe('POST /api/admin/publish', () => {
  beforeEach(() => { mockPublish.mockReset(); mockPublish.mockResolvedValue({ publishedAt: 777 }) })

  it('publishes the posted config and returns publishedAt', async () => {
    const r = res()
    await handler({ method: 'POST', body: { pages: [] } }, r, USER)
    expect(mockPublish).toHaveBeenCalledWith('u1', { pages: [] })
    expect(r.status).toHaveBeenCalledWith(200)
    expect(r.json).toHaveBeenCalledWith({ ok: true, publishedAt: 777 })
  })

  it('rejects a config without a pages array', async () => {
    const r = res()
    await handler({ method: 'POST', body: {} }, r, USER)
    expect(r.status).toHaveBeenCalledWith(400)
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('rejects non-POST', async () => {
    const r = res()
    await handler({ method: 'GET' }, r, USER)
    expect(r.status).toHaveBeenCalledWith(405)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/api/publish.route.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `pages/api/admin/publish.js`:

```js
import { withAuth } from '../../../common/withAuth'
import { publishSiteConfig } from '../../../common/publishConfig'

export async function handler(req, res, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const config = req.body
  if (!config || !Array.isArray(config.pages)) {
    return res.status(400).json({ error: 'Invalid config: must have pages array' })
  }
  try {
    const { publishedAt } = await publishSiteConfig(user.id, config)
    return res.status(200).json({ ok: true, publishedAt })
  } catch (err) {
    console.error('POST /api/admin/publish error:', err)
    return res.status(500).json({ error: err.message })
  }
}

export default withAuth(handler)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/api/publish.route.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pages/api/admin/publish.js __tests__/api/publish.route.test.js
git commit -m "feat(api): POST /api/admin/publish endpoint"
```

---

### Task 6: Editor GET returns dirty flag + seeds published

**Files:**
- Modify: `pages/api/admin/site-config.js` (GET branch)
- Test: `__tests__/api/site-config.route.test.js`

**Interfaces:**
- Consumes: `readSiteConfig`, `readPublishedSiteConfig`, `computeHasUnpublishedChanges` (Task 3), `createDefaultSiteConfig`, `writeSiteConfig`.
- Produces: GET response shape becomes `{ config, hasUnpublishedChanges, lastPublishedAt }` (was the bare config). PUT branch unchanged.

- [ ] **Step 0: Find all GET consumers**

Run: `grep -rn "/api/admin/site-config" pages components --include=*.js | grep -v "method: 'PUT'"`
Every consumer that reads the GET response must be updated to the new `{ config, ... }` shape in this task or Task 8. (Expected: the studio load effect — Task 8. Note any others here.)

- [ ] **Step 1: Write the failing test**

Create `__tests__/api/site-config.route.test.js`:

```js
/** @jest-environment node */
const mockRead = jest.fn()
const mockReadPublished = jest.fn()
jest.mock('../../common/siteConfig', () => ({
  readSiteConfig: (...a) => mockRead(...a),
  readPublishedSiteConfig: (...a) => mockReadPublished(...a),
  writeSiteConfig: jest.fn(),
  createDefaultSiteConfig: jest.fn(() => ({ pages: [], updatedAt: 1 })),
  computeHasUnpublishedChanges: (d, p) => !p || (d?.updatedAt ?? 0) > (p?.publishedAt ?? 0),
}))
jest.mock('../../common/userProfile', () => ({ readUserProfile: jest.fn(() => null) }))
jest.mock('../../common/withAuth', () => ({ withAuth: (h) => h }))

import { handler } from '../../pages/api/admin/site-config'

const res = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() })
const USER = { id: 'u1', name: 'X' }

describe('GET /api/admin/site-config', () => {
  beforeEach(() => { mockRead.mockReset(); mockReadPublished.mockReset() })

  it('returns config + hasUnpublishedChanges=false when draft not newer than published', async () => {
    mockRead.mockResolvedValue({ pages: [], updatedAt: 5 })
    mockReadPublished.mockResolvedValue({ pages: [], publishedAt: 5 })
    const r = res()
    await handler({ method: 'GET' }, r, USER)
    const payload = r.json.mock.calls[0][0]
    expect(payload.hasUnpublishedChanges).toBe(false)
    expect(payload.lastPublishedAt).toBe(5)
    expect(payload.config).toEqual({ pages: [], updatedAt: 5 })
  })

  it('returns hasUnpublishedChanges=true when draft is newer', async () => {
    mockRead.mockResolvedValue({ pages: [], updatedAt: 9 })
    mockReadPublished.mockResolvedValue({ pages: [], publishedAt: 5 })
    const r = res()
    await handler({ method: 'GET' }, r, USER)
    expect(r.json.mock.calls[0][0].hasUnpublishedChanges).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/api/site-config.route.test.js`
Expected: FAIL — response is the bare config; also `handler` may not be exported yet.

- [ ] **Step 3: Implement**

In `pages/api/admin/site-config.js`: export the handler (`export async function handler(...)` + keep `export default withAuth(handler)`), and rewrite the GET branch:

```js
if (req.method === 'GET') {
  try {
    let config = await readSiteConfig(user.id)
    if (!config) {
      const profile = await readUserProfile(user.id).catch(() => null)
      config = createDefaultSiteConfig(user.id, { displayName: profile?.displayName || user.name, bio: profile?.bio })
      await writeSiteConfig(user.id, config)
      config = await readSiteConfig(user.id) // re-read so it carries the stamped updatedAt
    }
    const published = await readPublishedSiteConfig(user.id) // seeds if absent
    return res.status(200).json({
      config,
      hasUnpublishedChanges: computeHasUnpublishedChanges(config, published),
      lastPublishedAt: published?.publishedAt ?? null,
    })
  } catch (err) {
    console.error('GET /api/admin/site-config error:', err)
    return res.status(500).json({ error: err.message })
  }
}
```

Add `readPublishedSiteConfig` + `computeHasUnpublishedChanges` to the import from `common/siteConfig`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/api/site-config.route.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pages/api/admin/site-config.js __tests__/api/site-config.route.test.js
git commit -m "feat(api): site-config GET returns publish/dirty state and seeds published"
```

---

### Task 7: Public site reads the published config

**Files:**
- Modify: `pages/sites/[username]/[slug].js` (~line 58)
- Modify: `pages/sites/[username]/index.js` (~line 62)
- Modify: `pages/sites/[username]/[slug]/slideshow.js` (~line 34)

**Interfaces:**
- Consumes: `readPublishedSiteConfig` (Task 3) in place of `readSiteConfig`.

- [ ] **Step 1: Swap the read in all three public pages**

In each file, change the import and call from `readSiteConfig` to `readPublishedSiteConfig`. Example (`[slug].js`):

```js
import { readPublishedSiteConfig } from '../../../common/siteConfig'
// ...
readPublishedSiteConfig(lookup.userId),
```

Keep the surrounding `Promise.all`/args identical. Do the same in `index.js` and `[slug]/slideshow.js` (mind the relative import depth: `slideshow.js` uses `../../../../common/siteConfig`).

- [ ] **Step 2: Verify the full suite still passes**

Run: `npx jest`
Expected: PASS (no test imports these pages directly; this guards against typos/regressions).

- [ ] **Step 3: Manual verification (dev server on :3000)**

- Publish once (after Task 8) or manually confirm `readPublishedSiteConfig` seeds: load a public site URL, confirm it renders the current content (seed-from-draft path).
- Edit + autosave in the studio, reload the public URL → should still show the OLD (published) content until Publish.

- [ ] **Step 4: Commit**

```bash
git add pages/sites/
git commit -m "feat(sites): public pages read the published config, not the draft"
```

---

### Task 8: Studio wires publish + initializes dirty state from load

**Files:**
- Modify: `pages/studio/index.js` (load effect ~200-230; `onPublish` ~494; add `publishing` state)
- Modify: `components/admin/platform/PlatformSidebar.js` (publish button — verify `disabled`/`publishing` wiring, ~line 850)

**Interfaces:**
- Consumes: GET `{ config, hasUnpublishedChanges, lastPublishedAt }` (Task 6); POST `/api/admin/publish` (Task 5); existing `siteConfigRef` (added by the undo feature), `autosaveTimer`, `pendingConfigRef`.

- [ ] **Step 1: Initialize dirty state from the load response**

In the load effect, change the response handling to the new shape:

```js
.then(payload => {
  const config = payload.config ?? payload  // tolerate old shape during rollout
  setSiteConfig(config)
  setHasUnpublishedChanges(!!payload.hasUnpublishedChanges)
  setLastPublishedAt(payload.lastPublishedAt ?? null)
  setLoading(false)
  // ... existing view-restore logic unchanged, using `config` ...
})
```

- [ ] **Step 2: Add `publishing` state and a real publish handler**

Near the other `useState`s:

```js
const [publishing, setPublishing] = useState(false)
```

Replace the `onPublish` prop:

```js
onPublish={async () => {
  // Publish the exact current draft; cancel any pending autosave so a late
  // debounced write can't bump updatedAt past publishedAt and re-dirty it.
  clearTimeout(autosaveTimer.current)
  autosaveTimer.current = null
  pendingConfigRef.current = null
  firstPendingAt.current = null
  setPublishing(true)
  try {
    const res = await fetch('/api/admin/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(siteConfigRef.current),
    })
    if (!res.ok) throw new Error(`Publish failed: ${res.status}`)
    const { publishedAt } = await res.json()
    setHasUnpublishedChanges(false)
    setLastPublishedAt(publishedAt)
  } catch (err) {
    console.error('Publish failed:', err)
  } finally {
    setPublishing(false)
  }
}}
```

Pass `publishing={publishing}` to `PlatformSidebar` if it isn't already derived internally.

- [ ] **Step 3: Verify the publish button wiring in PlatformSidebar**

Confirm `disabled={!hasUnpublishedChanges || publishing}` still holds and that `publishing` shows a spinner/label. Adjust the prop plumbing so `publishing` comes from the studio.

- [ ] **Step 4: Manual verification (dev server on :3000)**

- Load studio fresh → Publish disabled (nothing changed since seed).
- Edit something → Publish enables; **refresh** → Publish is STILL enabled (dirty survives refresh — the original bug).
- Click Publish → button disables; **refresh** → stays disabled.
- Public URL reflects content only after Publish.

- [ ] **Step 5: Commit**

```bash
git add pages/studio/index.js components/admin/platform/PlatformSidebar.js
git commit -m "feat(studio): real Publish (writes published) + dirty state survives refresh"
```

---

### Task 9 (optional, recommended): Snapshot on autosave overwrite (Tier 1b)

**Files:**
- Modify: `common/gcsUser.js` (+ `getUserAutosaveHistoryPrefix`, `getUserAutosaveHistoryPath`) + test
- Modify: `common/siteConfig.js` `writeSiteConfig` to archive the prior draft before overwrite; cap at 10
- Test: `__tests__/common/siteConfig.test.js`

**Interfaces:**
- Produces: `getUserAutosaveHistoryPrefix(userId)` → `users/{id}/history/autosave/`; `getUserAutosaveHistoryPath(userId, ts)` → `users/{id}/history/autosave/site-config-{ts}.json`.

- [ ] **Step 1: Decide scope with the user before building.** This is the "recover work clobbered between publishes" net. It adds a read+write per autosave (cost/latency). Only build if the user opts in; otherwise stop after Task 8. If built: before overwriting the draft, download the current draft and copy it to the autosave history prefix, then prune to the newest 10. Mirror the Task 4 prune logic (reuse a shared prune-by-prefix helper). Full TDD steps to be filled in at implementation time once scope is confirmed.

---

## Self-Review

**Spec coverage:**
- Storage model (draft/published/history paths) → Tasks 1, 3, 4. ✓
- Server-owned timestamps + dirty compute → Tasks 2, 3. ✓
- Publish endpoint (write both + snapshot + prune) → Tasks 4, 5. ✓
- Editor GET dirty flag + seed-on-read migration → Task 6 (+ seeding also in Task 3's `readPublishedSiteConfig`). ✓
- Public read path switch → Task 7. ✓
- Studio init-from-load + async publish + publishing state → Task 8. ✓
- Tier 1b autosave snapshot → Task 9 (optional, gated). ✓
- Tier 2 restore UI → explicitly out of scope in spec; no task. ✓
- Bucket lock hardening → ops/optional in spec; no task. ✓

**Placeholder scan:** Task 9 intentionally defers its TDD steps pending an opt-in decision (flagged, not a hidden placeholder). All other tasks contain concrete test + implementation code.

**Type consistency:** `writeSiteConfig(userId, config, { updatedAt })`, `writePublishedSiteConfig(userId, config, publishedAt)`, `readPublishedSiteConfig(userId)`, `ensurePublishedSeeded(userId)`, `computeHasUnpublishedChanges(draft, published)`, `publishSiteConfig(userId, config) → { publishedAt }`, `pruneHistory(userId, keep)` — names/signatures match across Tasks 2–8. GET response `{ config, hasUnpublishedChanges, lastPublishedAt }` consumed consistently in Tasks 6 and 8.

## Open verification notes (resolve during implementation)

- **`listFiles` return shape** — confirm whether `common/gcsClient.listFiles(prefix)` returns key strings or objects; adapt `pruneHistory`'s mapping + the Task 4 test accordingly.
- **GET consumers** — Task 6 Step 0 must catch every reader of the GET response before changing its shape.
- **Publish payload size** — `POST /api/admin/publish` sends the full config; confirm Next's default body size limit is sufficient (configs are small; raise `bodyParser` limit only if a large site trips it).
