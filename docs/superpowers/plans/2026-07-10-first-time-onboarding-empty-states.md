# First-Time Onboarding Tips & Welcoming Empty States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a first-time photographer a warm, guided welcome (opt-in spotlight tour + friendly empty states + a doorway after import) that teaches the few core concepts and never nags on return visits.

**Architecture:** A new `components/admin/onboarding/` module holds a self-contained `GuidedTour` overlay (welcome card + anchored spotlight steps resolved by `data-tour` selectors), a `useOnboarding` hook that reads/writes first-run flags on the GCS user profile, and two small presentational empty-state pieces (`EmptyHint` for sidebar sections, `CanvasEmptyState` for the main editor). The import "done" screen becomes a `ImportDoneStep` doorway. Persistence is a new `PATCH /api/admin/profile` that deep-merges an `onboarding` object.

**Tech Stack:** Next.js (pages router), React, Jest + @testing-library/react (jsdom), GCS JSON config. No new dependencies.

## Global Constraints

- **No em-dashes (—) in any user-facing copy.** Use commas, periods, or parentheses. This applies to every string in this plan and to the cleanup sweep in Task 8.
- **Anchoring uses `data-tour="<key>"` attributes**, never React ref threading. The tour resolves targets with `document.querySelector`.
- **All profile writes are best-effort.** A failed write must never block or crash the UI.
- **Follow existing style:** Fraunces serif for headings, mono small-caps (`MONO`) for labels, sepia palette (`--text-primary #2c2416`, `--text-secondary #7a6b55`, `--text-muted #a8967a`, accent `#8b6f47`, `--popover`, `--popover-shadow`). Buttons that use an inline `background` must set hover via `onMouseEnter/onMouseLeave` (inline bg beats tailwind `:hover`).
- **Tests live in `__tests__/**/*.test.js`**, `@/` maps to repo root, CJS-style Jest globals (no `import { jest }`), mock vars prefixed `mock`.

---

### Task 1: Profile onboarding flags (PATCH endpoint)

Adds a partial-merge `PATCH` to the profile route so the client can persist `onboarding` flags without re-sending username. The existing `PUT` (full profile write, requires username) is unchanged.

**Files:**
- Modify: `pages/api/admin/profile.js`
- Test: `__tests__/api/profile.patch.route.test.js`

**Interfaces:**
- Consumes: `readUserProfile(userId)`, `writeUserProfile(userId, profile)` from `@/common/userProfile` (already imported patterns exist in the file via `common/userProfile`).
- Produces: `PATCH /api/admin/profile` accepting `{ onboarding?: {welcomed?,tourDone?,blocksTipSeen?}, displayName?, bio? }`, returning the merged profile JSON. Deep-merges `onboarding` into the existing profile.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/api/profile.patch.route.test.js
jest.mock('@/common/withAuth', () => ({
  withAuth: (h) => (req, res) => h(req, res, { id: 'u1', name: 'Ann', email: 'a@x.co' }),
}))

const mockRead = jest.fn()
const mockWrite = jest.fn().mockResolvedValue()
jest.mock('@/common/userProfile', () => ({
  readUserProfile: (...a) => mockRead(...a),
  writeUserProfile: (...a) => mockWrite(...a),
  claimUsername: jest.fn(),
  lookupUserByUsername: jest.fn(),
}))

import handler from '@/pages/api/admin/profile'

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
}

