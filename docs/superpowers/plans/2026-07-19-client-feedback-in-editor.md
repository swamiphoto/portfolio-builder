# Client Feedback in the Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface per-photo client feedback (heart count, comment count, who, and what they said) directly on the photos inside the gallery editor — on block-card thumbnails and in the live preview — behind a photographer-controlled view toggle.

**Architecture:** A new pure reducer aggregates one page's engagement JSON into a `photoUrl → { favBy, favCount, comments, commentCount }` map, served by an extended `/api/admin/engagement?pageId=` route. `BlockPageEditor` fetches it and provides it via a small `EditorFeedbackContext` so badges self-gate on context (mirroring how the public `EngagementActions` self-gates on `ClientEngagementContext`) — no prop threading through the large `BlockCard`. The live preview reuses the existing `engagementOverlay` slot in the shared gallery layouts via a read-only "review-mode" engagement provider, so no shared layout file changes.

**Tech Stack:** Next.js (pages router), React, Tailwind, Jest + @testing-library/react. GCS JSON storage. `@/` path alias maps to repo root.

## Global Constraints

- Photo identity is the **raw** `imageUrl` string (what `EngagementActions` records and what blocks store in `block.imageUrl` / `block.images[].url`). Match by exact string equality — never normalize or transform the URL.
- The admin API returns client **names only**, never emails (matches the existing bell feed).
- The "show feedback" state is a photographer view preference in `localStorage` (`sepia:show-feedback`) — never written to siteConfig.
- The one-time banner "seen" marker is per-page: `localStorage['sepia:feedback-seen:<pageId>']`. Keep it distinct from the bell's `sepia:notif-last-seen`.
- All `localStorage` access wrapped in try/catch (matches existing code).
- Tests use `@/` imports and `jest-environment-jsdom`. Run a single suite with `npx jest <path>`.
- Commit after each task with a `feat(client):` / `test(client):` style message.

---

### Task 1: Per-photo aggregation reducer

**Files:**
- Modify: `common/clientEngagement.js` (add three exports at end of file)
- Test: `__tests__/client-engagement/aggregateByPhoto.test.js` (create)

**Interfaces:**
- Consumes: the engagement data shape `{ people, favorites, comments, submissions }` already defined in this file.
- Produces:
  - `aggregateByPhoto(data) → { [photoUrl]: { favBy: string[], favCount: number, comments: {id,name,text,ts}[], commentCount: number } }`
  - `lastActivityTs(data) → number` (0 if none)
  - `hasFeedback(data) → boolean`

- [ ] **Step 1: Write the failing test**

Create `__tests__/client-engagement/aggregateByPhoto.test.js`:

```js
import { aggregateByPhoto, lastActivityTs, hasFeedback, emptyEngagement } from '@/common/clientEngagement'

const data = () => ({
  people: { d1: { name: 'Priya', email: 'p@x.com' }, d2: { name: 'Raj' } },
  favorites: [
    { photoUrl: 'https://cdn/a.jpg', deviceId: 'd1', ts: 10 },
    { photoUrl: 'https://cdn/a.jpg', deviceId: 'd2', ts: 12 },
    { photoUrl: 'https://cdn/b.jpg', deviceId: 'd1', ts: 5 },
  ],
  comments: [
    { id: 'c2', photoUrl: 'https://cdn/a.jpg', deviceId: 'd2', text: 'love it', ts: 20 },
    { id: 'c1', photoUrl: 'https://cdn/a.jpg', deviceId: 'd1', text: 'mom wants this', ts: 8 },
  ],
  submissions: [{ deviceId: 'd1', ts: 30, count: 2 }],
})

describe('aggregateByPhoto', () => {
  it('groups favorites and comments by photoUrl and resolves names', () => {
    const m = aggregateByPhoto(data())
    expect(m['https://cdn/a.jpg'].favCount).toBe(2)
    expect(m['https://cdn/a.jpg'].favBy).toEqual(['Priya', 'Raj'])
    expect(m['https://cdn/b.jpg']).toEqual({ favBy: ['Priya'], favCount: 1, comments: [], commentCount: 0 })
  })

  it('orders comments chronologically and resolves names, defaulting to "Someone"', () => {
    const d = data()
    d.comments.push({ id: 'c3', photoUrl: 'https://cdn/a.jpg', deviceId: 'dX', text: 'hi', ts: 25 })
    const m = aggregateByPhoto(d)
    expect(m['https://cdn/a.jpg'].comments.map(c => c.text)).toEqual(['mom wants this', 'love it', 'hi'])
    expect(m['https://cdn/a.jpg'].comments.map(c => c.name)).toEqual(['Priya', 'Raj', 'Someone'])
    expect(m['https://cdn/a.jpg'].commentCount).toBe(3)
  })

  it('dedupes favorites by (photoUrl, deviceId) in favBy', () => {
    const d = data()
    d.favorites.push({ photoUrl: 'https://cdn/a.jpg', deviceId: 'd1', ts: 99 })
    const m = aggregateByPhoto(d)
    expect(m['https://cdn/a.jpg'].favBy).toEqual(['Priya', 'Raj'])
  })

  it('returns {} for empty engagement', () => {
    expect(aggregateByPhoto(emptyEngagement())).toEqual({})
  })
})

describe('lastActivityTs / hasFeedback', () => {
  it('returns the max ts across favorites, comments, submissions', () => {
    expect(lastActivityTs(data())).toBe(30)
  })
  it('is 0 and false for empty', () => {
    expect(lastActivityTs(emptyEngagement())).toBe(0)
    expect(hasFeedback(emptyEngagement())).toBe(false)
  })
  it('hasFeedback is true when any favorite or comment exists', () => {
    expect(hasFeedback({ ...emptyEngagement(), comments: [{ id: 'c', photoUrl: 'u', deviceId: 'd', text: 't', ts: 1 }] })).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/client-engagement/aggregateByPhoto.test.js`
Expected: FAIL — `aggregateByPhoto is not a function`.

- [ ] **Step 3: Add the implementation**

Append to `common/clientEngagement.js`:

