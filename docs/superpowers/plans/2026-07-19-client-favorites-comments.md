# Client Favorites, Comments & Watermark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clients on a published gallery page can heart photos and leave per-photo comments (identity asked once: name required, email optional), the photographer sees activity in the sidebar bell and gets an email on selection submit, and a watermark toggle overlays branding on public photos.

**Architecture:** A per-page engagement JSON in R2 (`users/{userId}/client-data/{pageId}.json`) written through a pure `applyEngagementAction` reducer. One public API route (GET/POST, no auth, feature-gated, emails redacted on GET) and one admin feed route (withAuth). On the client, a `ClientEngagementProvider` context wraps the public `Gallery` (mirroring `PrintStoreProvider`); tiles render a self-gating `EngagementActions` component exactly where they already render `BuyPrintButton`. The provider centrally renders the identity prompt, comments panel, and submit pill.

**Tech Stack:** Next.js pages router, React 18, Jest (`@/` alias, CJS-style mocks — see `__tests__/library/deleteFiles.route.test.js` for the house pattern), R2 via `common/gcsClient.js`, nodemailer via `common/email/mailer.js`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-19-client-favorites-comments-design.md`
- Public GET must NEVER return client emails.
- Server-side caps: name ≤ 100 chars, email ≤ 200, comment text ≤ 1000; favorites array ≤ 5000, comments ≤ 2000 entries per page.
- localStorage keys: identity `sepia:client-identity:{username}`, bell last-seen `sepia:notif-last-seen`.
- Feature gating: every public write validates the specific toggle on `page.clientFeatures` server-side; UI components additionally self-gate (render null) so admin preview and feature-off pages are untouched.
- Buttons with inline `background` must use onMouseEnter/onMouseLeave for hover states (Tailwind `hover:` classes silently lose to inline styles in this codebase).
- Never run `next build` in this workspace (a live `next dev` owns `.next` on port 3000). Verify with `npm test` and targeted jest runs only.
- All engagement UI is public-page only. The editor preview must be unaffected (provider is only mounted in `pages/sites/`).

---

### Task 1: Engagement store module (pure reducer + R2 I/O)

**Files:**
- Create: `common/clientEngagement.js`
- Test: `__tests__/client-engagement/clientEngagement.test.js`

**Interfaces:**
- Produces:
  - `getClientDataPath(userId, pageId) → string`
  - `emptyEngagement() → { people: {}, favorites: [], comments: [], submissions: [] }`
  - `applyEngagementAction(data, action) → data` (returns NEW object; throws `Error` with `.status = 400` on invalid input; action shapes below)
  - `readEngagement(userId, pageId) → Promise<data>` (missing file → `emptyEngagement()`)
  - `writeEngagement(userId, pageId, data) → Promise<void>`
  - Limits exported as `LIMITS = { NAME: 100, EMAIL: 200, COMMENT: 1000, MAX_FAVORITES: 5000, MAX_COMMENTS: 2000 }`

Action shapes (all include `deviceId` string, `ts` number set by the route):
- `{ type: 'identify', deviceId, ts, name, email }` — upserts `people[deviceId] = { name, email: email || '', firstSeen }` (preserves existing `firstSeen`)
- `{ type: 'favorite', deviceId, ts, photoUrl }` — appends `{ photoUrl, deviceId, ts }` if not already present for that (photoUrl, deviceId)
- `{ type: 'unfavorite', deviceId, ts, photoUrl }` — removes that pair
- `{ type: 'comment', deviceId, ts, photoUrl, text }` — appends `{ id, photoUrl, deviceId, text, ts }`, id = `c_${ts}_${random 6 alnum}`
- `{ type: 'submit', deviceId, ts }` — appends `{ deviceId, ts, count }` where count = this device's current favorites

- [ ] **Step 1: Write the failing test**

```js
// __tests__/client-engagement/clientEngagement.test.js
import {
  emptyEngagement,
  applyEngagementAction,
  getClientDataPath,
  LIMITS,
} from '@/common/clientEngagement'