describe('PATCH /api/admin/profile', () => {
  beforeEach(() => { mockRead.mockReset(); mockWrite.mockClear() })

  it('deep-merges onboarding flags without clobbering username or existing flags', async () => {
    mockRead.mockResolvedValue({ userId: 'u1', username: 'ann', onboarding: { welcomed: true } })
    const res = mockRes()
    await handler({ method: 'PATCH', body: { onboarding: { tourDone: true } } }, res)
    expect(res.status).toHaveBeenCalledWith(200)
    const saved = mockWrite.mock.calls[0][1]
    expect(saved.username).toBe('ann')
    expect(saved.onboarding).toEqual({ welcomed: true, tourDone: true })
  })

  it('returns 404 when no profile exists yet', async () => {
    mockRead.mockResolvedValue(null)
    const res = mockRes()
    await handler({ method: 'PATCH', body: { onboarding: { tourDone: true } } }, res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(mockWrite).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/api/profile.patch.route.test.js`
Expected: FAIL (PATCH returns 405 / handler has no PATCH branch)

- [ ] **Step 3: Add the PATCH branch**

In `pages/api/admin/profile.js`, insert this block immediately before the final `return res.status(405)...` line:

```javascript
  if (req.method === 'PATCH') {
    const existing = await readUserProfile(user.id)
    if (!existing) return res.status(404).json({ error: 'No profile to patch' })

    const patch = req.body || {}
    const next = { ...existing }
    if (patch.onboarding && typeof patch.onboarding === 'object') {
      next.onboarding = { ...(existing.onboarding || {}), ...patch.onboarding }
    }
    if (typeof patch.displayName === 'string') next.displayName = patch.displayName
    if (typeof patch.bio === 'string') next.bio = patch.bio
    next.updatedAt = new Date().toISOString()

    await writeUserProfile(user.id, next)
    return res.status(200).json(next)
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/api/profile.patch.route.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add pages/api/admin/profile.js __tests__/api/profile.patch.route.test.js
git commit -m "feat(onboarding): PATCH /api/admin/profile deep-merges onboarding flags"
```

---

### Task 2: `useOnboarding` client hook

A React hook that loads onboarding flags from the profile and persists changes optimistically.

**Files:**
- Create: `components/admin/onboarding/useOnboarding.js`
- Test: `__tests__/components/useOnboarding.test.js`

**Interfaces:**
- Produces: `useOnboarding()` returns `{ onboarding, loading, markSeen }` where `onboarding` is an object (defaults `{}`), `loading` is boolean, and `markSeen(flag)` sets `onboarding[flag]=true` locally and fires `PATCH /api/admin/profile` with `{ onboarding: { [flag]: true } }` (best-effort). `flag` is one of `'welcomed' | 'tourDone' | 'blocksTipSeen'`.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/components/useOnboarding.test.js
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { useOnboarding } from '@/components/admin/onboarding/useOnboarding'

function Probe() {
  const { onboarding, loading, markSeen } = useOnboarding()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="tourDone">{String(!!onboarding.tourDone)}</span>
      <button onClick={() => markSeen('tourDone')}>mark</button>
    </div>
  )
}

describe('useOnboarding', () => {
  afterEach(() => { jest.restoreAllMocks() })

  it('loads flags from the profile then marks one seen with a PATCH', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation((url, opts) => {
      if (!opts || opts.method === 'GET' || !opts.method) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ onboarding: { welcomed: true } }) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })
    render(<Probe />)
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('tourDone').textContent).toBe('false')

    fireEvent.click(screen.getByText('mark'))
    expect(screen.getByTestId('tourDone').textContent).toBe('true') // optimistic
    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(c => c[1] && c[1].method === 'PATCH')
      expect(patchCall).toBeTruthy()
      expect(JSON.parse(patchCall[1].body)).toEqual({ onboarding: { tourDone: true } })
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/useOnboarding.test.js`
Expected: FAIL (module not found)

- [ ] **Step 3: Create the hook**

```javascript
// components/admin/onboarding/useOnboarding.js
import { useEffect, useState, useCallback } from 'react'

export function useOnboarding() {
  const [onboarding, setOnboarding] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/admin/profile')
      .then(r => (r.ok ? r.json() : {}))
      .then(profile => { if (alive) setOnboarding(profile?.onboarding || {}) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const markSeen = useCallback((flag) => {
    setOnboarding(prev => (prev[flag] ? prev : { ...prev, [flag]: true }))
    fetch('/api/admin/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboarding: { [flag]: true } }),
    }).catch(() => {})
  }, [])

  return { onboarding, loading, markSeen }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/useOnboarding.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/admin/onboarding/useOnboarding.js __tests__/components/useOnboarding.test.js
git commit -m "feat(onboarding): useOnboarding hook to read/persist first-run flags"
```

---

### Task 3: `GuidedTour` overlay (welcome card + spotlight steps)

The reusable tour primitive. Renders a centered welcome card (optional), then a dim-everything-but-the-target spotlight with an anchored copy card and Next/Skip. Resolves anchors by CSS selector; skips steps whose anchor is missing.

**Files:**
- Create: `components/admin/onboarding/GuidedTour.js`
- Test: `__tests__/components/GuidedTour.test.js`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: default export `GuidedTour`, props:
  - `steps`: `Array<{ selector: string, title: string, body: string, placement?: 'above'|'below'|'left'|'right' }>`
  - `welcome?`: `{ title: string, body: string, confirm: string, dismiss: string }` (if present, tour opens on the welcome card)
  - `onFinish`: `(reason: 'done' | 'skip') => void`

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/components/GuidedTour.test.js
import { render, screen, fireEvent } from '@testing-library/react'
import GuidedTour from '@/components/admin/onboarding/GuidedTour'

const steps = [
  { selector: '[data-tour="a"]', title: 'First', body: 'Body one.' },
  { selector: '[data-tour="b"]', title: 'Second', body: 'Body two.' },
]
const welcome = { title: 'You are in.', body: 'Quick tour?', confirm: 'Show me', dismiss: 'I will explore' }

function withAnchors(ui) {
  return (
    <div>
      <button data-tour="a">A</button>
      <button data-tour="b">B</button>
      {ui}
    </div>
  )
}

describe('GuidedTour', () => {
  it('shows the welcome, dismiss calls onFinish(skip)', () => {
    const onFinish = jest.fn()
    render(withAnchors(<GuidedTour steps={steps} welcome={welcome} onFinish={onFinish} />))
    expect(screen.getByText('Quick tour?')).toBeInTheDocument()
    fireEvent.click(screen.getByText('I will explore'))
    expect(onFinish).toHaveBeenCalledWith('skip')
  })

  it('walks steps and finishes done on the last Next', () => {
    const onFinish = jest.fn()
    render(withAnchors(<GuidedTour steps={steps} welcome={welcome} onFinish={onFinish} />))
    fireEvent.click(screen.getByText('Show me'))
    expect(screen.getByText('Body one.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Body two.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /got it|done|next/i }))
    expect(onFinish).toHaveBeenCalledWith('done')
  })

  it('finishes done immediately when no anchors resolve', () => {
    const onFinish = jest.fn()
    render(<GuidedTour steps={[{ selector: '[data-tour="missing"]', title: 'x', body: 'y' }]} onFinish={onFinish} />)
    expect(onFinish).toHaveBeenCalledWith('done')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/GuidedTour.test.js`
Expected: FAIL (module not found)

- [ ] **Step 3: Create the component**

```javascript
// components/admin/onboarding/GuidedTour.js
import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace"
const SERIF = "'Fraunces', Georgia, serif"
const DIM = 'rgba(20,12,4,0.55)'
const CARD_W = 260

function firstResolvableIndex(steps, from) {
  for (let i = from; i < steps.length; i++) {
    if (typeof document !== 'undefined' && document.querySelector(steps[i].selector)) return i
  }
  return -1
}

export default function GuidedTour({ steps = [], welcome, onFinish }) {
  const [phase, setPhase] = useState(welcome ? 'welcome' : 'steps')
  const [index, setIndex] = useState(() => (welcome ? 0 : firstResolvableIndex(steps, 0)))
  const [rect, setRect] = useState(null)
  const [tick, setTick] = useState(0)

  // If there are no resolvable steps at all and no welcome, finish immediately.
  useEffect(() => {
    if (!welcome && firstResolvableIndex(steps, 0) === -1) onFinish?.('done')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const advance = useCallback(() => {
    const nextIdx = firstResolvableIndex(steps, index + 1)
    if (nextIdx === -1) { onFinish?.('done'); return }
    setIndex(nextIdx)
  }, [steps, index, onFinish])

  const start = useCallback(() => {
    const firstIdx = firstResolvableIndex(steps, 0)
    if (firstIdx === -1) { onFinish?.('done'); return }
    setIndex(firstIdx)
    setPhase('steps')
  }, [steps, onFinish])

  // Track the current anchor's rect; reposition on scroll/resize.
  useEffect(() => {
    if (phase !== 'steps') return
    const step = steps[index]
    if (!step) return
    function measure() {
      const el = document.querySelector(step.selector)
      setRect(el ? el.getBoundingClientRect() : null)
    }
    measure()
    const onScroll = () => setTick(t => t + 1)
    window.addEventListener('resize', onScroll)
    document.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', onScroll)
      document.removeEventListener('scroll', onScroll, true)
    }
  }, [phase, index, steps, tick])

  if (typeof document === 'undefined') return null
  if (phase === 'welcome' && welcome) {
    return createPortal(
      <div style={overlayStyle}>
        <div style={{ ...cardBase, width: 300, position: 'relative', margin: 'auto' }}>
          <div style={{ fontFamily: SERIF, fontSize: 20, color: 'var(--text-primary)', marginBottom: 8 }}>{welcome.title}</div>
          <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 18 }}>{welcome.body}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={start} style={primaryBtn}>{welcome.confirm}</button>
            <button onClick={() => onFinish?.('skip')} style={ghostBtn}>{welcome.dismiss}</button>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  if (phase !== 'steps') return null
  const step = steps[index]
  if (!step) return null

  const isLast = firstResolvableIndex(steps, index + 1) === -1
  const pad = 6
  const hi = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null
  const card = cardPosition(rect, step.placement)

  return createPortal(
    <>
      {/* click-blocker beneath the spotlight */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'transparent' }} />
      {/* spotlight: box-shadow dims everything outside the highlighted rect */}
      {hi && (
        <div
          aria-hidden
          style={{
            position: 'fixed', zIndex: 9999, pointerEvents: 'none',
            top: hi.top, left: hi.left, width: hi.width, height: hi.height,
            borderRadius: 8, boxShadow: `0 0 0 9999px ${DIM}, 0 0 0 1.5px rgba(246,243,236,0.9)`,
            transition: 'all 160ms ease',
          }}
        />
      )}
      {/* copy card */}
      <div style={{ position: 'fixed', zIndex: 10000, ...card }}>
        <div style={{ ...cardBase, width: CARD_W }}>
          <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
            {step.title}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>{step.body}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {!isLast && steps.length > 1
              ? <button onClick={() => onFinish?.('skip')} style={skipBtn}>Skip tour</button>
              : <span />}
            <button onClick={advance} style={primaryBtn}>{isLast ? 'Got it' : 'Next'}</button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

const overlayStyle = { position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', background: DIM, padding: 24 }
const cardBase = {
  background: 'var(--popover)', boxShadow: 'var(--popover-shadow)', borderRadius: 12, padding: '16px 16px 14px',
}
const primaryBtn = {
  background: '#2c2416', color: '#f6f3ec', border: 'none', borderRadius: 5, cursor: 'pointer',
  fontFamily: MONO, fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 500, padding: '8px 12px',
}
const ghostBtn = {
  background: 'transparent', color: 'var(--text-secondary)', border: '1px solid rgba(160,140,110,0.35)', borderRadius: 5,
  cursor: 'pointer', fontFamily: MONO, fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 500, padding: '8px 12px',
}
const skipBtn = {
  background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer',
  fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
}

function cardPosition(rect, placement = 'below') {
  if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }
  const gap = 14
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const clampLeft = (l) => Math.max(12, Math.min(l, vw - CARD_W - 12))
  switch (placement) {
    case 'above': return { left: clampLeft(rect.left), top: Math.max(12, rect.top - gap - 120) }
    case 'left':  return { left: Math.max(12, rect.left - CARD_W - gap), top: rect.top }
    case 'right': return { left: clampLeft(rect.right + gap), top: rect.top }
    case 'below':
    default:      return { left: clampLeft(rect.left), top: rect.bottom + gap }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/GuidedTour.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add components/admin/onboarding/GuidedTour.js __tests__/components/GuidedTour.test.js
git commit -m "feat(onboarding): GuidedTour spotlight overlay with welcome + steps"
```

---

### Task 4: `EmptyHint` + sidebar Pages/Hidden empty states + tour anchors

Adds the small explanatory hint blocks under empty Pages and Hidden sections, and tags the four sidebar tour targets with `data-tour`.

**Files:**
- Create: `components/admin/onboarding/EmptyHint.js`
- Modify: `components/admin/platform/PlatformSidebar.js`
- Test: `__tests__/components/EmptyHint.test.js`

**Interfaces:**
- Produces: default export `EmptyHint`, props `{ children }`. Renders a soft sepia card with muted body text in the sidebar type treatment.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/components/EmptyHint.test.js
import { render, screen } from '@testing-library/react'
import EmptyHint from '@/components/admin/onboarding/EmptyHint'

describe('EmptyHint', () => {
  it('renders its message', () => {
    render(<EmptyHint>No pages yet. What you add here becomes your site’s navigation.</EmptyHint>)
    expect(screen.getByText(/becomes your site’s navigation/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/EmptyHint.test.js`
Expected: FAIL (module not found)

- [ ] **Step 3: Create `EmptyHint`**

```javascript
// components/admin/onboarding/EmptyHint.js
export default function EmptyHint({ children }) {
  return (
    <div
      style={{
        margin: '2px 8px 4px',
        padding: '10px 12px',
        borderRadius: 6,
        background: 'rgba(139,111,71,0.05)',
        boxShadow: 'inset 0 0 0 1px rgba(139,111,71,0.10)',
        fontSize: 12,
        lineHeight: 1.5,
        color: 'var(--text-muted)',
      }}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/EmptyHint.test.js`
Expected: PASS

- [ ] **Step 5: Wire `EmptyHint` and tour anchors into `PlatformSidebar.js`**

Add the import near the top (after line 12, the `AccountPopover` import):

```javascript
import EmptyHint from '../onboarding/EmptyHint'
```

Under the Pages section, replace the nav `SidebarSection` block (currently lines 834-840) with a version that shows a hint when there are no nav pages:

```javascript
        <SidebarSection
          label=""
          pages={navPages}
          renderRow={renderPageRow}
          droppableId="main-nav"
        />
        {navPages.length === 0 && draftRow?.section !== 'nav' && (
          <EmptyHint>No pages yet. What you add here becomes your site’s navigation.</EmptyHint>
        )}
        {draftRow?.section === 'nav' && renderDraftRow()}
```

Under the Hidden section, replace the hidden `SidebarSection` block (currently lines 848-854) with:

```javascript
        <SidebarSection
          label=""
          pages={hiddenPages}
          renderRow={renderPageRow}
          droppableId="other-pages"
        />
        {hiddenPages.length === 0 && draftRow?.section !== 'hidden' && (
          <EmptyHint>Nothing hidden. Pages here work by direct link but stay out of your navigation, good for unlisted or private work.</EmptyHint>
        )}
        {draftRow?.section === 'hidden' && renderDraftRow()}
```

Tag the Pages section header. On the header container `<div style={{ padding: '14px 18px 6px 14px', ... }}>` (line 811), add `data-tour="pages-section"`:

```javascript
        <div data-tour="pages-section" style={{ padding: '14px 18px 6px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
```

Tag the Add Page button. On the `<button ref={addBtnRef} ...>` (line 858), add `data-tour="add-page"`:

```javascript
          <button
            ref={addBtnRef}
            data-tour="add-page"
            type="button"
            onClick={() => setAddMenuOpen(v => !v)}
```

- [ ] **Step 6: Add `data-tour` passthrough to `UtilityButton` and tag Library/Settings**

Update the `UtilityButton` definition (lines 176-197) to accept and spread a `dataTour` prop onto the button:

```javascript
function UtilityButton({ icon, label, active, onClick, btnRef, dataTour }) {
  return (
    <button
      ref={btnRef}
      data-tour={dataTour}
      type="button"
      onClick={onClick}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        height: 32, padding: '0 8px', borderRadius: 5,
        background: active ? C.selected : 'transparent',
        border: 'none',
        color: active ? C.accent : C.textBody,
        fontFamily: MONO, fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 500,
        cursor: 'pointer', transition: 'background 120ms',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(26,18,10,0.05)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {icon}{label}
    </button>
  )
}
```

Then pass `dataTour` on the Library and Settings `UtilityButton`s (lines 915-926):

```javascript
        <UtilityButton
          icon={<IconLibrary />}
          label="Library"
          onClick={onShowLibrary}
          dataTour="library"
        />

        <UtilityButton
          icon={<IconSettings />}
          label="Settings"
          onClick={() => setSiteSettingsOpen(v => !v)}
          btnRef={siteSettingsRef}
          dataTour="settings"
        />
```

- [ ] **Step 7: Verify the sidebar still renders and the app compiles**

Run: `npx jest __tests__/components/EmptyHint.test.js && npm run lint`
Expected: EmptyHint test PASS; lint reports no new errors in the touched files.

- [ ] **Step 8: Commit**

```bash
git add components/admin/onboarding/EmptyHint.js components/admin/platform/PlatformSidebar.js __tests__/components/EmptyHint.test.js
git commit -m "feat(onboarding): sidebar empty-state hints + data-tour anchors"
```

---

### Task 5: Welcoming canvas empty state

Replaces the flat "Select a page to edit" with a warm centered welcome and a working "Add a page" action.

**Files:**
- Create: `components/admin/onboarding/CanvasEmptyState.js`
- Modify: `pages/admin/index.js`
- Test: `__tests__/components/CanvasEmptyState.test.js`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: default export `CanvasEmptyState`, props `{ onAddPage: () => void }`.
- New in `pages/admin/index.js`: `handleCreateFirstPage()` appends a default gallery page (shown in nav) and selects it.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/components/CanvasEmptyState.test.js
import { render, screen, fireEvent } from '@testing-library/react'
import CanvasEmptyState from '@/components/admin/onboarding/CanvasEmptyState'

describe('CanvasEmptyState', () => {
  it('renders the welcome and fires onAddPage', () => {
    const onAddPage = jest.fn()
    render(<CanvasEmptyState onAddPage={onAddPage} />)
    expect(screen.getByText(/ready to shape/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /add a page/i }))
    expect(onAddPage).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/CanvasEmptyState.test.js`
Expected: FAIL (module not found)

- [ ] **Step 3: Create `CanvasEmptyState`**

```javascript
// components/admin/onboarding/CanvasEmptyState.js
const MONO = "ui-monospace, 'SF Mono', Menlo, monospace"
const SERIF = "'Fraunces', Georgia, serif"

export default function CanvasEmptyState({ onAddPage }) {
  return (
    <div className="flex-1 h-full min-w-0 flex items-center justify-center" style={{ background: '#fff' }}>
      <div style={{ maxWidth: 360, textAlign: 'center', padding: '0 24px' }}>
        <h2 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 10, lineHeight: 1.2 }}>
          Your portfolio is ready to shape.
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 22 }}>
          Every part of your site is a page. Add your first one to get started.
        </p>
        <button
          type="button"
          onClick={onAddPage}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '10px 16px', borderRadius: 5, border: 'none', cursor: 'pointer',
            background: '#2c2416', color: '#f6f3ec',
            fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 500,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#3d3020' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#2c2416' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Add a page
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/CanvasEmptyState.test.js`
Expected: PASS

- [ ] **Step 5: Wire into `pages/admin/index.js`**

Add the imports (with the other component imports near the top, after line 13):

```javascript
import CanvasEmptyState from '../../components/admin/onboarding/CanvasEmptyState'
import { defaultPage } from '../../common/siteConfig'
```

Add a `handleCreateFirstPage` callback near the other handlers (e.g. after `handleSelectPage`, around line 258):

```javascript
  const handleCreateFirstPage = useCallback(() => {
    const existingIds = new Set((siteConfig?.pages || []).map(p => p.id))
    let id = 'gallery'; let n = 2
    while (existingIds.has(id)) { id = `gallery-${n++}` }
    const sortOrder = Math.max(0, ...(siteConfig?.pages || []).filter(p => p.showInNav !== false).map(p => p.sortOrder ?? 0)) + 1
    updateConfig(prev => ({
      ...prev,
      pages: [...prev.pages, defaultPage({ id, title: 'New Page', sortOrder, showInNav: true, parentId: null, template: 'gallery' })],
    }))
    setSelectedPageId(id)
    setShowLibrary(false)
  }, [siteConfig, updateConfig])
```

Replace the `else` empty-state block (currently lines 428-434):

```javascript
  } else {
    content = <CanvasEmptyState onAddPage={handleCreateFirstPage} />
  }
```

- [ ] **Step 6: Verify compile + tests**

Run: `npx jest __tests__/components/CanvasEmptyState.test.js && npm run lint`
Expected: test PASS; no new lint errors.

- [ ] **Step 7: Commit**

```bash
git add components/admin/onboarding/CanvasEmptyState.js pages/admin/index.js __tests__/components/CanvasEmptyState.test.js
git commit -m "feat(onboarding): welcoming canvas empty state with add-first-page"
```

---

### Task 6: Import doorway (reframed done screen)

Extracts the import "done" screen into a testable `ImportDoneStep` doorway and reframes the copy: a warm one-liner, a primary "Enter my portfolio" button, and a low-key "Import from another site" link.

**Files:**
- Create: `components/admin/import/ImportDoneStep.js`
- Modify: `components/admin/import/ImportFlow.js`
- Test: `__tests__/components/ImportDoneStep.test.js`

**Interfaces:**
- Produces: default export `ImportDoneStep`, props `{ summary: { importedCount, failedCount }, onEnter: () => void, onImportAnother: () => void }`.
- `ImportFlow`'s `done` branch renders `ImportDoneStep`, passing `onEnter={() => onComplete(summary)}` and `onImportAnother` that resets to the `source` step.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/components/ImportDoneStep.test.js
import { render, screen, fireEvent } from '@testing-library/react'
import ImportDoneStep from '@/components/admin/import/ImportDoneStep'

describe('ImportDoneStep', () => {
  it('shows the doorway copy and count, fires onEnter', () => {
    const onEnter = jest.fn()
    render(<ImportDoneStep summary={{ importedCount: 12, failedCount: 0 }} onEnter={onEnter} onImportAnother={() => {}} />)
    expect(screen.getByText(/your photos are in/i)).toBeInTheDocument()
    expect(screen.getByText(/12 photos, ready to use/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /enter my portfolio/i }))
    expect(onEnter).toHaveBeenCalled()
  })

  it('offers import from another site', () => {
    const onImportAnother = jest.fn()
    render(<ImportDoneStep summary={{ importedCount: 3, failedCount: 0 }} onEnter={() => {}} onImportAnother={onImportAnother} />)
    fireEvent.click(screen.getByRole('button', { name: /import from another site/i }))
    expect(onImportAnother).toHaveBeenCalled()
  })

  it('shows a soft note when some failed, with no em-dash', () => {
    render(<ImportDoneStep summary={{ importedCount: 3, failedCount: 2 }} onEnter={() => {}} onImportAnother={() => {}} />)
    const note = screen.getByText(/couldn't be brought in/i)
    expect(note.textContent).not.toContain('—')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/ImportDoneStep.test.js`
Expected: FAIL (module not found)

- [ ] **Step 3: Create `ImportDoneStep`**

```javascript
// components/admin/import/ImportDoneStep.js
import { MONO, primaryBtn } from './importFlowStyles'

export default function ImportDoneStep({ summary, onEnter, onImportAnother }) {
  const n = summary?.importedCount || 0
  return (
    <div style={{ padding: '32px 28px 28px' }}>
      <h2 className="font-fraunces" style={{ fontSize: 21, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.3 }}>
        You’re all set, your photos are in.
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: summary?.failedCount > 0 ? 6 : 22, lineHeight: 1.5 }}>
        {n} {n === 1 ? 'photo' : 'photos'}, ready to use.
      </p>
      {summary?.failedCount > 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 22, lineHeight: 1.5 }}>
          A few couldn't be brought in. You can add those manually.
        </p>
      )}
      <button onClick={onEnter} style={{ ...primaryBtn(false) }}>
        Enter my portfolio →
      </button>
      <button
        onClick={onImportAnother}
        style={{
          display: 'block', marginTop: 14, background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--text-secondary)', fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#2c2416' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
      >
        Import from another site
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Render `ImportDoneStep` from `ImportFlow.js`**

Add the import after line 5 (`import ImportProgress`):

```javascript
import ImportDoneStep from './ImportDoneStep'
```

Replace the entire `done` branch (currently lines 127-144) with:

```javascript
      {step === 'done' && summary && (
        <ImportDoneStep
          summary={summary}
          onEnter={() => onComplete(summary)}
          onImportAnother={() => {
            setSummary(null)
            setDiscovery(null)
            setError(null)
            setInput('')
            setStep('source')
          }}
        />
      )}
```

- [ ] **Step 5: Fix the remaining em-dash in the source-step copy**

In `ImportFlow.js`, the source step (line 85) reads:
`Paste a link to your photos — your website, SmugMug, Squarespace, and more.`
Replace with:

```javascript
            Paste a link to your photos: your website, SmugMug, Squarespace, and more.
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest __tests__/components/ImportDoneStep.test.js __tests__/components/ImportFlowSource.test.js`
Expected: PASS (ImportDoneStep 3 tests; existing ImportFlowSource still green)

- [ ] **Step 7: Commit**

```bash
git add components/admin/import/ImportDoneStep.js components/admin/import/ImportFlow.js __tests__/components/ImportDoneStep.test.js
git commit -m "feat(onboarding): reframe import done screen as a doorway"
```

---

### Task 7: Tour copy + wire GuidedTour and blocks tip into admin

Adds the pure `buildTourSteps` copy factory, tags the block-add button, and mounts the welcome tour + the one-step blocks tip in the admin page. Passes an `imported` signal from onboarding into admin.

**Files:**
- Create: `components/admin/onboarding/tourSteps.js`
- Modify: `pages/admin/index.js`
- Modify: `components/admin/gallery-builder/BlockBuilder.js`
- Modify: `pages/onboarding.js`
- Test: `__tests__/components/tourSteps.test.js`

**Interfaces:**
- Consumes: `GuidedTour` (Task 3), `useOnboarding` (Task 2).
- Produces:
  - `buildTourSteps({ imported })` returns the 4-step array with selectors `add-page`, `pages-section`, `library`, `settings`; the library step body changes on `imported`.
  - `BLOCKS_TIP_STEP` constant exported from `tourSteps.js`: a single step targeting `[data-tour="add-block"]`.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/components/tourSteps.test.js
import { buildTourSteps, BLOCKS_TIP_STEP } from '@/components/admin/onboarding/tourSteps'

describe('buildTourSteps', () => {
  it('returns four steps targeting the tour anchors', () => {
    const steps = buildTourSteps({ imported: false })
    expect(steps.map(s => s.selector)).toEqual([
      '[data-tour="add-page"]',
      '[data-tour="pages-section"]',
      '[data-tour="library"]',
      '[data-tour="settings"]',
    ])
  })

  it('mentions the just-imported photos only when imported is true', () => {
    expect(buildTourSteps({ imported: true })[2].body).toMatch(/just imported/i)
    expect(buildTourSteps({ imported: false })[2].body).not.toMatch(/just imported/i)
  })

  it('has no em-dashes in any copy', () => {
    const all = [...buildTourSteps({ imported: true }), BLOCKS_TIP_STEP]
      .map(s => `${s.title} ${s.body}`).join(' ')
    expect(all).not.toContain('—')
  })

  it('blocks tip targets the add-block anchor', () => {
    expect(BLOCKS_TIP_STEP.selector).toBe('[data-tour="add-block"]')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/tourSteps.test.js`
Expected: FAIL (module not found)

- [ ] **Step 3: Create `tourSteps.js`**

```javascript
// components/admin/onboarding/tourSteps.js
export function buildTourSteps({ imported = false } = {}) {
  return [
    {
      selector: '[data-tour="add-page"]',
      title: 'Add a page',
      body: 'Start here. Every part of your site is a page.',
      placement: 'above',
    },
    {
      selector: '[data-tour="pages-section"]',
      title: 'Your pages',
      body: 'Your pages live here and become your site’s navigation.',
      placement: 'right',
    },
    {
      selector: '[data-tour="library"]',
      title: 'Your library',
      body: imported
        ? 'All your photos live here. The ones you just imported are ready to drop in.'
        : 'All your photos live here, ready to drop in.',
      placement: 'above',
    },
    {
      selector: '[data-tour="settings"]',
      title: 'Settings',
      body: 'Set your cover page, custom domain, and print store here.',
      placement: 'above',
    },
  ]
}

export const WELCOME = {
  title: 'You’re in.',
  body: 'Want a quick tour? It takes about 20 seconds.',
  confirm: 'Show me',
  dismiss: 'I’ll explore',
}

export const BLOCKS_TIP_STEP = {
  selector: '[data-tour="add-block"]',
  title: 'Build your page',
  body: 'This is where you build the page. Add photo, text, and video blocks.',
  placement: 'left',
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/tourSteps.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Tag the block-add button in `BlockBuilder.js`**

On the "Add block" button (line 255), add `data-tour="add-block"`:

```javascript
                <button
                  data-tour="add-block"
                  onClick={(e) => { setMenuAnchorRect(e.currentTarget.getBoundingClientRect()); setInsertAtIndex(null); setShowBlockMenu(true); }}
```

- [ ] **Step 6: Mount the tour and blocks tip in `pages/admin/index.js`**

Add imports (after the `defaultPage` import from Task 5):

```javascript
import { useRouter } from 'next/router'
import GuidedTour from '../../components/admin/onboarding/GuidedTour'
import { useOnboarding } from '../../components/admin/onboarding/useOnboarding'
import { buildTourSteps, WELCOME, BLOCKS_TIP_STEP } from '../../components/admin/onboarding/tourSteps'
```

Inside the component, near the other hooks (after `const { data: session, status } = useSession()`, line 18), add:

```javascript
  const router = useRouter()
  const { onboarding, loading: onboardingLoading, markSeen } = useOnboarding()
  const importedJustNow = router.query.imported === '1'
```

Compute whether to show the tour and the blocks tip. Add this just before the `return (` of the component (after `content` is assigned, around line 435):

```javascript
  const showWelcomeTour = !onboardingLoading && !onboarding.tourDone
  const showBlocksTip =
    !onboardingLoading &&
    onboarding.tourDone &&
    !onboarding.blocksTipSeen &&
    selectedPage &&
    selectedPage.type !== 'link' &&
    !isCoverPageSelected &&
    (selectedPage.blocks?.length || 0) === 0
```

Then render the overlays inside the returned tree, just before the closing `</DragProvider>` (after the `assetPickerTarget` block, around line 498):

```javascript
      {showWelcomeTour && (
        <GuidedTour
          steps={buildTourSteps({ imported: importedJustNow })}
          welcome={WELCOME}
          onFinish={() => markSeen('tourDone')}
        />
      )}
      {showBlocksTip && (
        <GuidedTour
          steps={[BLOCKS_TIP_STEP]}
          onFinish={() => markSeen('blocksTipSeen')}
        />
      )}
```

- [ ] **Step 7: Pass the `imported` signal from onboarding to admin**

In `pages/onboarding.js`, update `goToAdmin` to accept an optional flag and append the query param (lines 7-11):

```javascript
function goToAdmin(slug, { imported = false } = {}) {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3005'
  const protocol = rootDomain.includes('lvh.me') || rootDomain.includes('localhost') ? 'http' : 'https'
  const query = imported ? '?imported=1' : ''
  window.location.href = `${protocol}://${slug}.${rootDomain}/admin${query}`
}
```

In the `ImportFlow` `onComplete` handler (line 169), pass the flag on the successful-import redirect:

```javascript
              goToAdmin(claimedSlug, { imported: true })
```

Leave the other `goToAdmin(claimedSlug)` calls (the modal `onClose` at line 152 and the skip button at line 128) unchanged, so only a completed import sets `imported=1`.

- [ ] **Step 8: Run the full onboarding-related test set + lint**

Run: `npx jest __tests__/components/tourSteps.test.js __tests__/components/GuidedTour.test.js __tests__/components/useOnboarding.test.js && npm run lint`
Expected: all PASS; no new lint errors in touched files.

- [ ] **Step 9: Commit**

```bash
git add components/admin/onboarding/tourSteps.js pages/admin/index.js components/admin/gallery-builder/BlockBuilder.js pages/onboarding.js __tests__/components/tourSteps.test.js
git commit -m "feat(onboarding): mount welcome tour + blocks tip, pass imported signal"
```

---

### Task 8: Em-dash cleanup sweep (existing user-facing copy)

Remove em-dashes from prose copy across the site per the global copy rule. **Keep** genuinely structural/typographic uses and flag them: empty-value placeholders (`'—'` in tables), author-attribution dashes before a name (`— {name}`), and purely decorative dash glyphs. Rewrite every em-dash that sits mid-sentence between words.

**Files (prose replacements, exact):**
- Modify: `components/landing/Landing.js`
- Modify: `components/image-displays/print/PrintPurchasePanel.js`
- Modify: `components/admin/AdminLibrary.js`
- Modify: `components/admin/slideshow-builder/SlideshowSidebar.js`
- Modify: `components/admin/platform/SiteSettingsPopover.js`
- Modify: `components/admin/library/DuplicateFinder.js`
- Modify: `components/admin/print/SellAsPrintPanel.js`
- Modify: `pages/onboarding.js`
- Modify: `pages/print/confirmation.js`
- Modify: `pages/api/contact.js`

**Kept intentionally (do NOT change):** `pages/admin/orders.js` (`'—'` empty-cell placeholders), `components/testimonial/Testimonial.js:57` and `components/image-displays/gallery/Gallery.js:313` (attribution dash before a name), `components/landing/Landing.js:842` (decorative dash glyph).

- [ ] **Step 1: Apply the enumerated prose replacements**

Make each edit exactly (old → new):

- `components/landing/Landing.js:532`
  old: `"Most platforms — Squarespace, Wix, SmugMug — aren't built with the photographer in mind. Pixieset gets close. Sepia takes it to a whole other level.",`
  new: `"Most platforms (Squarespace, Wix, SmugMug) aren't built with the photographer in mind. Pixieset gets close. Sepia takes it to a whole other level.",`

- `components/landing/Landing.js:651` (within the sentence ending "scored to music — all in one")
  Replace `scored to music — all in one` with `scored to music, all in one`

- `components/image-displays/print/PrintPurchasePanel.js:139`
  Replace `Buy this print — ${price}` with `Buy this print for ${price}`
  (Exact JSX: the text node `Buy this print — ` becomes `Buy this print for `.)

- `components/admin/AdminLibrary.js:723`
  old: `Import from your current website, SmugMug, or Squarespace — or upload photos from your computer.`
  new: `Import from your current website, SmugMug, or Squarespace. Or upload photos from your computer.`

- `components/admin/slideshow-builder/SlideshowSidebar.js:299`
  Replace `placeholder="e.g. Music: Song — Artist"` with `placeholder="e.g. Music: Song by Artist"`

- `components/admin/platform/SiteSettingsPopover.js:265`
  old: `Sell prints of your photos. We print and ship worldwide — you set the markup and keep the difference.`
  new: `Sell prints of your photos. We print and ship worldwide. You set the markup and keep the difference.`

- `components/admin/platform/SiteSettingsPopover.js:293`
  Replace the text node `</strong> — you keep` with `</strong>, you keep` (i.e. change `— you keep` to `, you keep`).

- `components/admin/platform/SiteSettingsPopover.js:554`
  old fragment: `if you’d like — individual pages can override with their own settings.`
  new: `if you’d like. Individual pages can override with their own settings.`

- `components/admin/library/DuplicateFinder.js:386`
  old fragment: `couldn&apos;t be removed — run the scan again to retry.`
  new: `couldn&apos;t be removed. Run the scan again to retry.`

- `components/admin/print/SellAsPrintPanel.js:70`
  old: `'Too small to print sharply — upload a higher-resolution file below.'`
  new: `'Too small to print sharply. Upload a higher-resolution file below.'`

- `pages/onboarding.js:145`
  Replace `Skip — start with a blank canvas` with `Skip and start with a blank canvas`

- `pages/print/confirmation.js:70`
  Replace `Thank you — your print is on its way.` with `Thank you. Your print is on its way.`

- `pages/api/contact.js:40`
  Replace `${subject} — message from ${name}` with `${subject}: message from ${name}`

- [ ] **Step 2: Verify no prose em-dashes remain (kept structural ones excluded)**

Run:
```bash
grep -rn "—" --include="*.js" components/ pages/ | grep -v "__tests__" | grep -viE "//|/\*"
```
Expected: only the intentionally-kept lines remain (orders.js placeholders, Testimonial.js:57, Gallery.js:313, Landing.js:842). If any other prose line appears, rewrite it per the rule (comma / period / parentheses).

- [ ] **Step 3: Run the affected component tests + lint**

Run: `npx jest __tests__/components/DomainPanel.test.js __tests__/components/SellAsPrintPanel.test.js __tests__/components/PrintPurchasePanel.test.js && npm run lint`
Expected: PASS; no new lint errors. (If a test asserts on an exact old string that we changed, update that assertion to the new copy.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "copy: remove em-dashes from user-facing prose across the site"
```

---

## Final verification

- [ ] Run the whole suite: `npx jest` — expect green (fix any assertion that pinned old copy).
- [ ] Manual smoke (dev server already runs on port 3000; do NOT `next build`):
  - Fresh/first-time admin load shows the welcome card; "Show me" walks Add page → Pages → Library → Settings; "I'll explore" and "Skip tour" both dismiss and do not reappear on reload.
  - Empty Pages and Hidden sections show their hint blocks; adding a page removes the Pages hint.
  - The canvas shows "Your portfolio is ready to shape." with a working "Add a page".
  - Completing an import lands in admin with `?imported=1`; the Library tour step mentions the just-imported photos.
  - Opening a freshly created (empty) page after the tour shows the one-step blocks tip once.

## Self-review notes (coverage map)

- Spec §1 canvas empty state → Task 5. §2 sidebar hints → Task 4. §3 import doorway → Task 6. §4 welcome + tour → Tasks 3 & 7; blocks tip → Task 7. §5 persistence/detection → Tasks 1, 2, 7. §6 em-dash sweep → Task 8.
- Type consistency: `markSeen(flag)`, `onboarding.{welcomed,tourDone,blocksTipSeen}`, `buildTourSteps({imported})`, `GuidedTour({steps,welcome,onFinish})`, `ImportDoneStep({summary,onEnter,onImportAnother})`, `CanvasEmptyState({onAddPage})`, `EmptyHint({children})` are used identically across tasks.