```js
// Aggregate one page's engagement into a per-photoUrl map, resolving deviceId → name.
// favBy is deduped by deviceId (first-seen order by ts); comments are chronological.
export function aggregateByPhoto(data) {
  const nameOf = (deviceId) => data.people?.[deviceId]?.name || 'Someone'
  const map = {}
  const ensure = (url) => (map[url] ||= { favBy: [], favCount: 0, comments: [], commentCount: 0 })
  const seenFav = {} // url -> Set(deviceId)

  for (const f of [...(data.favorites || [])].sort((a, b) => a.ts - b.ts)) {
    const entry = ensure(f.photoUrl)
    const set = (seenFav[f.photoUrl] ||= new Set())
    if (set.has(f.deviceId)) continue
    set.add(f.deviceId)
    entry.favBy.push(nameOf(f.deviceId))
    entry.favCount = entry.favBy.length
  }

  for (const c of [...(data.comments || [])].sort((a, b) => a.ts - b.ts)) {
    const entry = ensure(c.photoUrl)
    entry.comments.push({ id: c.id, name: nameOf(c.deviceId), text: c.text, ts: c.ts })
    entry.commentCount = entry.comments.length
  }

  return map
}

export function lastActivityTs(data) {
  let max = 0
  for (const list of [data.favorites, data.comments, data.submissions]) {
    for (const item of list || []) if (item.ts > max) max = item.ts
  }
  return max
}

export function hasFeedback(data) {
  return (data.favorites?.length || 0) > 0 || (data.comments?.length || 0) > 0
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/client-engagement/aggregateByPhoto.test.js`
Expected: PASS (all 7).

- [ ] **Step 5: Commit**

```bash
git add common/clientEngagement.js __tests__/client-engagement/aggregateByPhoto.test.js
git commit -m "feat(client): per-photo engagement aggregation reducer"
```

---

### Task 2: Extend `/api/admin/engagement` with per-page mode

**Files:**
- Modify: `pages/api/admin/engagement.js`
- Test: `__tests__/client-engagement/adminEngagement.pageMode.test.js` (create)

**Interfaces:**
- Consumes: `aggregateByPhoto`, `lastActivityTs`, `hasFeedback` from Task 1; `readEngagement(userId, pageId)` from `common/clientEngagement.js`.
- Produces: `GET /api/admin/engagement?pageId=<id>` → `{ pageId, byPhoto, lastActivityTs, hasFeedback }`. Without `pageId`, response is unchanged (`{ events, pages }`).

- [ ] **Step 1: Write the failing test**

Create `__tests__/client-engagement/adminEngagement.pageMode.test.js`:

```js
jest.mock('@/common/withAuth', () => ({ withAuth: (h) => (req, res) => h(req, res, { id: 'u1' }) }))

const mockDownload = jest.fn()
jest.mock('@/common/gcsClient', () => ({
  listFiles: jest.fn(),
  downloadJSON: (...a) => mockDownload(...a),
}))
jest.mock('@/common/siteConfig', () => ({ readSiteConfig: jest.fn() }))

import handler from '@/pages/api/admin/engagement'

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockDownload.mockResolvedValue({
    people: { d1: { name: 'Priya', email: 'p@x.com' } },
    favorites: [{ photoUrl: 'https://cdn/a.jpg', deviceId: 'd1', ts: 10 }],
    comments: [{ id: 'c1', photoUrl: 'https://cdn/a.jpg', deviceId: 'd1', text: 'love it', ts: 20 }],
    submissions: [],
  })
})

it('returns a per-photo map for a pageId, names only (no emails)', async () => {
  const res = mockRes()
  await handler({ method: 'GET', query: { pageId: 'p1' } }, res)
  expect(mockDownload).toHaveBeenCalledWith('users/u1/client-data/p1.json')
  const body = res.json.mock.calls[0][0]
  expect(body.pageId).toBe('p1')
  expect(body.hasFeedback).toBe(true)
  expect(body.lastActivityTs).toBe(20)
  expect(body.byPhoto['https://cdn/a.jpg']).toMatchObject({ favCount: 1, favBy: ['Priya'], commentCount: 1 })
  expect(JSON.stringify(body)).not.toContain('p@x.com')
})

it('returns empty shape when the page file is missing', async () => {
  mockDownload.mockRejectedValue(new Error('not found'))
  const res = mockRes()
  await handler({ method: 'GET', query: { pageId: 'nope' } }, res)
  expect(res.json.mock.calls[0][0]).toEqual({ pageId: 'nope', byPhoto: {}, lastActivityTs: 0, hasFeedback: false })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/client-engagement/adminEngagement.pageMode.test.js`
Expected: FAIL (returns the cross-page `events` shape / `byPhoto` undefined).

- [ ] **Step 3: Implement the per-page branch**

In `pages/api/admin/engagement.js`, update the import line and add an early branch at the top of `handler` (after the method check). New import:

```js
import { readEngagement, aggregateByPhoto, lastActivityTs, hasFeedback } from '../../../common/clientEngagement'
```

Insert immediately after `if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })`:

```js
  const pageId = req.query?.pageId
  if (pageId) {
    try {
      const data = await readEngagement(user.id, pageId)
      return res.status(200).json({
        pageId,
        byPhoto: aggregateByPhoto(data),
        lastActivityTs: lastActivityTs(data),
        hasFeedback: hasFeedback(data),
      })
    } catch (err) {
      console.error('[admin/engagement pageMode]', err)
      return res.status(200).json({ pageId, byPhoto: {}, lastActivityTs: 0, hasFeedback: false })
    }
  }
```

Note: `readEngagement` already swallows a missing file and returns `emptyEngagement()`, so the empty-shape test passes through the normal path; the catch is a belt-and-suspenders guard.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/client-engagement/adminEngagement.pageMode.test.js __tests__/client-engagement/adminEngagement.route.test.js`
Expected: PASS (both suites — the existing no-`pageId` feed test must still pass; add `query: {}` is already absent in that test so `req.query?.pageId` is undefined).

- [ ] **Step 5: Commit**

```bash
git add pages/api/admin/engagement.js __tests__/client-engagement/adminEngagement.pageMode.test.js
git commit -m "feat(client): per-page photo-feedback mode on admin engagement API"
```

---

### Task 3: `PhotoFeedbackBadge` presentational component

**Files:**
- Create: `components/image-displays/engagement/PhotoFeedbackBadge.js`
- Test: `__tests__/client-engagement/photoFeedbackBadge.test.js` (create)

**Interfaces:**
- Produces: `default PhotoFeedbackBadge({ favCount = 0, commentCount = 0, onOpen })` — renders a compact bottom-left corner pill showing only non-zero counts; renders `null` when both are zero; the pill is a `<button aria-label="View client feedback">` calling `onOpen`. Placed in `image-displays/engagement/` so both the admin block cards and the shared preview overlay can import it without an admin→ direction inversion.

- [ ] **Step 1: Write the failing test**

Create `__tests__/client-engagement/photoFeedbackBadge.test.js`:

```js
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PhotoFeedbackBadge from '@/components/image-displays/engagement/PhotoFeedbackBadge'