describe('applyEngagementAction', () => {
  const base = () => emptyEngagement()

  it('builds the client-data path', () => {
    expect(getClientDataPath('u1', 'p1')).toBe('users/u1/client-data/p1.json')
  })

  it('identify upserts a person and preserves firstSeen', () => {
    let d = applyEngagementAction(base(), { type: 'identify', deviceId: 'd1', ts: 100, name: 'Priya', email: 'p@x.com' })
    expect(d.people.d1).toEqual({ name: 'Priya', email: 'p@x.com', firstSeen: 100 })
    d = applyEngagementAction(d, { type: 'identify', deviceId: 'd1', ts: 200, name: 'Priya S', email: '' })
    expect(d.people.d1.firstSeen).toBe(100)
    expect(d.people.d1.name).toBe('Priya S')
  })

  it('favorite is idempotent per (photoUrl, deviceId); unfavorite removes', () => {
    let d = base()
    d = applyEngagementAction(d, { type: 'favorite', deviceId: 'd1', ts: 1, photoUrl: 'https://cdn/a.jpg' })
    d = applyEngagementAction(d, { type: 'favorite', deviceId: 'd1', ts: 2, photoUrl: 'https://cdn/a.jpg' })
    expect(d.favorites).toHaveLength(1)
    d = applyEngagementAction(d, { type: 'favorite', deviceId: 'd2', ts: 3, photoUrl: 'https://cdn/a.jpg' })
    expect(d.favorites).toHaveLength(2)
    d = applyEngagementAction(d, { type: 'unfavorite', deviceId: 'd1', ts: 4, photoUrl: 'https://cdn/a.jpg' })
    expect(d.favorites).toEqual([{ photoUrl: 'https://cdn/a.jpg', deviceId: 'd2', ts: 3 }])
  })

  it('comment appends with generated id and trims text', () => {
    const d = applyEngagementAction(base(), { type: 'comment', deviceId: 'd1', ts: 5, photoUrl: 'https://cdn/a.jpg', text: '  love this  ' })
    expect(d.comments).toHaveLength(1)
    expect(d.comments[0]).toMatchObject({ photoUrl: 'https://cdn/a.jpg', deviceId: 'd1', text: 'love this', ts: 5 })
    expect(d.comments[0].id).toMatch(/^c_5_/)
  })

  it('submit records the count of that device favorites', () => {
    let d = base()
    d = applyEngagementAction(d, { type: 'favorite', deviceId: 'd1', ts: 1, photoUrl: 'https://cdn/a.jpg' })
    d = applyEngagementAction(d, { type: 'favorite', deviceId: 'd1', ts: 2, photoUrl: 'https://cdn/b.jpg' })
    d = applyEngagementAction(d, { type: 'favorite', deviceId: 'd2', ts: 3, photoUrl: 'https://cdn/a.jpg' })
    d = applyEngagementAction(d, { type: 'submit', deviceId: 'd1', ts: 9 })
    expect(d.submissions).toEqual([{ deviceId: 'd1', ts: 9, count: 2 }])
  })

  it('rejects bad input with status 400', () => {
    const cases = [
      { type: 'nope', deviceId: 'd1', ts: 1 },
      { type: 'favorite', deviceId: '', ts: 1, photoUrl: 'x' },
      { type: 'favorite', deviceId: 'd1', ts: 1, photoUrl: '' },
      { type: 'comment', deviceId: 'd1', ts: 1, photoUrl: 'x', text: '' },
      { type: 'comment', deviceId: 'd1', ts: 1, photoUrl: 'x', text: 'a'.repeat(LIMITS.COMMENT + 1) },
      { type: 'identify', deviceId: 'd1', ts: 1, name: '', email: '' },
      { type: 'identify', deviceId: 'd1', ts: 1, name: 'a'.repeat(LIMITS.NAME + 1), email: '' },
    ]
    for (const action of cases) {
      let err
      try { applyEngagementAction(emptyEngagement(), action) } catch (e) { err = e }
      expect(err).toBeTruthy()
      expect(err.status).toBe(400)
    }
  })

  it('does not mutate its input', () => {
    const d = base()
    applyEngagementAction(d, { type: 'favorite', deviceId: 'd1', ts: 1, photoUrl: 'https://cdn/a.jpg' })
    expect(d.favorites).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/client-engagement/clientEngagement.test.js`
Expected: FAIL — cannot find module `@/common/clientEngagement`

- [ ] **Step 3: Write the implementation**

```js
// common/clientEngagement.js
// Per-page client engagement (favorites, comments, submissions) stored as one
// JSON per page in R2. applyEngagementAction is a pure reducer so validation
// and shape logic are testable without I/O. Read-modify-write is unlocked —
// acceptable at client-gallery volumes.
import { downloadJSON, uploadJSON } from './gcsClient'

export const LIMITS = { NAME: 100, EMAIL: 200, COMMENT: 1000, MAX_FAVORITES: 5000, MAX_COMMENTS: 2000 }

export function getClientDataPath(userId, pageId) {
  return `users/${userId}/client-data/${pageId}.json`
}

export function emptyEngagement() {
  return { people: {}, favorites: [], comments: [], submissions: [] }
}

function bad(message) {
  const err = new Error(message)
  err.status = 400
  return err
}

export function applyEngagementAction(data, action) {
  const { type, deviceId, ts } = action || {}
  if (!deviceId || typeof deviceId !== 'string' || deviceId.length > 64) throw bad('invalid deviceId')
  if (typeof ts !== 'number') throw bad('invalid ts')

  const next = {
    people: { ...data.people },
    favorites: [...data.favorites],
    comments: [...data.comments],
    submissions: [...data.submissions],
  }

  if (type === 'identify') {
    const name = String(action.name || '').trim()
    const email = String(action.email || '').trim()
    if (!name || name.length > LIMITS.NAME) throw bad('invalid name')
    if (email.length > LIMITS.EMAIL) throw bad('invalid email')
    const existing = next.people[deviceId]
    next.people[deviceId] = { name, email, firstSeen: existing?.firstSeen ?? ts }
    return next
  }

  if (type === 'favorite' || type === 'unfavorite') {
    const photoUrl = String(action.photoUrl || '')
    if (!photoUrl) throw bad('invalid photoUrl')
    const has = next.favorites.some(f => f.photoUrl === photoUrl && f.deviceId === deviceId)
    if (type === 'favorite') {
      if (next.favorites.length >= LIMITS.MAX_FAVORITES) throw bad('too many favorites')
      if (!has) next.favorites.push({ photoUrl, deviceId, ts })
    } else {
      next.favorites = next.favorites.filter(f => !(f.photoUrl === photoUrl && f.deviceId === deviceId))
    }
    return next
  }

  if (type === 'comment') {
    const photoUrl = String(action.photoUrl || '')
    const text = String(action.text || '').trim()
    if (!photoUrl) throw bad('invalid photoUrl')
    if (!text || text.length > LIMITS.COMMENT) throw bad('invalid comment')
    if (next.comments.length >= LIMITS.MAX_COMMENTS) throw bad('too many comments')
    const id = `c_${ts}_${Math.random().toString(36).slice(2, 8)}`
    next.comments.push({ id, photoUrl, deviceId, text, ts })
    return next
  }

  if (type === 'submit') {
    const count = next.favorites.filter(f => f.deviceId === deviceId).length
    next.submissions.push({ deviceId, ts, count })
    return next
  }

  throw bad('unknown action')
}

export async function readEngagement(userId, pageId) {
  try {
    const data = await downloadJSON(getClientDataPath(userId, pageId))
    return { ...emptyEngagement(), ...data }
  } catch {
    return emptyEngagement()
  }
}

export async function writeEngagement(userId, pageId, data) {
  await uploadJSON(getClientDataPath(userId, pageId), data)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/client-engagement/clientEngagement.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add common/clientEngagement.js __tests__/client-engagement/clientEngagement.test.js
git commit -m "feat(client): engagement store with pure action reducer"
```

---

### Task 2: Public engagement API route

**Files:**
- Create: `pages/api/client/engagement.js`
- Test: `__tests__/client-engagement/engagement.route.test.js`

**Interfaces:**
- Consumes: Task 1 (`readEngagement`, `writeEngagement`, `applyEngagementAction`, `emptyEngagement`), `lookupUserByUsername(username) → { userId } | null` from `@/common/userProfile`, `readSiteConfig(userId)` from `@/common/siteConfig`, `sendMail({ to, subject, html, text })` from `@/common/email/mailer`.
- Produces:
  - `GET /api/client/engagement?username={u}&pageId={p}` → 200 `{ people: { [deviceId]: { name } }, favorites, comments, submissions }` — emails stripped. 404 unknown username/page; 404 when `clientFeatures.enabled` is falsy.
  - `POST /api/client/engagement` body `{ username, pageId, deviceId, action, photoUrl?, name?, email?, text? }` where `action ∈ identify|favorite|unfavorite|comment|submit` → 200 `{ ok: true }`. Gating: favorite/unfavorite need `favorites.enabled`; comment needs `comments.enabled`; submit needs `favorites.enabled && favorites.submitWorkflow`; identify needs favorites OR comments enabled. requireEmail: favorite/comment actions 400 with `{ error: 'email required' }` when the toggle is on and `people[deviceId]` has no email. Submit sends one email to `siteConfig.contact?.email` (skip silently when absent) listing the device's favorited photo URLs and the person's name.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/client-engagement/engagement.route.test.js
const mockLookup = jest.fn()
jest.mock('@/common/userProfile', () => ({ lookupUserByUsername: (...a) => mockLookup(...a) }))

const mockReadSiteConfig = jest.fn()
jest.mock('@/common/siteConfig', () => ({ readSiteConfig: (...a) => mockReadSiteConfig(...a) }))

const mockRead = jest.fn()
const mockWrite = jest.fn().mockResolvedValue(undefined)
jest.mock('@/common/clientEngagement', () => {
  const actual = jest.requireActual('@/common/clientEngagement')
  return { ...actual, readEngagement: (...a) => mockRead(...a), writeEngagement: (...a) => mockWrite(...a) }
})

const mockSendMail = jest.fn().mockResolvedValue({ sent: true })
jest.mock('@/common/email/mailer', () => ({ sendMail: (...a) => mockSendMail(...a) }))

import handler from '@/pages/api/client/engagement'
import { emptyEngagement } from '@/common/clientEngagement'

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
}

const CF = { enabled: true, favorites: { enabled: true, requireEmail: false, submitWorkflow: true }, comments: { enabled: true, requireEmail: false } }

function siteWith(cf) {
  return { contact: { email: 'photog@x.com' }, pages: [{ id: 'p1', slug: 'wedding', title: 'Wedding', clientFeatures: cf }] }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockLookup.mockResolvedValue({ userId: 'u1' })
  mockReadSiteConfig.mockResolvedValue(siteWith(CF))
  mockRead.mockResolvedValue(emptyEngagement())
})

describe('GET /api/client/engagement', () => {
  it('404s unknown username', async () => {
    mockLookup.mockResolvedValue(null)
    const res = mockRes()
    await handler({ method: 'GET', query: { username: 'nope', pageId: 'p1' } }, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('404s when client features are disabled', async () => {
    mockReadSiteConfig.mockResolvedValue(siteWith({ ...CF, enabled: false }))
    const res = mockRes()
    await handler({ method: 'GET', query: { username: 'u', pageId: 'p1' } }, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('returns engagement with emails stripped', async () => {
    mockRead.mockResolvedValue({
      people: { d1: { name: 'Priya', email: 'secret@x.com', firstSeen: 1 } },
      favorites: [{ photoUrl: 'https://cdn/a.jpg', deviceId: 'd1', ts: 1 }],
      comments: [], submissions: [],
    })
    const res = mockRes()
    await handler({ method: 'GET', query: { username: 'u', pageId: 'p1' } }, res)
    expect(res.status).toHaveBeenCalledWith(200)
    const body = res.json.mock.calls[0][0]
    expect(body.people.d1).toEqual({ name: 'Priya' })
    expect(JSON.stringify(body)).not.toContain('secret@x.com')
    expect(body.favorites).toHaveLength(1)
  })

  it('resolves page by slug too', async () => {
    const res = mockRes()
    await handler({ method: 'GET', query: { username: 'u', pageId: 'wedding' } }, res)
    expect(res.status).toHaveBeenCalledWith(200)
  })
})

describe('POST /api/client/engagement', () => {
  it('favorites a photo and persists', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: { username: 'u', pageId: 'p1', deviceId: 'd1', action: 'favorite', photoUrl: 'https://cdn/a.jpg' } }, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(mockWrite).toHaveBeenCalledWith('u1', 'p1', expect.objectContaining({
      favorites: [expect.objectContaining({ photoUrl: 'https://cdn/a.jpg', deviceId: 'd1' })],
    }))
  })

  it('rejects comment when comments disabled', async () => {
    mockReadSiteConfig.mockResolvedValue(siteWith({ ...CF, comments: { enabled: false } }))
    const res = mockRes()
    await handler({ method: 'POST', body: { username: 'u', pageId: 'p1', deviceId: 'd1', action: 'comment', photoUrl: 'x', text: 'hi' } }, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(mockWrite).not.toHaveBeenCalled()
  })

  it('enforces requireEmail on favorite', async () => {
    mockReadSiteConfig.mockResolvedValue(siteWith({ ...CF, favorites: { ...CF.favorites, requireEmail: true } }))
    mockRead.mockResolvedValue({ ...emptyEngagement(), people: { d1: { name: 'P', email: '', firstSeen: 1 } } })
    const res = mockRes()
    await handler({ method: 'POST', body: { username: 'u', pageId: 'p1', deviceId: 'd1', action: 'favorite', photoUrl: 'https://cdn/a.jpg' } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json.mock.calls[0][0].error).toBe('email required')
  })

  it('submit emails the photographer with the selection', async () => {
    mockRead.mockResolvedValue({
      ...emptyEngagement(),
      people: { d1: { name: 'Priya', email: 'p@x.com', firstSeen: 1 } },
      favorites: [{ photoUrl: 'https://cdn/a.jpg', deviceId: 'd1', ts: 1 }],
    })
    const res = mockRes()
    await handler({ method: 'POST', body: { username: 'u', pageId: 'p1', deviceId: 'd1', action: 'submit' } }, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'photog@x.com' }))
    expect(mockSendMail.mock.calls[0][0].subject).toContain('Priya')
    expect(mockSendMail.mock.calls[0][0].subject).toContain('1')
  })

  it('rejects submit when submitWorkflow off', async () => {
    mockReadSiteConfig.mockResolvedValue(siteWith({ ...CF, favorites: { enabled: true, submitWorkflow: false } }))
    const res = mockRes()
    await handler({ method: 'POST', body: { username: 'u', pageId: 'p1', deviceId: 'd1', action: 'submit' } }, res)
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('propagates reducer validation as 400', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: { username: 'u', pageId: 'p1', deviceId: 'd1', action: 'comment', photoUrl: 'x', text: '' } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('405s other methods', async () => {
    const res = mockRes()
    await handler({ method: 'DELETE', query: {} }, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/client-engagement/engagement.route.test.js`
Expected: FAIL — cannot find module `@/pages/api/client/engagement`

- [ ] **Step 3: Write the implementation**

```js
// pages/api/client/engagement.js
// Public (unauthenticated) engagement endpoint. The page password is a
// client-side gate, not a security boundary — so this route only accepts
// writes for pages whose specific client feature is enabled, and never
// returns client emails on GET.
import { lookupUserByUsername } from '../../../common/userProfile'
import { readSiteConfig } from '../../../common/siteConfig'
import { readEngagement, writeEngagement, applyEngagementAction } from '../../../common/clientEngagement'
import { sendMail } from '../../../common/email/mailer'

async function resolvePage(username, pageId) {
  if (!username || !pageId) return null
  const lookup = await lookupUserByUsername(String(username))
  if (!lookup) return null
  const siteConfig = await readSiteConfig(lookup.userId)
  if (!siteConfig) return null
  const page = (siteConfig.pages || []).find(p => p.id === pageId || p.slug === pageId)
  if (!page || !page.clientFeatures?.enabled) return null
  return { userId: lookup.userId, siteConfig, page }
}

function actionAllowed(cf, action) {
  const fav = cf.favorites?.enabled
  const com = cf.comments?.enabled
  if (action === 'favorite' || action === 'unfavorite') return !!fav
  if (action === 'comment') return !!com
  if (action === 'submit') return !!(fav && cf.favorites?.submitWorkflow)
  if (action === 'identify') return !!(fav || com)
  return false
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { username, pageId } = req.query
      const ctx = await resolvePage(username, pageId)
      if (!ctx) return res.status(404).json({ error: 'Not found' })
      const data = await readEngagement(ctx.userId, ctx.page.id)
      const people = {}
      for (const [deviceId, person] of Object.entries(data.people || {})) {
        people[deviceId] = { name: person.name }
      }
      return res.status(200).json({ people, favorites: data.favorites, comments: data.comments, submissions: data.submissions })
    }

    if (req.method === 'POST') {
      const { username, pageId, deviceId, action, photoUrl, name, email, text } = req.body || {}
      const ctx = await resolvePage(username, pageId)
      if (!ctx) return res.status(404).json({ error: 'Not found' })
      const cf = ctx.page.clientFeatures
      if (!actionAllowed(cf, action)) return res.status(403).json({ error: 'Feature not enabled' })

      const data = await readEngagement(ctx.userId, ctx.page.id)

      // requireEmail enforcement: acting person must have an email on file.
      const needsEmail =
        ((action === 'favorite' || action === 'unfavorite' || action === 'submit') && cf.favorites?.requireEmail) ||
        (action === 'comment' && cf.comments?.requireEmail)
      if (needsEmail && !(data.people?.[deviceId]?.email || (action === 'identify' && email))) {
        return res.status(400).json({ error: 'email required' })
      }

      const next = applyEngagementAction(data, {
        type: action, deviceId, ts: Date.now(), photoUrl, name, email, text,
      })
      await writeEngagement(ctx.userId, ctx.page.id, next)

      if (action === 'submit') {
        const to = ctx.siteConfig.contact?.email
        if (to) {
          const person = next.people?.[deviceId]?.name || 'A client'
          const picks = next.favorites.filter(f => f.deviceId === deviceId).map(f => f.photoUrl)
          const pageTitle = ctx.page.title || 'your gallery'
          await sendMail({
            to,
            subject: `${person} submitted ${picks.length} favorite${picks.length === 1 ? '' : 's'} — ${pageTitle}`,
            text: `${person} submitted ${picks.length} favorites on "${pageTitle}".\n\n${picks.join('\n')}`,
            html: `<p><strong>${person}</strong> submitted ${picks.length} favorites on &ldquo;${pageTitle}&rdquo;.</p><ul>${picks.map(u => `<li><a href="${u}">${u}</a></li>`).join('')}</ul>`,
          })
        }
      }
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    const status = err.status || 500
    if (status >= 500) console.error('[client/engagement]', err)
    return res.status(status).json({ error: err.message || 'Internal error' })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/client-engagement/engagement.route.test.js`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add pages/api/client/engagement.js __tests__/client-engagement/engagement.route.test.js
git commit -m "feat(client): public engagement API (favorites, comments, submit email)"
```

---

### Task 3: Admin activity feed API

**Files:**
- Create: `pages/api/admin/engagement.js`
- Test: `__tests__/client-engagement/adminEngagement.route.test.js`

**Interfaces:**
- Consumes: `withAuth` from `@/common/withAuth` (handler receives `(req, res, user)` with `user.id`), `listFiles(prefix)` + `downloadJSON(key)` from `@/common/gcsClient`, `readSiteConfig(userId)` from `@/common/siteConfig`.
- Produces: `GET /api/admin/engagement` → 200 `{ events, pages }` where `events` = newest-first (max 200) `{ type: 'favorite'|'comment'|'submit', ts, pageId, pageTitle, person: { name, email }, photoUrl?, text?, count? }` and `pages` = `[{ pageId, pageTitle, favoriteCount, commentCount, people: number }]`. Task 8's bell popover consumes exactly this shape.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/client-engagement/adminEngagement.route.test.js
jest.mock('@/common/withAuth', () => ({ withAuth: (h) => (req, res) => h(req, res, { id: 'u1' }) }))

const mockList = jest.fn()
const mockDownload = jest.fn()
jest.mock('@/common/gcsClient', () => ({
  listFiles: (...a) => mockList(...a),
  downloadJSON: (...a) => mockDownload(...a),
}))

const mockReadSiteConfig = jest.fn()
jest.mock('@/common/siteConfig', () => ({ readSiteConfig: (...a) => mockReadSiteConfig(...a) }))

import handler from '@/pages/api/admin/engagement'

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
}

describe('GET /api/admin/engagement', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockReadSiteConfig.mockResolvedValue({ pages: [{ id: 'p1', title: 'Wedding' }] })
    mockList.mockResolvedValue(['users/u1/client-data/p1.json'])
    mockDownload.mockResolvedValue({
      people: { d1: { name: 'Priya', email: 'p@x.com', firstSeen: 1 } },
      favorites: [{ photoUrl: 'https://cdn/a.jpg', deviceId: 'd1', ts: 10 }],
      comments: [{ id: 'c1', photoUrl: 'https://cdn/a.jpg', deviceId: 'd1', text: 'love it', ts: 20 }],
      submissions: [{ deviceId: 'd1', ts: 30, count: 1 }],
    })
  })

  it('aggregates events newest-first with page titles and person info', async () => {
    const res = mockRes()
    await handler({ method: 'GET' }, res)
    expect(res.status).toHaveBeenCalledWith(200)
    const { events, pages } = res.json.mock.calls[0][0]
    expect(events.map(e => e.type)).toEqual(['submit', 'comment', 'favorite'])
    expect(events[0]).toMatchObject({ pageTitle: 'Wedding', person: { name: 'Priya', email: 'p@x.com' }, count: 1 })
    expect(events[1].text).toBe('love it')
    expect(pages).toEqual([{ pageId: 'p1', pageTitle: 'Wedding', favoriteCount: 1, commentCount: 1, people: 1 }])
  })

  it('lists the right prefix and 405s non-GET', async () => {
    const res = mockRes()
    await handler({ method: 'GET' }, res)
    expect(mockList).toHaveBeenCalledWith('users/u1/client-data/')
    const res2 = mockRes()
    await handler({ method: 'POST' }, res2)
    expect(res2.status).toHaveBeenCalledWith(405)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/client-engagement/adminEngagement.route.test.js`
Expected: FAIL — cannot find module `@/pages/api/admin/engagement`

- [ ] **Step 3: Write the implementation**

```js
// pages/api/admin/engagement.js
// Photographer-facing activity feed: aggregates all per-page client-data files
// into a reverse-chronological event list for the sidebar bell.
import { withAuth } from '../../../common/withAuth'
import { listFiles, downloadJSON } from '../../../common/gcsClient'
import { readSiteConfig } from '../../../common/siteConfig'

const MAX_EVENTS = 200

async function handler(req, res, user) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const [keys, siteConfig] = await Promise.all([
      listFiles(`users/${user.id}/client-data/`),
      readSiteConfig(user.id).catch(() => null),
    ])
    const titleById = {}
    for (const p of siteConfig?.pages || []) titleById[p.id] = p.title || p.slug || p.id

    const events = []
    const pages = []
    for (const key of keys) {
      const pageId = key.split('/').pop().replace(/\.json$/, '')
      let data
      try { data = await downloadJSON(key) } catch { continue }
      const pageTitle = titleById[pageId] || pageId
      const person = (deviceId) => {
        const p = data.people?.[deviceId]
        return { name: p?.name || 'Someone', email: p?.email || '' }
      }
      for (const f of data.favorites || []) {
        events.push({ type: 'favorite', ts: f.ts, pageId, pageTitle, person: person(f.deviceId), photoUrl: f.photoUrl })
      }
      for (const c of data.comments || []) {
        events.push({ type: 'comment', ts: c.ts, pageId, pageTitle, person: person(c.deviceId), photoUrl: c.photoUrl, text: c.text })
      }
      for (const s of data.submissions || []) {
        events.push({ type: 'submit', ts: s.ts, pageId, pageTitle, person: person(s.deviceId), count: s.count })
      }
      pages.push({
        pageId, pageTitle,
        favoriteCount: (data.favorites || []).length,
        commentCount: (data.comments || []).length,
        people: Object.keys(data.people || {}).length,
      })
    }
    events.sort((a, b) => b.ts - a.ts)
    return res.status(200).json({ events: events.slice(0, MAX_EVENTS), pages })
  } catch (err) {
    console.error('[admin/engagement]', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}

export default withAuth(handler)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/client-engagement/adminEngagement.route.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add pages/api/admin/engagement.js __tests__/client-engagement/adminEngagement.route.test.js
git commit -m "feat(admin): engagement activity feed API for the bell"
```

---

### Task 4: Client identity module (localStorage)

**Files:**
- Create: `common/clientIdentity.js`
- Test: `__tests__/client-engagement/clientIdentity.test.js` (jsdom env — the project default)

**Interfaces:**
- Produces (all client-safe, no R2 imports):
  - `getClientIdentity(username) → { deviceId, name, email } | null`
  - `saveClientIdentity(username, { name, email }) → { deviceId, name, email }` (generates and persists `deviceId` once; reuses existing deviceId on re-save)
  - `clearClientIdentity(username)`
  - Storage key: `sepia:client-identity:{username}`

- [ ] **Step 1: Write the failing test**

```js
// __tests__/client-engagement/clientIdentity.test.js
import { getClientIdentity, saveClientIdentity, clearClientIdentity } from '@/common/clientIdentity'

describe('clientIdentity', () => {
  beforeEach(() => localStorage.clear())

  it('returns null when nothing saved', () => {
    expect(getClientIdentity('swami')).toBeNull()
  })

  it('saves and round-trips identity with a generated deviceId', () => {
    const saved = saveClientIdentity('swami', { name: 'Priya', email: 'p@x.com' })
    expect(saved.deviceId).toBeTruthy()
    expect(getClientIdentity('swami')).toEqual(saved)
  })

  it('keeps the same deviceId across re-saves', () => {
    const first = saveClientIdentity('swami', { name: 'Priya', email: '' })
    const second = saveClientIdentity('swami', { name: 'Priya S', email: 'p@x.com' })
    expect(second.deviceId).toBe(first.deviceId)
    expect(second.name).toBe('Priya S')
  })

  it('is scoped per username and clearable', () => {
    saveClientIdentity('swami', { name: 'Priya', email: '' })
    expect(getClientIdentity('other')).toBeNull()
    clearClientIdentity('swami')
    expect(getClientIdentity('swami')).toBeNull()
  })

  it('survives malformed stored JSON', () => {
    localStorage.setItem('sepia:client-identity:swami', '{broken')
    expect(getClientIdentity('swami')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/client-engagement/clientIdentity.test.js`
Expected: FAIL — cannot find module `@/common/clientIdentity`

- [ ] **Step 3: Write the implementation**

```js
// common/clientIdentity.js
// Client-side identity for gallery visitors ("identity-lite"): asked once,
// stored per site in localStorage. Access control is the page password —
// this is only attribution.
const storageKey = (username) => `sepia:client-identity:${username}`

function makeDeviceId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function getClientIdentity(username) {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(storageKey(username))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.deviceId || !parsed?.name) return null
    return { deviceId: parsed.deviceId, name: parsed.name, email: parsed.email || '' }
  } catch {
    return null
  }
}

export function saveClientIdentity(username, { name, email }) {
  const existing = getClientIdentity(username)
  const identity = {
    deviceId: existing?.deviceId || makeDeviceId(),
    name: String(name || '').trim(),
    email: String(email || '').trim(),
  }
  try { localStorage.setItem(storageKey(username), JSON.stringify(identity)) } catch {}
  return identity
}

export function clearClientIdentity(username) {
  try { localStorage.removeItem(storageKey(username)) } catch {}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/client-engagement/clientIdentity.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add common/clientIdentity.js __tests__/client-engagement/clientIdentity.test.js
git commit -m "feat(client): identity-lite localStorage module"
```

---

### Task 5: ClientEngagementProvider context + shared UI (identity prompt, comments panel, submit pill, watermark)

**Files:**
- Create: `components/image-displays/engagement/ClientEngagementContext.js`
- Create: `components/image-displays/engagement/IdentityPrompt.js`
- Create: `components/image-displays/engagement/CommentsPanel.js`
- Create: `components/image-displays/engagement/SubmitPill.js`
- Create: `components/image-displays/engagement/WatermarkOverlay.js`
- Test: `__tests__/client-engagement/engagementContext.test.js`

**Interfaces:**
- Consumes: Task 4 (`getClientIdentity`, `saveClientIdentity`), Task 2's public API via `fetch('/api/client/engagement')`.
- Produces:
  - `ClientEngagementProvider({ username, pageId, clientFeatures, branding, children })` — `branding = { siteName, logo }`. When `clientFeatures?.enabled` is falsy it renders children with no context (all consumers self-gate to null).
  - `useClientEngagement() → null | ctx` where ctx =
    ```
    {
      features: { favorites: bool, comments: bool, submitWorkflow: bool, watermark: bool,
                  favoritesRequireEmail: bool, commentsRequireEmail: bool },
      branding: { siteName, logo },
      identity,                      // { deviceId, name, email } | null
      isFavorited(photoUrl) → bool,  // by this device
      favoriteCount(photoUrl) → number,
      commentCount(photoUrl) → number,
      commentsFor(photoUrl) → [{ id, name, text, ts }],
      myFavoriteCount → number,
      toggleFavorite(photoUrl),      // queues identity prompt if needed
      openComments(photoUrl),        // opens panel (prompting identity first if needed)
      submitFavorites(),
      submitted: bool,               // this device already submitted at current count
    }
    ```
  - `WatermarkOverlay()` — self-gating: reads context, renders `null` unless `features.watermark`; otherwise `<div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center" aria-hidden>` containing `branding.logo` `<img style={{ opacity: 0.16, maxWidth: '40%', maxHeight: '30%' }}>` or, without a logo, `branding.siteName` text (serif, `clamp(14px, 3.5vw, 28px)`, `letterSpacing: '0.25em'`, uppercase, `color: 'rgba(255,255,255,0.45)'`, `textShadow: '0 1px 8px rgba(0,0,0,0.35)'`, `opacity: 0.5`). Tiles/lightbox drop it inside any `relative` image wrapper (Task 6/7).

- [ ] **Step 1: Write the failing context test**

```js
// __tests__/client-engagement/engagementContext.test.js
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClientEngagementProvider, useClientEngagement } from '@/components/image-displays/engagement/ClientEngagementContext'

const CF = { enabled: true, favorites: { enabled: true, submitWorkflow: false }, comments: { enabled: true }, watermark: { enabled: false } }

function Probe() {
  const ctx = useClientEngagement()
  if (!ctx) return <div data-testid="no-ctx" />
  return (
    <div>
      <div data-testid="count">{ctx.favoriteCount('https://cdn/a.jpg')}</div>
      <div data-testid="mine">{String(ctx.isFavorited('https://cdn/a.jpg'))}</div>
      <button onClick={() => ctx.toggleFavorite('https://cdn/a.jpg')}>heart</button>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ people: {}, favorites: [], comments: [], submissions: [] }),
  })
})

it('provides no context when clientFeatures disabled', () => {
  render(
    <ClientEngagementProvider username="u" pageId="p1" clientFeatures={{ enabled: false }} branding={{}}>
      <Probe />
    </ClientEngagementProvider>
  )
  expect(screen.getByTestId('no-ctx')).toBeTruthy()
  expect(global.fetch).not.toHaveBeenCalled()
})

it('loads engagement on mount and prompts for identity on first heart', async () => {
  render(
    <ClientEngagementProvider username="u" pageId="p1" clientFeatures={CF} branding={{}}>
      <Probe />
    </ClientEngagementProvider>
  )
  await waitFor(() => expect(global.fetch).toHaveBeenCalled())
  await userEvent.click(screen.getByText('heart'))
  expect(await screen.findByPlaceholderText('Your name')).toBeTruthy()
})

it('with identity saved, heart optimistically updates and POSTs', async () => {
  localStorage.setItem('sepia:client-identity:u', JSON.stringify({ deviceId: 'd1', name: 'Priya', email: '' }))
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ people: {}, favorites: [], comments: [], submissions: [] }) }) // GET
    .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }) // POSTs
  render(
    <ClientEngagementProvider username="u" pageId="p1" clientFeatures={CF} branding={{}}>
      <Probe />
    </ClientEngagementProvider>
  )
  await waitFor(() => expect(global.fetch).toHaveBeenCalled())
  await userEvent.click(screen.getByText('heart'))
  await waitFor(() => expect(screen.getByTestId('mine').textContent).toBe('true'))
  expect(screen.getByTestId('count').textContent).toBe('1')
  const postCalls = global.fetch.mock.calls.filter(([, init]) => init?.method === 'POST')
  expect(postCalls.length).toBeGreaterThanOrEqual(1)
  expect(JSON.parse(postCalls[postCalls.length - 1][1].body)).toMatchObject({ action: 'favorite', photoUrl: 'https://cdn/a.jpg', deviceId: 'd1' })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/client-engagement/engagementContext.test.js`
Expected: FAIL — cannot find module ClientEngagementContext

- [ ] **Step 3: Implement the context**

```js
// components/image-displays/engagement/ClientEngagementContext.js
// Client-gallery engagement state (favorites, comments, identity, submit),
// mirroring the PrintStoreProvider pattern: mounted only on public pages,
// consumers self-gate on a null context so the editor preview is untouched.
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { getClientIdentity, saveClientIdentity } from '../../../common/clientIdentity'
import IdentityPrompt from './IdentityPrompt'
import CommentsPanel from './CommentsPanel'
import SubmitPill from './SubmitPill'

const Ctx = createContext(null)
export function useClientEngagement() { return useContext(Ctx) }

export function ClientEngagementProvider({ username, pageId, clientFeatures, branding, children }) {
  const enabled = !!clientFeatures?.enabled
  const features = useMemo(() => ({
    favorites: !!(enabled && clientFeatures?.favorites?.enabled),
    comments: !!(enabled && clientFeatures?.comments?.enabled),
    submitWorkflow: !!(enabled && clientFeatures?.favorites?.submitWorkflow),
    watermark: !!(enabled && clientFeatures?.watermark?.enabled),
    favoritesRequireEmail: !!clientFeatures?.favorites?.requireEmail,
    commentsRequireEmail: !!clientFeatures?.comments?.requireEmail,
  }), [enabled, clientFeatures])

  const [identity, setIdentity] = useState(null)
  const [data, setData] = useState({ people: {}, favorites: [], comments: [], submissions: [] })
  const [pendingAction, setPendingAction] = useState(null) // action queued behind the identity prompt
  const [commentsUrl, setCommentsUrl] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => { setIdentity(getClientIdentity(username)) }, [username])

  const interactive = features.favorites || features.comments
  useEffect(() => {
    if (!interactive) return
    let alive = true
    fetch(`/api/client/engagement?username=${encodeURIComponent(username)}&pageId=${encodeURIComponent(pageId)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive && d) setData(d) })
      .catch(() => {})
    return () => { alive = false }
  }, [interactive, username, pageId])

  const post = useCallback(async (body) => {
    const res = await fetch('/api/client/engagement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pageId, ...body }),
    })
    if (!res.ok) throw new Error('request failed')
    return res.json()
  }, [username, pageId])

  const performFavorite = useCallback((id, photoUrl) => {
    setData(prev => {
      const mine = prev.favorites.some(f => f.photoUrl === photoUrl && f.deviceId === id.deviceId)
      const favorites = mine
        ? prev.favorites.filter(f => !(f.photoUrl === photoUrl && f.deviceId === id.deviceId))
        : [...prev.favorites, { photoUrl, deviceId: id.deviceId, ts: Date.now() }]
      post({ deviceId: id.deviceId, action: mine ? 'unfavorite' : 'favorite', photoUrl }).catch(() => {
        setData(p => ({ ...p, favorites: prev.favorites })) // rollback
        setError('Could not save — try again')
        setTimeout(() => setError(null), 2500)
      })
      return { ...prev, favorites }
    })
  }, [post])

  const performComment = useCallback((id, photoUrl, text) => {
    const entry = { id: `tmp_${Date.now()}`, photoUrl, deviceId: id.deviceId, text, ts: Date.now() }
    setData(prev => ({
      ...prev,
      comments: [...prev.comments, entry],
      people: { ...prev.people, [id.deviceId]: { name: id.name } },
    }))
    post({ deviceId: id.deviceId, action: 'comment', photoUrl, text }).catch(() => {
      setData(p => ({ ...p, comments: p.comments.filter(c => c.id !== entry.id) }))
      setError('Could not post comment — try again')
      setTimeout(() => setError(null), 2500)
    })
  }, [post])

  // requireEmail per feature: the identity prompt collects email when the toggle demands it.
  const needsIdentity = useCallback((kind) => {
    if (!identity) return true
    const wantEmail = kind === 'comment' ? features.commentsRequireEmail : features.favoritesRequireEmail
    return wantEmail && !identity.email
  }, [identity, features])

  const runOrPrompt = useCallback((kind, run) => {
    if (needsIdentity(kind)) { setPendingAction({ kind, run }); return }
    run(identity)
  }, [needsIdentity, identity])

  const completeIdentity = useCallback((name, email) => {
    const saved = saveClientIdentity(username, { name, email })
    setIdentity(saved)
    setData(prev => ({ ...prev, people: { ...prev.people, [saved.deviceId]: { name: saved.name } } }))
    post({ deviceId: saved.deviceId, action: 'identify', name: saved.name, email: saved.email }).catch(() => {})
    if (pendingAction) { pendingAction.run(saved); setPendingAction(null) }
  }, [username, post, pendingAction])

  const myFavorites = useMemo(() => new Set(
    identity ? data.favorites.filter(f => f.deviceId === identity.deviceId).map(f => f.photoUrl) : []
  ), [data.favorites, identity])

  const submitted = useMemo(() => {
    if (!identity) return false
    const mine = (data.submissions || []).filter(s => s.deviceId === identity.deviceId)
    return mine.length > 0 && mine[mine.length - 1].count === myFavorites.size
  }, [data.submissions, identity, myFavorites])

  const ctx = useMemo(() => enabled ? {
    features,
    branding: branding || {},
    identity,
    isFavorited: (url) => myFavorites.has(url),
    favoriteCount: (url) => data.favorites.filter(f => f.photoUrl === url).length,
    commentCount: (url) => data.comments.filter(c => c.photoUrl === url).length,
    commentsFor: (url) => data.comments
      .filter(c => c.photoUrl === url)
      .map(c => ({ id: c.id, name: data.people[c.deviceId]?.name || 'Someone', text: c.text, ts: c.ts })),
    myFavoriteCount: myFavorites.size,
    toggleFavorite: (photoUrl) => runOrPrompt('favorite', (id) => performFavorite(id, photoUrl)),
    openComments: (photoUrl) => setCommentsUrl(photoUrl),
    addComment: (photoUrl, text) => runOrPrompt('comment', (id) => performComment(id, photoUrl, text)),
    submitFavorites: () => runOrPrompt('favorite', (id) => {
      post({ deviceId: id.deviceId, action: 'submit' }).then(() => {
        setData(prev => ({ ...prev, submissions: [...(prev.submissions || []), { deviceId: id.deviceId, ts: Date.now(), count: myFavorites.size }] }))
      }).catch(() => {
        setError('Could not submit — try again')
        setTimeout(() => setError(null), 2500)
      })
    }),
    submitted,
  } : null, [enabled, features, branding, identity, data, myFavorites, submitted, runOrPrompt, performFavorite, performComment, post])

  if (!enabled) return children

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {pendingAction && (
        <IdentityPrompt
          requireEmail={pendingAction.kind === 'comment' ? features.commentsRequireEmail : features.favoritesRequireEmail}
          initial={identity}
          onSave={completeIdentity}
          onCancel={() => setPendingAction(null)}
        />
      )}
      {commentsUrl && <CommentsPanel photoUrl={commentsUrl} onClose={() => setCommentsUrl(null)} />}
      {features.submitWorkflow && <SubmitPill />}
      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-stone-900 text-white text-sm px-4 py-2 rounded-full shadow-lg">
          {error}
        </div>
      )}
    </Ctx.Provider>
  )
}
```

- [ ] **Step 4: Implement IdentityPrompt**

```js
// components/image-displays/engagement/IdentityPrompt.js
// Asked once per device: name required, email optional (required when the
// photographer flips requireEmail). Copy stays warm and short.
import { useState } from 'react'

export default function IdentityPrompt({ requireEmail, initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '')
  const [email, setEmail] = useState(initial?.email || '')
  const canSave = name.trim() && (!requireEmail || /.+@.+\..+/.test(email.trim()))

  function submit(e) {
    e.preventDefault()
    if (canSave) onSave(name.trim(), email.trim())
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onCancel}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-medium text-stone-800">Who&rsquo;s picking?</h2>
          <p className="text-sm text-stone-500 mt-1">So the photographer knows who this is from. Asked just once.</p>
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={100}
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-stone-500"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={requireEmail ? 'Email' : 'Email (optional)'}
          maxLength={200}
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-stone-500"
        />
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="text-sm text-stone-500 px-3 py-2">Cancel</button>
          <button type="submit" disabled={!canSave} className="text-sm bg-stone-900 text-white px-4 py-2 rounded-lg disabled:opacity-40">Continue</button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: Implement CommentsPanel**

```js
// components/image-displays/engagement/CommentsPanel.js
// Per-photo comments: bottom sheet on small screens, centered card on desktop.
// Visible to anyone with gallery access.
import { useState } from 'react'
import { useClientEngagement } from './ClientEngagementContext'
import { getSizedUrl } from '../../../common/imageUtils'

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function CommentsPanel({ photoUrl, onClose }) {
  const ctx = useClientEngagement()
  const [draft, setDraft] = useState('')
  if (!ctx) return null
  const comments = ctx.commentsFor(photoUrl)

  function submit(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    ctx.addComment(photoUrl, text)
    setDraft('')
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center gap-3 p-4 border-b border-stone-100">
          <img src={getSizedUrl(photoUrl, 'thumbnail')} alt="" className="w-12 h-12 object-cover rounded-lg" />
          <div className="flex-1 text-sm font-medium text-stone-700">Comments</div>
          <button onClick={onClose} aria-label="Close comments" className="text-stone-400 text-2xl leading-none px-1">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {comments.length === 0 && <p className="text-sm text-stone-400">No comments yet — be the first.</p>}
          {comments.map(c => (
            <div key={c.id}>
              <div className="text-xs text-stone-400">{c.name} · {timeAgo(c.ts)}</div>
              <div className="text-sm text-stone-700 whitespace-pre-line">{c.text}</div>
            </div>
          ))}
        </div>
        {ctx.features.comments && (
          <form onSubmit={submit} className="p-3 border-t border-stone-100 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a comment…"
              maxLength={1000}
              className="flex-1 border border-stone-300 rounded-full px-4 py-2 text-sm outline-none focus:border-stone-500"
            />
            <button type="submit" disabled={!draft.trim()} className="text-sm bg-stone-900 text-white px-4 py-2 rounded-full disabled:opacity-40">Post</button>
          </form>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Implement SubmitPill and WatermarkOverlay**

```js
// components/image-displays/engagement/SubmitPill.js
// Floating "N selected · Submit favorites" pill, shown once the visitor has
// hearted at least one photo and the photographer enabled the submit workflow.
import { useState } from 'react'
import { useClientEngagement } from './ClientEngagementContext'

export default function SubmitPill() {
  const ctx = useClientEngagement()
  const [confirming, setConfirming] = useState(false)
  if (!ctx || !ctx.features.submitWorkflow || ctx.myFavoriteCount === 0) return null

  if (ctx.submitted) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur text-stone-600 text-sm px-5 py-2.5 rounded-full shadow-lg border border-stone-200">
        ✓ {ctx.myFavoriteCount} favorite{ctx.myFavoriteCount === 1 ? '' : 's'} sent
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-stone-900/95 backdrop-blur text-white text-sm pl-5 pr-2 py-2 rounded-full shadow-xl">
      <span>{ctx.myFavoriteCount} selected</span>
      {confirming ? (
        <button onClick={() => { ctx.submitFavorites(); setConfirming(false) }} className="bg-white text-stone-900 px-4 py-1.5 rounded-full font-medium">
          Confirm send
        </button>
      ) : (
        <button onClick={() => setConfirming(true)} className="bg-white/15 px-4 py-1.5 rounded-full">
          Submit favorites
        </button>
      )}
    </div>
  )
}
```

```js
// components/image-displays/engagement/WatermarkOverlay.js
// Screenshot deterrent, not DRM: a light brand mark over public photos when
// clientFeatures.watermark is on. Pointer-events none so it never blocks taps.
import { useClientEngagement } from './ClientEngagementContext'