it('renders nothing when there is no feedback', () => {
  const { container } = render(<PhotoFeedbackBadge favCount={0} commentCount={0} />)
  expect(container.firstChild).toBeNull()
})

it('shows only the non-zero counts', () => {
  render(<PhotoFeedbackBadge favCount={3} commentCount={0} />)
  const btn = screen.getByLabelText('View client feedback')
  expect(btn.textContent).toContain('3')
  expect(btn.querySelectorAll('svg')).toHaveLength(1) // heart only
})

it('shows both icons when both counts are set and fires onOpen', async () => {
  const onOpen = jest.fn()
  render(<PhotoFeedbackBadge favCount={2} commentCount={5} onOpen={onOpen} />)
  const btn = screen.getByLabelText('View client feedback')
  expect(btn.querySelectorAll('svg')).toHaveLength(2)
  expect(btn.textContent).toContain('2')
  expect(btn.textContent).toContain('5')
  await userEvent.click(btn)
  expect(onOpen).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/client-engagement/photoFeedbackBadge.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement the component**

Create `components/image-displays/engagement/PhotoFeedbackBadge.js`:

```js
// components/image-displays/engagement/PhotoFeedbackBadge.js
// Static, read-only feedback badge shown to the photographer on a photo in the
// editor (block cards + live preview). Presentational only — the caller supplies
// counts and the open handler. Renders nothing when there is no feedback.
import React from 'react'

function Heart() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="#c14a4a" stroke="#c14a4a" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  )
}

function Comment() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
    </svg>
  )
}

export default function PhotoFeedbackBadge({ favCount = 0, commentCount = 0, onOpen }) {
  if (!favCount && !commentCount) return null
  return (
    <button
      type="button"
      aria-label="View client feedback"
      onClick={(e) => { e.stopPropagation(); onOpen && onOpen() }}
      className="absolute bottom-1 left-1 z-20 inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5"
      style={{
        background: 'rgba(249,245,238,0.94)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        border: 'none',
        boxShadow: '0 1px 4px rgba(20,14,8,0.22)',
        fontSize: 10,
        lineHeight: 1,
        color: '#2c2416',
        cursor: 'pointer',
      }}
    >
      {favCount > 0 && (
        <span className="inline-flex items-center gap-0.5"><Heart />{favCount}</span>
      )}
      {commentCount > 0 && (
        <span className="inline-flex items-center gap-0.5"><Comment />{commentCount}</span>
      )}
    </button>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/client-engagement/photoFeedbackBadge.test.js`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add components/image-displays/engagement/PhotoFeedbackBadge.js __tests__/client-engagement/photoFeedbackBadge.test.js
git commit -m "feat(client): PhotoFeedbackBadge presentational component"
```

---

### Task 4: `PhotoFeedbackPopover` read popover

**Files:**
- Create: `components/admin/gallery-builder/PhotoFeedbackPopover.js`
- Test: `__tests__/client-engagement/photoFeedbackPopover.test.js` (create)

**Interfaces:**
- Consumes: a `feedback` object shaped like one entry of `aggregateByPhoto` output: `{ favBy, favCount, comments: {id,name,text,ts}[], commentCount }`.
- Produces: `default PhotoFeedbackPopover({ feedback, onClose })` — a fixed, centered read-only card. Shows "Favorited by <names>" and each comment as `name · timeAgo` + text. A close button (`aria-label="Close"`) and a backdrop click both call `onClose`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/client-engagement/photoFeedbackPopover.test.js`:

```js
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PhotoFeedbackPopover from '@/components/admin/gallery-builder/PhotoFeedbackPopover'

const feedback = {
  favBy: ['Priya', 'Raj'],
  favCount: 2,
  comments: [
    { id: 'c1', name: 'Priya', text: 'mom wants this', ts: Date.now() - 60000 },
    { id: 'c2', name: 'Raj', text: 'gorgeous', ts: Date.now() - 3600000 },
  ],
  commentCount: 2,
}

it('lists who favorited and every comment', () => {
  render(<PhotoFeedbackPopover feedback={feedback} onClose={() => {}} />)
  expect(screen.getByText(/Priya, Raj/)).toBeTruthy()
  expect(screen.getByText('mom wants this')).toBeTruthy()
  expect(screen.getByText('gorgeous')).toBeTruthy()
})

it('closes via the close button', async () => {
  const onClose = jest.fn()
  render(<PhotoFeedbackPopover feedback={feedback} onClose={onClose} />)
  await userEvent.click(screen.getByLabelText('Close'))
  expect(onClose).toHaveBeenCalled()
})

it('shows an empty-comments hint when there are only favorites', () => {
  render(<PhotoFeedbackPopover feedback={{ favBy: ['Priya'], favCount: 1, comments: [], commentCount: 0 }} onClose={() => {}} />)
  expect(screen.getByText(/No comments/i)).toBeTruthy()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/client-engagement/photoFeedbackPopover.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement the component**

Create `components/admin/gallery-builder/PhotoFeedbackPopover.js`:

```js
// components/admin/gallery-builder/PhotoFeedbackPopover.js
// Read-only view of one photo's client feedback for the photographer: who
// favorited it and every comment. Opened from a PhotoFeedbackBadge.
import React from 'react'

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export default function PhotoFeedbackPopover({ feedback, onClose }) {
  const favBy = feedback?.favBy || []
  const comments = feedback?.comments || []
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      style={{ background: 'rgba(20,14,8,0.35)' }}
      onClick={onClose}
    >
      <div
        className="relative w-[340px] max-w-[90vw] max-h-[70vh] overflow-y-auto rounded-2xl p-4"
        style={{ background: 'var(--card, #fefcf8)', boxShadow: '0 8px 40px rgba(20,14,8,0.28)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-2.5 right-2.5 w-6 h-6 flex items-center justify-center rounded-full"
          style={{ color: 'var(--text-muted)', background: 'transparent' }}
        >
          ✕
        </button>
        <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
          Client feedback
        </div>
        {favBy.length > 0 && (
          <div className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
            <span style={{ color: '#c14a4a' }}>❤</span> Favorited by {favBy.join(', ')}
          </div>
        )}
        {comments.length === 0 ? (
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>No comments on this photo.</div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {comments.map((c) => (
              <div key={c.id}>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.name} · {timeAgo(c.ts)}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/client-engagement/photoFeedbackPopover.test.js`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add components/admin/gallery-builder/PhotoFeedbackPopover.js __tests__/client-engagement/photoFeedbackPopover.test.js
git commit -m "feat(client): PhotoFeedbackPopover read view"
```

---

### Task 5: `EditorFeedbackContext` provider + `EditorPhotoBadge`

**Files:**
- Create: `components/admin/gallery-builder/EditorFeedbackContext.js`
- Test: `__tests__/client-engagement/editorFeedbackContext.test.js` (create)

**Interfaces:**
- Consumes: `PhotoFeedbackBadge` (Task 3), `PhotoFeedbackPopover` (Task 4).
- Produces:
  - `EditorFeedbackProvider({ pageId, feedbackByPhoto, hasFeedback, lastActivityTs, children })` — owns `showFeedback` (persisted to `localStorage['sepia:show-feedback']`) and the open-popover state; renders `PhotoFeedbackPopover` when a photo is open.
  - `useEditorFeedback() → { pageId, showFeedback, setShowFeedback, hasFeedback, lastActivityTs, feedbackByPhoto, openPhoto }` (or `null` outside a provider).
  - `EditorPhotoBadge({ url })` — reads context; renders a `PhotoFeedbackBadge` for `url` only when `showFeedback` and feedback for that url exist; on open calls `openPhoto(url)`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/client-engagement/editorFeedbackContext.test.js`:

```js
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorFeedbackProvider, EditorPhotoBadge, useEditorFeedback } from '@/components/admin/gallery-builder/EditorFeedbackContext'

const byPhoto = {
  'https://cdn/a.jpg': { favBy: ['Priya'], favCount: 1, comments: [{ id: 'c1', name: 'Priya', text: 'love it', ts: Date.now() }], commentCount: 1 },
}

function Toggle() {
  const { showFeedback, setShowFeedback } = useEditorFeedback()
  return <button onClick={() => setShowFeedback(!showFeedback)}>toggle {String(showFeedback)}</button>
}

beforeEach(() => localStorage.clear())

it('badge is hidden until showFeedback is on, then opens the popover', async () => {
  render(
    <EditorFeedbackProvider pageId="p1" feedbackByPhoto={byPhoto} hasFeedback lastActivityTs={5}>
      <div style={{ position: 'relative' }}><EditorPhotoBadge url="https://cdn/a.jpg" /></div>
      <Toggle />
    </EditorFeedbackProvider>
  )
  expect(screen.queryByLabelText('View client feedback')).toBeNull()
  await userEvent.click(screen.getByText(/toggle false/))
  await userEvent.click(screen.getByLabelText('View client feedback'))
  expect(await screen.findByText('love it')).toBeTruthy()
})

it('renders no badge for a url with no feedback', async () => {
  render(
    <EditorFeedbackProvider pageId="p1" feedbackByPhoto={byPhoto} hasFeedback lastActivityTs={5}>
      <div style={{ position: 'relative' }}><EditorPhotoBadge url="https://cdn/none.jpg" /></div>
      <Toggle />
    </EditorFeedbackProvider>
  )
  await userEvent.click(screen.getByText(/toggle false/))
  expect(screen.queryByLabelText('View client feedback')).toBeNull()
})

it('persists showFeedback across remounts via localStorage', () => {
  localStorage.setItem('sepia:show-feedback', '1')
  render(
    <EditorFeedbackProvider pageId="p1" feedbackByPhoto={byPhoto} hasFeedback lastActivityTs={5}>
      <div style={{ position: 'relative' }}><EditorPhotoBadge url="https://cdn/a.jpg" /></div>
    </EditorFeedbackProvider>
  )
  expect(screen.getByLabelText('View client feedback')).toBeTruthy()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/client-engagement/editorFeedbackContext.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement the context**

Create `components/admin/gallery-builder/EditorFeedbackContext.js`:

```js
// components/admin/gallery-builder/EditorFeedbackContext.js
// Supplies per-photo client feedback to the editor's block cards and preview.
// Badges self-gate on this context, mirroring how the public EngagementActions
// self-gates on ClientEngagementContext — so no feedback props are threaded
// through the large BlockCard. `showFeedback` is a photographer view preference
// persisted in localStorage; it is never written to siteConfig.
import React, { createContext, useContext, useCallback, useMemo, useState } from 'react'
import PhotoFeedbackBadge from '../../image-displays/engagement/PhotoFeedbackBadge'
import PhotoFeedbackPopover from './PhotoFeedbackPopover'

const SHOW_KEY = 'sepia:show-feedback'
const Ctx = createContext(null)

export function useEditorFeedback() { return useContext(Ctx) }

function readShow() {
  try { return localStorage.getItem(SHOW_KEY) === '1' } catch { return false }
}

export function EditorFeedbackProvider({ pageId, feedbackByPhoto, hasFeedback, lastActivityTs, children }) {
  const [showFeedback, setShow] = useState(readShow)
  const [openUrl, setOpenUrl] = useState(null)

  const setShowFeedback = useCallback((next) => {
    setShow(next)
    try { localStorage.setItem(SHOW_KEY, next ? '1' : '0') } catch {}
  }, [])

  const value = useMemo(() => ({
    pageId,
    showFeedback,
    setShowFeedback,
    hasFeedback: !!hasFeedback,
    lastActivityTs: lastActivityTs || 0,
    feedbackByPhoto: feedbackByPhoto || {},
    openPhoto: (url) => setOpenUrl(url),
  }), [pageId, showFeedback, setShowFeedback, hasFeedback, lastActivityTs, feedbackByPhoto])

  const openFeedback = openUrl ? (feedbackByPhoto || {})[openUrl] : null

  return (
    <Ctx.Provider value={value}>
      {children}
      {openFeedback && <PhotoFeedbackPopover feedback={openFeedback} onClose={() => setOpenUrl(null)} />}
    </Ctx.Provider>
  )
}

export function EditorPhotoBadge({ url }) {
  const ctx = useEditorFeedback()
  if (!ctx || !ctx.showFeedback) return null
  const fb = ctx.feedbackByPhoto[url]
  if (!fb) return null
  return <PhotoFeedbackBadge favCount={fb.favCount} commentCount={fb.commentCount} onOpen={() => ctx.openPhoto(url)} />
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/client-engagement/editorFeedbackContext.test.js`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add components/admin/gallery-builder/EditorFeedbackContext.js __tests__/client-engagement/editorFeedbackContext.test.js
git commit -m "feat(client): editor feedback context + self-gating photo badge"
```

---

### Task 6: `useClientFeedback` fetch hook

**Files:**
- Create: `components/admin/platform/useClientFeedback.js`
- Test: `__tests__/client-engagement/useClientFeedback.test.js` (create)

**Interfaces:**
- Produces: `useClientFeedback(pageId, enabled) → { byPhoto, lastActivityTs, hasFeedback, loading }`. Fetches `/api/admin/engagement?pageId=<pageId>` once when `enabled` and `pageId` are truthy. When disabled or on failure, returns the empty shape (`byPhoto: {}`, `hasFeedback: false`).

- [ ] **Step 1: Write the failing test**

Create `__tests__/client-engagement/useClientFeedback.test.js`:

```js
import { renderHook, waitFor } from '@testing-library/react'
import { useClientFeedback } from '@/components/admin/platform/useClientFeedback'

beforeEach(() => { jest.restoreAllMocks() })

it('fetches per-page feedback when enabled', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ pageId: 'p1', byPhoto: { 'u': { favCount: 1, favBy: ['A'], comments: [], commentCount: 0 } }, lastActivityTs: 9, hasFeedback: true }),
  })
  const { result } = renderHook(() => useClientFeedback('p1', true))
  await waitFor(() => expect(result.current.hasFeedback).toBe(true))
  expect(global.fetch).toHaveBeenCalledWith('/api/admin/engagement?pageId=p1')
  expect(result.current.byPhoto.u.favCount).toBe(1)
  expect(result.current.lastActivityTs).toBe(9)
})

it('does not fetch when disabled', () => {
  global.fetch = jest.fn()
  const { result } = renderHook(() => useClientFeedback('p1', false))
  expect(global.fetch).not.toHaveBeenCalled()
  expect(result.current.hasFeedback).toBe(false)
  expect(result.current.byPhoto).toEqual({})
})

it('returns empty shape on fetch failure', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('boom'))
  const { result } = renderHook(() => useClientFeedback('p1', true))
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(result.current.hasFeedback).toBe(false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/client-engagement/useClientFeedback.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement the hook**

Create `components/admin/platform/useClientFeedback.js`:

```js
// components/admin/platform/useClientFeedback.js
// Fetches one page's per-photo client feedback for the editor. Fetches only when
// client features are enabled on the page; failures degrade to "no feedback".
import { useEffect, useState } from 'react'

const EMPTY = { byPhoto: {}, lastActivityTs: 0, hasFeedback: false }

export function useClientFeedback(pageId, enabled) {
  const [state, setState] = useState({ ...EMPTY, loading: !!(enabled && pageId) })

  useEffect(() => {
    if (!enabled || !pageId) { setState({ ...EMPTY, loading: false }); return }
    let alive = true
    setState((s) => ({ ...s, loading: true }))
    fetch(`/api/admin/engagement?pageId=${encodeURIComponent(pageId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return
        if (!d) { setState({ ...EMPTY, loading: false }); return }
        setState({
          byPhoto: d.byPhoto || {},
          lastActivityTs: d.lastActivityTs || 0,
          hasFeedback: !!d.hasFeedback,
          loading: false,
        })
      })
      .catch(() => { if (alive) setState({ ...EMPTY, loading: false }) })
    return () => { alive = false }
  }, [pageId, enabled])

  return state
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/client-engagement/useClientFeedback.test.js`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add components/admin/platform/useClientFeedback.js __tests__/client-engagement/useClientFeedback.test.js
git commit -m "feat(client): useClientFeedback editor fetch hook"
```

---

### Task 7: `ClientFeedbackBanner` one-time discovery banner

**Files:**
- Create: `components/admin/platform/ClientFeedbackBanner.js`
- Test: `__tests__/client-engagement/clientFeedbackBanner.test.js` (create)

**Interfaces:**
- Consumes: `useEditorFeedback` (Task 5) for `pageId`, `hasFeedback`, `lastActivityTs`, `setShowFeedback`; and the per-photo map for the summary line.
- Produces: `default ClientFeedbackBanner()` — renders a slim banner only when `hasFeedback` and `lastActivityTs > localStorage['sepia:feedback-seen:<pageId>']`. Actions: **Show on photos** (sets `showFeedback` on + marks seen) and **✕** (marks seen only). Renders `null` otherwise.

- [ ] **Step 1: Write the failing test**

Create `__tests__/client-engagement/clientFeedbackBanner.test.js`:

```js
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorFeedbackProvider } from '@/components/admin/gallery-builder/EditorFeedbackContext'
import ClientFeedbackBanner from '@/components/admin/platform/ClientFeedbackBanner'

const byPhoto = {
  'a': { favBy: ['Priya'], favCount: 3, comments: [{ id: 'c', name: 'Raj', text: 'x', ts: 1 }], commentCount: 1 },
}

function wrap(ui) {
  return render(
    <EditorFeedbackProvider pageId="p1" feedbackByPhoto={byPhoto} hasFeedback lastActivityTs={100}>
      {ui}
    </EditorFeedbackProvider>
  )
}

beforeEach(() => localStorage.clear())

it('shows a summary when there is unseen feedback', () => {
  wrap(<ClientFeedbackBanner />)
  expect(screen.getByText(/favorite/i)).toBeTruthy()
})

it('is hidden once the page has been marked seen at/after lastActivityTs', () => {
  localStorage.setItem('sepia:feedback-seen:p1', '100')
  wrap(<ClientFeedbackBanner />)
  expect(screen.queryByText(/Show on photos/i)).toBeNull()
})

it('"Show on photos" marks seen and dismisses', async () => {
  wrap(<ClientFeedbackBanner />)
  await userEvent.click(screen.getByText(/Show on photos/i))
  expect(screen.queryByText(/Show on photos/i)).toBeNull()
  expect(localStorage.getItem('sepia:feedback-seen:p1')).toBe('100')
})

it('✕ marks seen without changing the toggle', async () => {
  wrap(<ClientFeedbackBanner />)
  await userEvent.click(screen.getByLabelText('Dismiss'))
  expect(screen.queryByText(/Show on photos/i)).toBeNull()
  expect(localStorage.getItem('sepia:show-feedback')).not.toBe('1')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/client-engagement/clientFeedbackBanner.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement the banner**

Create `components/admin/platform/ClientFeedbackBanner.js`:

```js
// components/admin/platform/ClientFeedbackBanner.js
// One-time, per-page discovery banner for new client feedback. Appears when a
// page has feedback the photographer hasn't seen; "Show on photos" turns on the
// editor badges. "Seen" is tracked per page in localStorage, distinct from the
// masthead bell's own last-seen key.
import React, { useMemo, useState } from 'react'
import { useEditorFeedback } from '../gallery-builder/EditorFeedbackContext'

const seenKey = (pageId) => `sepia:feedback-seen:${pageId}`

function readSeen(pageId) {
  try { return parseInt(localStorage.getItem(seenKey(pageId)) || '0', 10) } catch { return 0 }
}
function markSeen(pageId, ts) {
  try { localStorage.setItem(seenKey(pageId), String(ts)) } catch {}
}

export default function ClientFeedbackBanner() {
  const ctx = useEditorFeedback()
  const [dismissed, setDismissed] = useState(false)

  const { favTotal, comTotal } = useMemo(() => {
    let favTotal = 0, comTotal = 0
    for (const fb of Object.values(ctx?.feedbackByPhoto || {})) {
      favTotal += fb.favCount || 0
      comTotal += fb.commentCount || 0
    }
    return { favTotal, comTotal }
  }, [ctx?.feedbackByPhoto])

  if (!ctx || !ctx.hasFeedback || dismissed) return null
  if (ctx.lastActivityTs <= readSeen(ctx.pageId)) return null

  const close = () => { markSeen(ctx.pageId, ctx.lastActivityTs); setDismissed(true) }
  const show = () => { ctx.setShowFeedback(true); close() }

  const parts = []
  if (favTotal) parts.push(`${favTotal} favorite${favTotal === 1 ? '' : 's'}`)
  if (comTotal) parts.push(`${comTotal} comment${comTotal === 1 ? '' : 's'}`)

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 text-xs"
      style={{ background: 'rgba(193,74,74,0.08)', borderBottom: '1px solid rgba(193,74,74,0.18)', color: 'var(--text-secondary)' }}
    >
      <span><span style={{ color: '#c14a4a' }}>❤</span> Your client left {parts.join(' and ')}.</span>
      <button type="button" onClick={show} className="font-semibold underline" style={{ color: '#c14a4a', background: 'transparent' }}>
        Show on photos
      </button>
      <button type="button" aria-label="Dismiss" onClick={close} className="ml-auto" style={{ color: 'var(--text-muted)', background: 'transparent' }}>
        ✕
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/client-engagement/clientFeedbackBanner.test.js`
Expected: PASS (4).

- [ ] **Step 5: Commit**

```bash
git add components/admin/platform/ClientFeedbackBanner.js __tests__/client-engagement/clientFeedbackBanner.test.js
git commit -m "feat(client): one-time client-feedback discovery banner"
```

---

### Task 8: Wire into the editor — provider, toggle, block-card badges

**Files:**
- Modify: `components/admin/platform/BlockPageEditor.js`
- Modify: `components/admin/gallery-builder/BlockBuilder.js`
- Modify: `components/admin/gallery-builder/BlockCard.js`

**Interfaces:**
- Consumes: `useClientFeedback` (Task 6), `EditorFeedbackProvider` / `useEditorFeedback` / `EditorPhotoBadge` (Task 5), `ClientFeedbackBanner` (Task 7).
- Produces: no new exports — this is integration wiring.

This task has no unit test (it wires existing, individually-tested units into a large presentational tree). Verification is via the full suite plus a manual editor check.

- [ ] **Step 1: `BlockPageEditor` — fetch feedback, wrap in provider, render banner**

In `components/admin/platform/BlockPageEditor.js`:

Add imports near the top:

```js
import { useClientFeedback } from './useClientFeedback'
import { EditorFeedbackProvider } from '../gallery-builder/EditorFeedbackContext'
import ClientFeedbackBanner from './ClientFeedbackBanner'
```

Inside `BlockPageEditor({ page, siteConfig, saveStatus, onPageChange })`, after the existing hooks, add:

```js
  const feedback = useClientFeedback(page.id, !!page.clientFeatures?.enabled)
```

Wrap the returned tree. The current return is:

```js
  return (
    <div className="flex h-full">
      <BlockBuilder ... />
      <GalleryPreview ... />
    </div>
  )
```

Change it to wrap in the provider and add the banner as a column above the row:

```js
  return (
    <EditorFeedbackProvider
      pageId={page.id}
      feedbackByPhoto={feedback.byPhoto}
      hasFeedback={feedback.hasFeedback}
      lastActivityTs={feedback.lastActivityTs}
    >
      <div className="flex flex-col h-full">
        <ClientFeedbackBanner />
        <div className="flex flex-1 min-h-0">
          <BlockBuilder ... />
          <GalleryPreview ... />
        </div>
      </div>
    </EditorFeedbackProvider>
  )
```

(Keep the existing `...` props on `BlockBuilder` and `GalleryPreview` exactly as they are; only the wrapping changes. `min-h-0` preserves the child scroll behavior inside the flex column.)

- [ ] **Step 2: `BlockBuilder` — add the view toggle to the header**

In `components/admin/gallery-builder/BlockBuilder.js`, add the import:

```js
import { useEditorFeedback } from './EditorFeedbackContext'
```

Inside the `BlockBuilder` component body, read the context:

```js
  const feedbackCtx = useEditorFeedback()
```

In the header/toolbar row (where the existing `onToggleExpand` control renders), add the toggle. Render it only when there is feedback:

```js
  {feedbackCtx?.hasFeedback && (
    <button
      type="button"
      onClick={() => feedbackCtx.setShowFeedback(!feedbackCtx.showFeedback)}
      title="Show client hearts and comments on your photos"
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
      style={{
        background: feedbackCtx.showFeedback ? 'rgba(193,74,74,0.12)' : 'transparent',
        color: feedbackCtx.showFeedback ? '#c14a4a' : 'var(--text-secondary)',
        border: '1px solid rgba(193,74,74,0.25)',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill={feedbackCtx.showFeedback ? '#c14a4a' : 'none'} stroke="#c14a4a" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
      Client feedback
    </button>
  )}
```

Locate the header by searching for `onToggleExpand` in the file and place this button adjacent to that control (same flex row).

- [ ] **Step 3: `BlockCard` — badges on single photo and grid thumbs**

In `components/admin/gallery-builder/BlockCard.js`, add the import:

```js
import { EditorPhotoBadge } from './EditorFeedbackContext'
```

**Grid thumbs (PhotoThumb):** the `PhotoThumb` container `div` (line ~181, the one with `className={`relative group/thumb ...`}`) already establishes `relative`. Just before its closing `</div>`, add:

```js
      <EditorPhotoBadge url={imageRef.url} />
```

**Single-photo preview:** the single-photo `<img>` (around line 755–790, guarded by `{block.imageUrl ? (`) sits inside a container. Add the badge as a sibling of that `<img>` inside its nearest positioned (`relative`) wrapper:

```js
      <EditorPhotoBadge url={block.imageUrl} />
```

If the single-photo wrapper is not already `relative`, add `relative` to its className so the absolutely-positioned badge anchors to the thumbnail (the badge uses `absolute bottom-1 left-1`). Verify by eye in Step 5.

- [ ] **Step 4: Run the full suite**

Run: `npx jest`
Expected: PASS for all client-engagement suites and no new failures. (Pre-existing unrelated failures noted in the branch — stale siteConfig/CrossBlockDrag — may remain; do not fix here. Confirm the count matches the pre-task baseline.)

- [ ] **Step 5: Manual editor verification**

The dev server runs on port 3000 (this workspace). Do NOT run `next build`.
- Open a page in the editor that has client engagement recorded (or seed one).
- Confirm: the "Client feedback" toggle appears in the block editor header only when the page has feedback; toggling it shows/hides ❤/💬 badges on block-card thumbnails; clicking a badge opens the read popover with names + comments; the one-time banner appears once and "Show on photos" enables the toggle.

- [ ] **Step 6: Commit**

```bash
git add components/admin/platform/BlockPageEditor.js components/admin/gallery-builder/BlockBuilder.js components/admin/gallery-builder/BlockCard.js
git commit -m "feat(client): show client feedback on editor block cards + view toggle"
```

---

### Task 9: Preview parity — review-mode engagement provider

**Files:**
- Modify: `components/image-displays/engagement/ClientEngagementContext.js` (add `ReviewFeedbackProvider`)
- Modify: `components/image-displays/engagement/EngagementActions.js` (add `mode: 'review'` branch)
- Modify: `components/admin/gallery-builder/GalleryPreview.js` (wrap preview when `showFeedback`)
- Test: `__tests__/client-engagement/engagementActions.reviewMode.test.js` (create)

**Interfaces:**
- Consumes: `PhotoFeedbackBadge` (Task 3), `useEditorFeedback` (Task 5).
- Produces: `ReviewFeedbackProvider({ feedbackByPhoto, onOpenPhoto, children })` exported from `ClientEngagementContext.js`, providing a read-only context value with `mode: 'review'`, `favoriteCount(url)`, `commentCount(url)`, and `openReview(url)`. `EngagementActions` renders a static `PhotoFeedbackBadge` in review mode.

- [ ] **Step 1: Write the failing test**

Create `__tests__/client-engagement/engagementActions.reviewMode.test.js`:

```js
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReviewFeedbackProvider } from '@/components/image-displays/engagement/ClientEngagementContext'
import EngagementActions from '@/components/image-displays/engagement/EngagementActions'

const byPhoto = {
  'https://cdn/a.jpg': { favBy: ['Priya'], favCount: 2, comments: [], commentCount: 1 },
}

it('renders a static feedback badge in review mode and calls onOpenPhoto', async () => {
  const onOpenPhoto = jest.fn()
  render(
    <ReviewFeedbackProvider feedbackByPhoto={byPhoto} onOpenPhoto={onOpenPhoto}>
      <EngagementActions imageUrl="https://cdn/a.jpg" />
    </ReviewFeedbackProvider>
  )
  const badge = screen.getByLabelText('View client feedback')
  expect(badge.textContent).toContain('2') // favs
  expect(badge.textContent).toContain('1') // comments
  // no interactive client buttons in review mode
  expect(screen.queryByLabelText('Favorite photo')).toBeNull()
  await userEvent.click(badge)
  expect(onOpenPhoto).toHaveBeenCalledWith('https://cdn/a.jpg')
})

it('renders nothing in review mode for a photo with no feedback', () => {
  const { container } = render(
    <ReviewFeedbackProvider feedbackByPhoto={byPhoto} onOpenPhoto={() => {}}>
      <EngagementActions imageUrl="https://cdn/none.jpg" />
    </ReviewFeedbackProvider>
  )
  expect(container.querySelector('[aria-label="View client feedback"]')).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/client-engagement/engagementActions.reviewMode.test.js`
Expected: FAIL — `ReviewFeedbackProvider` not exported.

- [ ] **Step 3: Add `ReviewFeedbackProvider` to `ClientEngagementContext.js`**

In `components/image-displays/engagement/ClientEngagementContext.js`, add (the module already defines `const Ctx = createContext(null)`; reuse it so `EngagementActions`' `useClientEngagement()` reads this provider):

```js
// Read-only "review" context for the editor preview: EngagementActions renders
// a static feedback badge (no client interactions). Shares Ctx so the existing
// engagementOverlay slot in every gallery layout lights up unchanged.
export function ReviewFeedbackProvider({ feedbackByPhoto, onOpenPhoto, children }) {
  const value = useMemo(() => ({
    mode: 'review',
    features: { favorites: true, comments: true },
    favoriteCount: (url) => feedbackByPhoto?.[url]?.favCount || 0,
    commentCount: (url) => feedbackByPhoto?.[url]?.commentCount || 0,
    openReview: (url) => onOpenPhoto && onOpenPhoto(url),
    // no-op client surface so any accidental call is harmless
    isFavorited: () => false,
    toggleFavorite: () => {},
    openComments: (url) => onOpenPhoto && onOpenPhoto(url),
  }), [feedbackByPhoto, onOpenPhoto])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
```

- [ ] **Step 4: Add the review branch to `EngagementActions.js`**

In `components/image-displays/engagement/EngagementActions.js`, add the import at the top:

```js
import PhotoFeedbackBadge from './PhotoFeedbackBadge'
```

At the start of the component body, before the existing `const mine = ...`, add the review-mode branch:

```js
export default function EngagementActions({ imageUrl }) {
  const ctx = useClientEngagement()
  if (!ctx) return null

  if (ctx.mode === 'review') {
    return (
      <PhotoFeedbackBadge
        favCount={ctx.favoriteCount(imageUrl)}
        commentCount={ctx.commentCount(imageUrl)}
        onOpen={() => ctx.openReview(imageUrl)}
      />
    )
  }

  if (!ctx.features.favorites && !ctx.features.comments) return null
  // ...existing client-mode body unchanged...
```

(Keep the rest of the client-mode render exactly as it is. Note: the badge is `absolute bottom-1 left-1`; the layouts' overlay wrappers are positioned containers, so it anchors correctly.)

- [ ] **Step 5: Wrap the preview in `GalleryPreview.js`**

In `components/admin/gallery-builder/GalleryPreview.js`, add imports:

```js
import { useEditorFeedback } from './EditorFeedbackContext'
import { ReviewFeedbackProvider } from '../../image-displays/engagement/ClientEngagementContext'
```

Inside `GalleryPreview`, read the context:

```js
  const feedbackCtx = useEditorFeedback()
```

Find where the component returns its rendered gallery tree (the `<ThemeProvider>...</ThemeProvider>` / `<Gallery ... />` block). Wrap that returned tree so that, when `feedbackCtx?.showFeedback`, it is inside a `ReviewFeedbackProvider`:

```js
  const inner = ( /* existing ThemeProvider/Gallery tree */ )

  if (feedbackCtx?.showFeedback && feedbackCtx.hasFeedback) {
    return (
      <ReviewFeedbackProvider
        feedbackByPhoto={feedbackCtx.feedbackByPhoto}
        onOpenPhoto={feedbackCtx.openPhoto}
      >
        {inner}
      </ReviewFeedbackProvider>
    )
  }
  return inner
```

If the file already assigns the tree to a variable named `inner` (it references `inner` in the memo comment), reuse/extend that; otherwise introduce the `inner` variable around the existing returned JSX without changing the JSX itself.

The popover is rendered by `EditorFeedbackProvider` (Task 5) which wraps the whole editor, so `openPhoto` opens the same popover for the preview — no extra popover wiring here.

- [ ] **Step 6: Run the review-mode test + full suite**

Run: `npx jest __tests__/client-engagement/engagementActions.reviewMode.test.js`
Expected: PASS (2).

Run: `npx jest`
Expected: existing client-mode `engagementActions.test.js` still PASS (the `if (!ctx) return null` refactor preserves the "renders nothing outside a provider" behavior); no new failures beyond the pre-existing baseline.

- [ ] **Step 7: Manual preview verification**

- With `showFeedback` on and a page that has feedback, confirm ❤/💬 badges appear on photos in the live preview across at least a photo block and a grid/masonry block; clicking a preview badge opens the same read popover.

- [ ] **Step 8: Commit**

```bash
git add components/image-displays/engagement/ClientEngagementContext.js components/image-displays/engagement/EngagementActions.js components/admin/gallery-builder/GalleryPreview.js __tests__/client-engagement/engagementActions.reviewMode.test.js
git commit -m "feat(client): client-feedback badges in the live editor preview"
```

---

## Self-Review

**Spec coverage:**
- Per-photo aggregation + name resolution → Task 1. ✓
- API `pageId` mode, names-only → Task 2. ✓
- `useClientFeedback` hook, gated on `clientFeatures.enabled` → Task 6. ✓
- View toggle outside Client Features, localStorage `sepia:show-feedback`, visible only when feedback exists → Task 5 (state) + Task 8 (toggle UI). ✓
- One-time per-page banner, `sepia:feedback-seen:<pageId>` → Task 7. ✓
- Badge component, non-zero-only, bottom-left → Task 3. ✓
- Block-card badges (single + grid) → Task 8. ✓
- Read popover (who favorited + comments) → Task 4, opened from both surfaces via Task 5 / Task 9. ✓
- Preview parity via review-mode provider reusing the overlay slot, no shared-layout edits → Task 9. ✓
- Error handling (missing file, fetch failure, orphaned url, localStorage) → Tasks 1/2/6 empty shapes, `EditorPhotoBadge` returns null for unknown url, try/catch in Tasks 5/7. ✓

**Placeholder scan:** No TBD/TODO; every code step contains full source. The two integration tasks (8, 9) reference existing JSX with `...`/"existing tree" only where the surrounding code is unchanged and located by an explicit search anchor (`onToggleExpand`, `block.imageUrl ?`, `ThemeProvider`/`Gallery`). ✓

**Type consistency:** `byPhoto` entry shape `{ favBy, favCount, comments:[{id,name,text,ts}], commentCount }` is identical across Tasks 1, 3, 4, 5, 9. Context accessor names (`showFeedback`, `setShowFeedback`, `hasFeedback`, `feedbackByPhoto`, `openPhoto`, `lastActivityTs`) match between Task 5 producer and Tasks 7/8/9 consumers. API response keys (`byPhoto`, `lastActivityTs`, `hasFeedback`) match between Task 2 producer and Task 6 consumer. Review context accessors (`mode`, `favoriteCount`, `commentCount`, `openReview`) match between Task 9 provider and `EngagementActions` branch. ✓

**Deviation from spec note:** The spec listed `PhotoFeedbackBadge` under `gallery-builder/`; the plan places it in `image-displays/engagement/` so the shared preview component (`EngagementActions`) can import it without a public→admin dependency inversion. Same component, better placement.