export default function WatermarkOverlay() {
  const ctx = useClientEngagement()
  if (!ctx?.features?.watermark) return null
  const { logo, siteName } = ctx.branding || {}
  return (
    <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center overflow-hidden" aria-hidden="true">
      {logo ? (
        <img src={logo} alt="" style={{ opacity: 0.16, maxWidth: '40%', maxHeight: '30%' }} />
      ) : (
        <span style={{
          fontFamily: '"Cormorant Garamond", Georgia, serif',
          fontSize: 'clamp(14px, 3.5vw, 28px)',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.45)',
          textShadow: '0 1px 8px rgba(0,0,0,0.35)',
          opacity: 0.5,
          whiteSpace: 'nowrap',
        }}>
          {siteName || ''}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Run the context test**

Run: `npx jest __tests__/client-engagement/engagementContext.test.js`
Expected: PASS (3 tests)

- [ ] **Step 8: Commit**

```bash
git add components/image-displays/engagement/ __tests__/client-engagement/engagementContext.test.js
git commit -m "feat(client): engagement context, identity prompt, comments panel, submit pill, watermark"
```

---

### Task 6: EngagementActions buttons + tile integration (Masonry, Stacked, PhotoBlock)

**Files:**
- Create: `components/image-displays/engagement/EngagementActions.js`
- Modify: `components/image-displays/gallery/masonry-gallery/MasonryGallery.js` (overlay div at lines 22-37)
- Modify: `components/image-displays/gallery/stacked-gallery/StackedGallery.js` (mirror — find the `relative group` wrapper with `BuyPrintButton`)
- Modify: `components/image-displays/gallery/photo-block/PhotoBlock.js` (mirror — same pattern)
- Test: `__tests__/client-engagement/engagementActions.test.js`

**Interfaces:**
- Consumes: `useClientEngagement()` from Task 5.
- Produces: `EngagementActions({ imageUrl })` — self-gating (null without context or with both features off). Heart button: filled heart + count when favorited/count > 0, and the button element carries `data-engagement="always-visible"` when `isFavorited(imageUrl)` so tiles keep it visible without hover. Comment button: speech bubble + count, opens `ctx.openComments(imageUrl)`.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/client-engagement/engagementActions.test.js
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClientEngagementProvider } from '@/components/image-displays/engagement/ClientEngagementContext'
import EngagementActions from '@/components/image-displays/engagement/EngagementActions'

const CF = { enabled: true, favorites: { enabled: true }, comments: { enabled: true } }

beforeEach(() => {
  localStorage.clear()
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      people: { d9: { name: 'Raj' } },
      favorites: [{ photoUrl: 'https://cdn/a.jpg', deviceId: 'd9', ts: 1 }],
      comments: [{ id: 'c1', photoUrl: 'https://cdn/a.jpg', deviceId: 'd9', text: 'nice', ts: 2 }],
      submissions: [],
    }),
  })
})

it('renders nothing outside a provider', () => {
  const { container } = render(<EngagementActions imageUrl="https://cdn/a.jpg" />)
  expect(container.firstChild).toBeNull()
})

it('renders heart with count and comment with count', async () => {
  render(
    <ClientEngagementProvider username="u" pageId="p1" clientFeatures={CF} branding={{}}>
      <EngagementActions imageUrl="https://cdn/a.jpg" />
    </ClientEngagementProvider>
  )
  await waitFor(() => expect(screen.getByLabelText('Favorite photo')).toBeTruthy())
  expect(screen.getByLabelText('Favorite photo').textContent).toContain('1')
  expect(screen.getByLabelText('Comments on photo').textContent).toContain('1')
})

it('opens the comments panel on comment click', async () => {
  render(
    <ClientEngagementProvider username="u" pageId="p1" clientFeatures={CF} branding={{}}>
      <EngagementActions imageUrl="https://cdn/a.jpg" />
    </ClientEngagementProvider>
  )
  await waitFor(() => expect(screen.getByLabelText('Comments on photo')).toBeTruthy())
  await userEvent.click(screen.getByLabelText('Comments on photo'))
  expect(await screen.findByText('nice')).toBeTruthy()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/client-engagement/engagementActions.test.js`
Expected: FAIL — cannot find module EngagementActions

- [ ] **Step 3: Implement EngagementActions**

```js
// components/image-displays/engagement/EngagementActions.js
// Heart + comment buttons overlaid on a public gallery photo. Self-gates on
// the engagement context (absent in the editor preview) and on feature flags,
// exactly like BuyPrintButton self-gates on the print store.
import React from 'react'
import { useClientEngagement } from './ClientEngagementContext'

const btnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  background: 'rgba(249,245,238,0.9)',
  backdropFilter: 'blur(3px)',
  WebkitBackdropFilter: 'blur(3px)',
  border: 'none',
  borderRadius: 999,
  padding: '6px 10px',
  fontSize: 12,
  color: '#2c2416',
  boxShadow: '0 1px 5px rgba(20,14,8,0.16)',
  cursor: 'pointer',
  outline: 'none',
  transition: 'background 0.18s ease, transform 0.18s ease',
}

function hoverIn(e) { e.currentTarget.style.background = 'rgba(252,249,244,1)'; e.currentTarget.style.transform = 'translateY(-1px)' }
function hoverOut(e) { e.currentTarget.style.background = 'rgba(249,245,238,0.9)'; e.currentTarget.style.transform = 'translateY(0)' }

function HeartIcon({ filled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? '#c14a4a' : 'none'} stroke={filled ? '#c14a4a' : 'currentColor'} strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  )
}

function CommentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
    </svg>
  )
}

export default function EngagementActions({ imageUrl }) {
  const ctx = useClientEngagement()
  if (!ctx || (!ctx.features.favorites && !ctx.features.comments)) return null

  const mine = ctx.isFavorited(imageUrl)
  const favCount = ctx.favoriteCount(imageUrl)
  const comCount = ctx.commentCount(imageUrl)

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {ctx.features.favorites && (
        <button
          type="button"
          aria-label="Favorite photo"
          data-engagement={mine ? 'always-visible' : undefined}
          onClick={(e) => { e.stopPropagation(); ctx.toggleFavorite(imageUrl) }}
          style={btnStyle}
          onMouseEnter={hoverIn}
          onMouseLeave={hoverOut}
        >
          <HeartIcon filled={mine} />
          {favCount > 0 && <span>{favCount}</span>}
        </button>
      )}
      {ctx.features.comments && (
        <button
          type="button"
          aria-label="Comments on photo"
          onClick={(e) => { e.stopPropagation(); ctx.openComments(imageUrl) }}
          style={btnStyle}
          onMouseEnter={hoverIn}
          onMouseLeave={hoverOut}
        >
          <CommentIcon />
          {comCount > 0 && <span>{comCount}</span>}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Integrate into the three tile components**

In **MasonryGallery.js**, the current tile wrapper (lines 22-37) becomes — note the new top-left overlay and `WatermarkOverlay`; the top-right BuyPrintButton overlay is unchanged:

```jsx
import EngagementActions from "../../engagement/EngagementActions";
import WatermarkOverlay from "../../engagement/WatermarkOverlay";
```

```jsx
<div className="relative group">
  <img
    src={imageUrl}
    alt={caption || `Image ${index + 1}`}
    className="w-full h-auto transition-opacity duration-500 ease-in shadow-lg rounded-3xl cursor-pointer"
    onError={(e) => {
      console.error("Image failed to load:", imageUrl);
      e.target.style.display = 'none';
    }}
    onClick={() => onImageClick && onImageClick(index)}
  />
  <WatermarkOverlay />
  <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
    <BuyPrintButton print={print} imageUrl={url} />
  </div>
  <div className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 [&:has([data-engagement=always-visible])]:opacity-100 transition-opacity duration-300">
    <EngagementActions imageUrl={url} />
  </div>
</div>
```

Apply the same pattern in **StackedGallery.js** and **PhotoBlock.js**: read each file, find the `relative group` image wrapper that already contains the `BuyPrintButton` overlay div, add the same two imports, add `<WatermarkOverlay />` directly after the `<img>`, and add the same top-left `EngagementActions` overlay div using that tile's image URL variable. If a wrapper is not `position: relative`, add `relative` to it. Keep rounded corners consistent by placing `WatermarkOverlay` inside the same wrapper as the img (it is `overflow-hidden` safe).

- [ ] **Step 5: Run the test and the full suite**

Run: `npx jest __tests__/client-engagement/engagementActions.test.js` — Expected: PASS (3 tests)
Run: `npm test` — Expected: all suites pass (existing suites unaffected: without a provider, EngagementActions and WatermarkOverlay render null)

- [ ] **Step 6: Commit**

```bash
git add components/image-displays/engagement/EngagementActions.js components/image-displays/gallery/ __tests__/client-engagement/engagementActions.test.js
git commit -m "feat(client): heart/comment overlay on public gallery tiles + watermark"
```

---

### Task 7: Lightbox integration + public page wiring

**Files:**
- Modify: `components/image-displays/PhotoLightbox.js` (lines 66-92: image wrapper)
- Modify: `pages/sites/[username]/[slug].js` (wrap `<Gallery>` at lines 132-149)
- Modify: `pages/sites/[username]/index.js` (mirror: wrap the home page's `<Gallery>` render the same way; the home page object is `homePage`)

**Interfaces:**
- Consumes: `ClientEngagementProvider`, `EngagementActions`, `WatermarkOverlay` from Tasks 5-6.
- Produces: fully wired public pages. The provider receives `username`, `pageId={page.id}`, `clientFeatures={page.clientFeatures}`, `branding={{ siteName: siteConfig.siteName, logo: siteConfig.logoType === 'image' ? siteConfig.logo : '' }}`.

- [ ] **Step 1: Add engagement to the lightbox**

In `PhotoLightbox.js`, add imports:

```js
import EngagementActions from "./engagement/EngagementActions";
import WatermarkOverlay from "./engagement/WatermarkOverlay";
```

Inside the `relative` image wrapper (after the `<img>`, sibling of the sellable overlay), add a bottom-centered action bar that follows the same hover/peek visibility as the buy button, plus the watermark:

```jsx
<WatermarkOverlay />
<div
  className="absolute bottom-3 left-1/2 -translate-x-1/2 transition-opacity duration-500"
  style={{ opacity: hovering || peek ? 1 : 0, pointerEvents: hovering || peek ? 'auto' : 'none' }}
>
  <EngagementActions imageUrl={image.url} />
</div>
```

(The lightbox is rendered by `Gallery`, which sits inside the provider once the pages are wired — no prop changes needed. In the editor preview there is no provider, so both components render null.)

- [ ] **Step 2: Wire `[slug].js`**

```js
import { ClientEngagementProvider } from '../../../components/image-displays/engagement/ClientEngagementContext'
```

Wrap the existing `<Gallery ... />` element (leave all its props untouched):

```jsx
<ClientEngagementProvider
  username={username}
  pageId={page.id}
  clientFeatures={page.clientFeatures}
  branding={{ siteName: siteConfig.siteName, logo: siteConfig.logoType === 'image' ? siteConfig.logo : '' }}
>
  <Gallery ... existing props unchanged ... />
</ClientEngagementProvider>
```

- [ ] **Step 3: Wire `index.js`**

Read `pages/sites/[username]/index.js`; where it renders `<Gallery>` for the home page, apply the same wrapper with `pageId={homePage.id}` and `clientFeatures={homePage.clientFeatures}` (skip the wrapper for the cover-page-only branch, which renders no Gallery).

- [ ] **Step 4: Verify**

Run: `npm test` — Expected: all suites pass.
Then a quick smoke: `curl -s localhost:3000/api/client/engagement?username=doesnotexist&pageId=x | head -c 200` — Expected: `{"error":"Not found"}` (dev server already runs on port 3000; do NOT start a second one or run a build).

- [ ] **Step 5: Commit**

```bash
git add components/image-displays/PhotoLightbox.js "pages/sites/[username]/[slug].js" "pages/sites/[username]/index.js"
git commit -m "feat(client): engagement in lightbox + provider wiring on public pages"
```

---

### Task 8: Sidebar bell → live notifications popover

**Files:**
- Create: `components/admin/platform/NotificationsPopover.js`
- Modify: `components/admin/platform/PlatformSidebar.js` (bell IconButton around lines 747-750)

**Interfaces:**
- Consumes: `GET /api/admin/engagement` (Task 3 shape), `PopoverShell` from `components/admin/platform/PopoverShell.js` (props: `anchorEl`, `onClose`, `width`, `title`, `placement`).
- Produces: bell opens a notifications panel; unread dot on the bell when events exist newer than `localStorage['sepia:notif-last-seen']`; opening the panel marks seen.

- [ ] **Step 1: Implement NotificationsPopover**

```js
// components/admin/platform/NotificationsPopover.js
// Client-activity feed behind the masthead bell: favorites, comments, and
// selection submissions across all pages, newest first.
import { useEffect, useState } from 'react'
import PopoverShell from './PopoverShell'

const LAST_SEEN_KEY = 'sepia:notif-last-seen'

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

function line(e) {
  if (e.type === 'submit') return `${e.person.name} submitted ${e.count} favorite${e.count === 1 ? '' : 's'}`
  if (e.type === 'comment') return `${e.person.name} commented: “${e.text.length > 60 ? e.text.slice(0, 60) + '…' : e.text}”`
  return `${e.person.name} favorited a photo`
}

export default function NotificationsPopover({ anchorEl, onClose }) {
  const [events, setEvents] = useState(null)

  useEffect(() => {
    fetch('/api/admin/engagement')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setEvents(d?.events || []))
      .catch(() => setEvents([]))
    try { localStorage.setItem(LAST_SEEN_KEY, String(Date.now())) } catch {}
  }, [])

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Notifications" placement="below">
      <div className="max-h-96 overflow-y-auto">
        {events === null && <div className="px-4 py-6 text-xs text-center" style={{ color: 'var(--text-muted)' }}>Loading…</div>}
        {events?.length === 0 && (
          <div className="px-4 py-8 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            No client activity yet. Enable client features on a page and share it.
          </div>
        )}
        {(events || []).map((e, i) => (
          <div key={i} className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(160,140,110,0.12)' }}>
            <div className="text-xs leading-snug" style={{ color: 'var(--text-secondary)' }}>{line(e)}</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{e.pageTitle} · {timeAgo(e.ts)}</div>
          </div>
        ))}
      </div>
    </PopoverShell>
  )
}

export function useUnreadNotifications() {
  const [unread, setUnread] = useState(false)
  useEffect(() => {
    let alive = true
    fetch('/api/admin/engagement')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!alive || !d?.events?.length) return
        let lastSeen = 0
        try { lastSeen = parseInt(localStorage.getItem(LAST_SEEN_KEY) || '0', 10) } catch {}
        setUnread(d.events[0].ts > lastSeen)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])
  return [unread, () => setUnread(false)]
}
```

- [ ] **Step 2: Wire the bell in PlatformSidebar**

In `PlatformSidebar.js`: import `NotificationsPopover, { useUnreadNotifications }` and `useRef`/`useState` (already imported at top — extend existing import). In the masthead component that renders the bell (lines ~747-750):

```jsx
const bellRef = useRef(null)
const [notifOpen, setNotifOpen] = useState(false)
const [unread, clearUnread] = useUnreadNotifications()
```

```jsx
<span ref={bellRef} style={{ position: 'relative', display: 'inline-flex' }}>
  <IconButton label="Notifications" onClick={() => { setNotifOpen(v => !v); clearUnread() }}>
    <IconBell />
  </IconButton>
  {unread && (
    <span style={{
      position: 'absolute', top: 3, right: 3, width: 6, height: 6,
      borderRadius: '50%', background: '#c14a4a', pointerEvents: 'none',
    }} />
  )}
</span>
{notifOpen && <NotificationsPopover anchorEl={bellRef.current} onClose={() => setNotifOpen(false)} />}
```

Check `IconButton`'s definition (lines ~191-207) — if it doesn't accept/forward `onClick`, add the prop. If the bell lives in a function component without hooks state, add the three hook lines at the top of that component.

- [ ] **Step 3: Verify**

Run: `npm test` — Expected: all pass. Open `localhost:3000` admin in a browser (dev server already running) and confirm the bell opens the popover with the empty state.

- [ ] **Step 4: Commit**

```bash
git add components/admin/platform/NotificationsPopover.js components/admin/platform/PlatformSidebar.js
git commit -m "feat(admin): live notifications popover behind the sidebar bell"
```

---

### Task 9: Watermark toggle in Page Settings + clientFeatures normalization

**Files:**
- Modify: `components/admin/platform/PageSettingsPopover.js` (client drill-in, after the Comments FeatureBlock at ~line 434)
- Modify: `common/siteConfig.js` (clientFeatures defaults around lines 159-165)
- Test: extend `__tests__/client-engagement/clientEngagement.test.js`? No — normalization lives in siteConfig; check for an existing siteConfig test and extend it if present, otherwise verify via the running app.

**Interfaces:**
- Produces: `page.clientFeatures.watermark = { enabled: false }` default; toggle UI writing `updateCf('watermark', { enabled: v })`.

- [ ] **Step 1: Add the default**

In `common/siteConfig.js`, find the clientFeatures normalization/default block (~lines 159-165) and add `watermark: { enabled: false }` alongside `downloads`/`favorites`/`comments`/`purchase`, following the exact merge style used there (deep-merge with stored value if the file normalizes per-key, plain default if it only fills missing keys).

- [ ] **Step 2: Add the toggle**

In `PageSettingsPopover.js` client drill-in, after the Comments FeatureBlock:

```jsx
<FeatureBlock label="Watermark" checked={cf.watermark?.enabled || false} onToggle={(v) => updateCf('watermark', { enabled: v })}>
  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Overlays your logo or site name on photos. A deterrent, not protection.</p>
</FeatureBlock>
```

- [ ] **Step 3: Verify**

Run: `npm test` — Expected: all pass. In the running editor: page settings → Client Features → toggle Watermark on, then open the published page and confirm the overlay appears on tiles and in the lightbox.

- [ ] **Step 4: Commit**

```bash
git add components/admin/platform/PageSettingsPopover.js common/siteConfig.js
git commit -m "feat(client): watermark toggle in client features panel"
```

---

### Task 10: End-to-end manual QA

**Files:** none (verification only)

- [ ] **Step 1: Full suite**

Run: `npm test` — Expected: all suites pass.

- [ ] **Step 2: Client flow QA** (dev server already on port 3000; use the /browse skill if available, otherwise report the checklist for the user)

1. Editor: enable Client Features + Favorites (with submit workflow) + Comments + Watermark on a page with photos; publish state saves.
2. Published page: hover a photo → heart + comment buttons appear top-left; buy button (if any) unaffected top-right; watermark visible.
3. First heart → identity prompt (name required, email optional) → after continue, the heart completes and stays filled without hover.
4. Comment → panel opens, posts, shows "name · just now".
5. Second browser (or private window) → same page, different identity → heart the same photo → count shows 2.
6. Submit pill: "2 selected · Submit favorites" → confirm → done state; server log shows `sendMail skipped: SMTP not configured` (or a real send).
7. Editor: bell shows unread dot; opening lists favorites/comments/submission; reopening clears the dot.
8. Feature-off check: disable Client Features → published page shows no overlays; editor preview never shows overlays.

- [ ] **Step 3: Fix anything found, commit fixes atomically**
