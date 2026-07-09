# Web Import UI Implementation Plan (Plan 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. Visual-component tasks (Tasks 3–4, 6) ALSO use superpowers/frontend-design conventions and REQUIRE an in-browser verification step (the app runs at http://localhost:3000).

**Goal:** Give photographers a tasteful, on-brand "Import from the web" experience in the Library — paste a URL, review what was found, watch it import, and land with photos organized into Sets and tagged by source — plus a new Library "Source" filter.

**Architecture:** A pure client orchestration module (`common/import/importClient.js`) calls the Plan-1 engine routes (`/api/admin/import/discover`, `/api/admin/import/fetch-batch`) in small batches, then merges results into the existing library config (assets + one gallery per discovered collection) via the existing `PUT /api/admin/library`. A shared, self-contained `ImportFlow` React component drives the 5-step UX and is reused later (Plan 3) full-screen in onboarding. The Library gains a "Source" filter section, an "Import from the web" entry beside it, and an empty-state hero — all opening the same `ImportFlow`.

**Tech Stack:** Next.js pages router, React, plain JavaScript, Jest + @testing-library/react (ESM `import`, `__tests__/**/*.test.js`, `@/` → root), existing sepia design tokens.

## Global Constraints

- **Language:** plain JavaScript, no TypeScript. React function components with hooks.
- **Tests:** Jest. `__tests__/**/*.test.js`, ESM `import`, `@/` maps to root. Component tests use `@testing-library/react` (jsdom, the default env). Pure-logic/import-engine tests that transitively import cheerio need `/** @jest-environment node */`. Run focused: `npx jest <path>`.
- **Reuse the Plan-1 engine, do not re-implement it.** Client calls `/api/admin/import/discover` and `/api/admin/import/fetch-batch`; persists via `PUT /api/admin/library` with body `{ portfolios, galleries, assets }` (the existing shape from `AdminLibrary.saveConfig`).
- **No library-config schema changes.** Imported assets already carry the `source` field (populated by the engine). "Sets" in the Library UI = entries in `config.galleries` (`{ slug: [url,...] }`), exactly as `handleUploaded` uses.
- **Source vocabulary:** filter reads `asset.source?.provider`; `"manual"` (direct uploads) displays as "Uploaded", `"smugmug"` → "SmugMug", `"generic"` → "Website".
- **Placement rule (from the spec, non-negotiable):** the "Import from the web" entry lives in the Library sidebar WITH the new Source section, and in the empty-state hero. It is NOT added to `PhotoGrid`'s per-photo header buttons, and NOT to `PhotoPickerModal`. Importing a whole site is a deliberate, occasional act — not a per-photo gesture.
- **Design tokens (use verbatim):** modal shell `background: var(--popover)`, `boxShadow: var(--popover-shadow)`, `rounded-xl`; backdrop `rgba(20,12,4,0.55)` + `backdropFilter: blur(2px)`; mono label font `'"SF Mono", Menlo, Monaco, Consolas, monospace'` at `10.5–11px`, `letterSpacing: 0.10–0.12em`, `textTransform: uppercase`; accent `#8b6f47`; progress bar track `rgba(160,140,110,0.22)` / fill `#8b6f47`, height 3px; primary button `background:#2c2416` / `color:#f5ecd6` / `borderRadius:4` (disabled `background: rgba(60,40,15,0.20)`); text colors `--text-primary #2c2416`, `--text-secondary #7a6b55`, `--text-muted #a8967a`; close-X SVG `viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.75}` path `M4 4l8 8M12 4l-8 8`. Display headings use Fraunces (`font-fraunces`) / Cormorant (`font-serif`).
- **Copy rules:** warm, plain prose. No AI-tell patterns (no fragment-stacks, "Not X. Just Y.", tricolons, theatrical em-dashes).

---

### Task 1: Import client orchestration

**Files:**
- Create: `common/import/importClient.js`
- Test: `__tests__/import/importClient.test.js`

**Interfaces:**
- Consumes: the engine routes via `fetch`; `newImportBatchId` from `@/common/import/importCore`.
- Produces:
  - `class ImportError extends Error { status, code }`
  - `chunk(arr, size) -> arr[][]`
  - `slugify(name) -> string`
  - `discoverSource(input, provider?) -> Promise<{ provider, site, collections, totalAssets }>` (throws `ImportError` on non-2xx)
  - `importSelected({ provider, label, importBatchId, selectedCollections, batchSize?, onProgress }) -> Promise<{ imported, failed, skipped, total }>` where `selectedCollections: [{ id, name, assetRefs:[{remoteUrl,caption}] }]`; `onProgress({ done, total, importedCount, failedCount })` is called after each batch.
  - `applyImportToConfig(config, { imported, collections }) -> { portfolios, galleries, assets }` — merges imported assets and creates/extends one gallery per collection (slug from collection name), grouping by `asset.source.externalCollectionId`.
  - `makeImportBatchId(provider, input, nowMs) -> string` (wraps `newImportBatchId` with a client seed).

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/import/importClient.test.js
import { chunk, slugify, discoverSource, importSelected, applyImportToConfig, ImportError } from '@/common/import/importClient'

beforeEach(() => { global.fetch = jest.fn() })
afterEach(() => { jest.resetAllMocks() })

function jsonRes(ok, status, body) {
  return Promise.resolve({ ok, status, json: () => Promise.resolve(body) })
}

describe('chunk / slugify', () => {
  it('chunks into fixed sizes', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })
  it('slugifies a collection name', () => {
    expect(slugify('Big Sur 2024!')).toBe('big-sur-2024')
  })
})

describe('discoverSource', () => {
  it('returns the discovery payload on 200', async () => {
    global.fetch.mockReturnValue(jsonRes(true, 200, { provider: 'generic', site: { title: 'X' }, collections: [], totalAssets: 5 }))
    const out = await discoverSource('joe.com')
    expect(out.totalAssets).toBe(5)
    expect(global.fetch).toHaveBeenCalledWith('/api/admin/import/discover', expect.objectContaining({ method: 'POST' }))
  })
  it('throws ImportError with the friendly message on failure', async () => {
    global.fetch.mockReturnValue(jsonRes(false, 502, { error: 'discovery_failed', message: "We couldn't read that link." }))
    await expect(discoverSource('bad')).rejects.toMatchObject({ name: 'ImportError', status: 502, message: "We couldn't read that link." })
  })
})

describe('importSelected', () => {
  it('batches refs, accumulates results, and reports progress', async () => {
    global.fetch
      .mockReturnValueOnce(jsonRes(true, 200, { imported: [{ assetId: 'a1' }, { assetId: 'a2' }], failed: [], skipped: [] }))
      .mockReturnValueOnce(jsonRes(true, 200, { imported: [{ assetId: 'a3' }], failed: [{ remoteUrl: 'x', reason: 'boom' }], skipped: [] }))
    const progress = []
    const out = await importSelected({
      provider: 'generic', label: 'joe.com', importBatchId: 'imp_x', batchSize: 2,
      selectedCollections: [{ id: 'c1', name: 'Travel', assetRefs: [{ remoteUrl: 'u1' }, { remoteUrl: 'u2' }, { remoteUrl: 'u3' }] }],
      onProgress: (p) => progress.push(p),
    })
    expect(out.imported).toHaveLength(3)
    expect(out.failed).toHaveLength(1)
    expect(out.total).toBe(3)
    expect(progress[progress.length - 1]).toEqual({ done: 3, total: 3, importedCount: 3, failedCount: 1 })
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })
})

describe('applyImportToConfig', () => {
  it('merges assets and builds one gallery per collection by externalCollectionId', () => {
    const config = { portfolios: {}, galleries: { existing: ['keep'] }, assets: {} }
    const imported = [
      { assetId: 'a1', publicUrl: 'https://cdn/1.jpg', source: { externalCollectionId: 'c1' } },
      { assetId: 'a2', publicUrl: 'https://cdn/2.jpg', source: { externalCollectionId: 'c1' } },
    ]
    const collections = [{ id: 'c1', name: 'Big Sur' }]
    const next = applyImportToConfig(config, { imported, collections })
    expect(Object.keys(next.assets)).toEqual(['a1', 'a2'])
    expect(next.galleries['big-sur']).toEqual(['https://cdn/1.jpg', 'https://cdn/2.jpg'])
    expect(next.galleries.existing).toEqual(['keep'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/import/importClient.test.js`
Expected: FAIL — cannot find module `@/common/import/importClient`.

- [ ] **Step 3: Write minimal implementation**

```javascript
// common/import/importClient.js
import { newImportBatchId } from '@/common/import/importCore'

export class ImportError extends Error {
  constructor(message, status, code) {
    super(message)
    this.name = 'ImportError'
    this.status = status
    this.code = code
  }
}

export function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function makeImportBatchId(provider, input, nowMs) {
  return newImportBatchId(`${nowMs}|${provider}|${input}`)
}

async function readJson(res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

export async function discoverSource(input, provider) {
  const res = await fetch('/api/admin/import/discover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, provider }),
  })
  const data = await readJson(res)
  if (!res.ok) throw new ImportError(data.message || 'We could not read that link.', res.status, data.error)
  return data
}

export async function importSelected({ provider, label, importBatchId, selectedCollections, batchSize = 8, onProgress }) {
  const refs = []
  for (const c of selectedCollections || []) {
    for (const r of c.assetRefs || []) refs.push({ ...r, externalCollectionId: c.id })
  }
  const total = refs.length
  const imported = []
  const failed = []
  const skipped = []
  let done = 0
  for (const batch of chunk(refs, batchSize)) {
    const res = await fetch('/api/admin/import/fetch-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ importBatchId, provider, label, assetRefs: batch }),
    })
    const data = await readJson(res)
    if (!res.ok) throw new ImportError(data.message || 'The import ran into a problem.', res.status, data.error)
    imported.push(...(data.imported || []))
    failed.push(...(data.failed || []))
    skipped.push(...(data.skipped || []))
    done += batch.length
    if (onProgress) onProgress({ done, total, importedCount: imported.length, failedCount: failed.length })
  }
  return { imported, failed, skipped, total }
}

export function applyImportToConfig(config, { imported, collections }) {
  const nameById = {}
  for (const c of collections || []) nameById[c.id] = c.name

  const assets = { ...(config.assets || {}) }
  const galleries = { ...(config.galleries || {}) }
  const urlsByCollection = {}

  for (const asset of imported || []) {
    assets[asset.assetId] = { ...(config.assets?.[asset.assetId] || {}), ...asset }
    const cid = asset.source?.externalCollectionId
    if (cid == null) continue
    ;(urlsByCollection[cid] = urlsByCollection[cid] || []).push(asset.publicUrl)
  }

  for (const [cid, urls] of Object.entries(urlsByCollection)) {
    const slug = slugify(nameById[cid] || cid)
    if (!slug) continue
    galleries[slug] = [...new Set([...(galleries[slug] || []), ...urls])]
  }

  return { portfolios: config.portfolios || {}, galleries, assets }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/import/importClient.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/import/importClient.js __tests__/import/importClient.test.js
git commit -m "feat(import-ui): client orchestration (discover, batched import, config merge)"
```

---

### Task 2: Library "Source" filter

**Files:**
- Modify: `components/admin/AdminLibrary.js` (add `source` to `filters` state; compute `sourceCounts`; apply source filter; pass to sidebar)
- Modify: `components/admin/AlbumSidebar.js` (render the Source section; accept `sourceCounts`)
- Create: `common/import/sourceFilter.js` (pure helpers, so the logic is unit-testable)
- Test: `__tests__/import/sourceFilter.test.js`

**Interfaces:**
- Consumes: assets with `asset.source?.provider`.
- Produces:
  - `sourceCounts(assets) -> { [provider]: count }` (missing provider → `"manual"`).
  - `sourceLabel(provider) -> string` (`manual`→"Uploaded", `smugmug`→"SmugMug", `generic`→"Website", else Title-cased).
  - `matchesSource(asset, value) -> boolean` (`value === 'all'` always true).

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/import/sourceFilter.test.js
import { sourceCounts, sourceLabel, matchesSource } from '@/common/import/sourceFilter'

const assets = [
  { source: { provider: 'manual' } },
  {},
  { source: { provider: 'smugmug' } },
  { source: { provider: 'generic' } },
  { source: { provider: 'generic' } },
]

describe('sourceCounts', () => {
  it('counts by provider, defaulting missing to manual', () => {
    expect(sourceCounts(assets)).toEqual({ manual: 2, smugmug: 1, generic: 2 })
  })
})
describe('sourceLabel', () => {
  it('maps known providers to friendly labels', () => {
    expect(sourceLabel('manual')).toBe('Uploaded')
    expect(sourceLabel('smugmug')).toBe('SmugMug')
    expect(sourceLabel('generic')).toBe('Website')
    expect(sourceLabel('flickr')).toBe('Flickr')
  })
})
describe('matchesSource', () => {
  it('all matches everything; otherwise matches provider', () => {
    expect(matchesSource({ source: { provider: 'smugmug' } }, 'all')).toBe(true)
    expect(matchesSource({ source: { provider: 'smugmug' } }, 'smugmug')).toBe(true)
    expect(matchesSource({}, 'manual')).toBe(true)
    expect(matchesSource({ source: { provider: 'generic' } }, 'smugmug')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/import/sourceFilter.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the pure helpers**

```javascript
// common/import/sourceFilter.js
const LABELS = { manual: 'Uploaded', smugmug: 'SmugMug', generic: 'Website' }

export function providerOf(asset) {
  return asset?.source?.provider || 'manual'
}

export function sourceCounts(assets) {
  const acc = {}
  for (const asset of assets || []) {
    const p = providerOf(asset)
    acc[p] = (acc[p] || 0) + 1
  }
  return acc
}

export function sourceLabel(provider) {
  if (LABELS[provider]) return LABELS[provider]
  const s = String(provider || '')
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unknown'
}

export function matchesSource(asset, value) {
  if (value === 'all' || value == null) return true
  return providerOf(asset) === value
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/import/sourceFilter.test.js`
Expected: PASS.

- [ ] **Step 5: Wire the filter into AdminLibrary.js**

Read `components/admin/AdminLibrary.js` first. Make these edits:

1. Add `source: "all"` to the `filters` useState initial object (alongside `orientation`, `usage`, etc.).
2. Add the import at the top: `import { sourceCounts as computeSourceCounts, matchesSource } from '@/common/import/sourceFilter'`.
3. Near the other `*Counts` computations (the block that builds `orientationCounts`, `usageCounts`, …), add:
   ```javascript
   const sourceCounts = computeSourceCounts(allAssets)
   ```
4. In the `applyFilters` callback (where each `filters.*` is checked), add before `return true`:
   ```javascript
   if (!matchesSource(asset, filters.source)) return false
   ```
5. In the `<AlbumSidebar ... />` render, pass the new prop: `sourceCounts={sourceCounts}`. (`filters` and `onFilterChange` are already passed.)

- [ ] **Step 6: Render the Source section in AlbumSidebar.js**

Read `components/admin/AlbumSidebar.js`. Add `sourceCounts` to the component's destructured props. Immediately after the existing "Shape"/orientation `SidebarSection` block, add (import `sourceLabel` at top: `import { sourceLabel } from '@/common/import/sourceFilter'`):

```javascript
{Object.keys(sourceCounts || {}).length > 0 && (
  <SidebarSection title="Source" openOverride={sectionsOpen}>
    {Object.entries(sourceCounts).map(([provider, count]) => (
      <SidebarItem
        key={provider}
        active={filters.source === provider}
        label={sourceLabel(provider)}
        count={count}
        onClick={() => onFilterChange('source', filters.source === provider ? 'all' : provider)}
      />
    ))}
  </SidebarSection>
)}
```

- [ ] **Step 7: Verify (focused + in-browser)**

Run: `npx jest __tests__/import/sourceFilter.test.js` → PASS.
Run: `npx jest` → only the 3 known pre-existing failing suites (siteConfig ×2, CrossBlockDrag); no new failures.
In-browser (server at http://localhost:3000, signed in): open the Library, confirm a "Source" section appears in the sidebar showing "Uploaded" with the correct count, and clicking it filters the grid. Capture a screenshot for the report.

- [ ] **Step 8: Commit**

```bash
git add common/import/sourceFilter.js __tests__/import/sourceFilter.test.js components/admin/AdminLibrary.js components/admin/AlbumSidebar.js
git commit -m "feat(import-ui): Library Source filter section"
```

---

### Task 3: ImportFlow shell + Source step + Discovering step

**Files:**
- Create: `components/admin/import/ImportFlow.js` (container + step state machine)
- Create: `components/admin/import/importFlowStyles.js` (shared style constants/tokens for the flow)
- Test: `__tests__/components/ImportFlowSource.test.js`

**Interfaces:**
- Consumes: `discoverSource`, `makeImportBatchId` from `@/common/import/importClient`.
- Produces: `export default function ImportFlow({ variant = 'modal', initialInput = '', onClose, onComplete })`. Internal step state: `'source' | 'discovering' | 'review' | 'importing' | 'done'`. Exposes nothing else; `onComplete(summary)` fires from the Done step (Task 4). `variant='modal'` renders the popover shell + backdrop; `variant='fullscreen'` renders a centered full-viewport panel (used later in onboarding).

**Design/behavior contract (build with frontend-design conventions; use the Global-Constraints tokens verbatim):**
- **Shell (modal):** backdrop `fixed inset-0 z-50 flex items-center justify-center`, `background: rgba(20,12,4,0.55)`, `backdropFilter: blur(2px)`; panel `width: 520`, `maxHeight: 86vh`, `rounded-xl`, `background: var(--popover)`, `boxShadow: var(--popover-shadow)`. Header row height 44, bottom border `1px solid rgba(160,140,110,0.22)`, a mono uppercase title ("Import from the web") on the left and the close-X on the right (X only on `source`/`review`/`done` steps, hidden mid-`importing`). `variant='fullscreen'` uses `fixed inset-0` with `background: var(--desk)` and the same panel centered, no backdrop, no close-X (onboarding supplies its own Skip).
- **Source step:** a short Fraunces heading "Bring in your existing photos" and a muted line "Paste a link to your photos — your website, SmugMug, Squarespace, and more." A single large text input (full width, underline style matching the admin inputs: `border-b border-[rgba(160,140,110,0.3)] focus:border-[#8b6f47] bg-transparent`), placeholder `yourwebsite.com`. A primary button "Find my photos" (disabled until non-empty). Below, a muted row of source names as plain text reassurance: `SmugMug · Squarespace · Format · Wix` and `Instagram (soon)` in a fainter tone — these are NOT buttons. On submit: trim input, set step `discovering`, call `discoverSource`.
- **Discovering step:** centered, an animated pulsing dot or subtle spinner in `#8b6f47`, a mono line "Looking through {host}…", and once discovery resolves, transition to `review` (Task 4) passing the payload. On `ImportError`, return to `source` and show the error's `message` in a warm inline note (color `#a15c4a`) with the input preserved so they can edit and retry.

- [ ] **Step 1: Write the failing test (Source step behavior)**

```javascript
// __tests__/components/ImportFlowSource.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ImportFlow from '@/components/admin/import/ImportFlow'
import * as client from '@/common/import/importClient'

jest.mock('@/common/import/importClient', () => ({
  __esModule: true,
  discoverSource: jest.fn(),
  makeImportBatchId: () => 'imp_test',
}))

describe('ImportFlow source step', () => {
  afterEach(() => jest.resetAllMocks())

  it('disables the button until a URL is entered, then calls discoverSource', async () => {
    client.discoverSource.mockResolvedValue({ provider: 'generic', site: { title: 'Joe', url: 'https://joe.com/' }, collections: [{ id: 'c1', name: 'Travel', assetRefs: [{ remoteUrl: 'u1' }] }], totalAssets: 1 })
    render(<ImportFlow variant="modal" onClose={() => {}} onComplete={() => {}} />)
    const button = screen.getByRole('button', { name: /find my photos/i })
    expect(button).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText(/yourwebsite/i), { target: { value: 'joe.com' } })
    expect(button).not.toBeDisabled()
    fireEvent.click(button)
    await waitFor(() => expect(client.discoverSource).toHaveBeenCalledWith('joe.com', undefined))
  })

  it('shows the error message and returns to the input on discovery failure', async () => {
    const err = Object.assign(new Error("We couldn't read that link."), { name: 'ImportError', status: 502 })
    client.discoverSource.mockRejectedValue(err)
    render(<ImportFlow variant="modal" onClose={() => {}} onComplete={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/yourwebsite/i), { target: { value: 'bad' } })
    fireEvent.click(screen.getByRole('button', { name: /find my photos/i }))
    expect(await screen.findByText(/couldn't read that link/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/yourwebsite/i)).toHaveValue('bad')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/ImportFlowSource.test.js`
Expected: FAIL — cannot find `@/components/admin/import/ImportFlow`.

- [ ] **Step 3: Implement `importFlowStyles.js` then `ImportFlow.js`**

Create `components/admin/import/importFlowStyles.js` exporting the shared constants:

```javascript
// components/admin/import/importFlowStyles.js
export const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace'

export const monoLabel = {
  fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 500,
}

export const primaryBtn = (disabled) => ({
  background: disabled ? 'rgba(60,40,15,0.20)' : '#2c2416',
  color: '#f5ecd6', fontSize: 12.5, fontWeight: 500,
  padding: '9px 16px', borderRadius: 4, border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer', transition: 'background 0.15s',
})

export const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
)
```

Implement `ImportFlow.js` as the container + step machine. Build the Source and Discovering steps fully to the design contract above; render a minimal placeholder for `review`/`importing`/`done` that Task 4 replaces. It MUST satisfy the two tests (button label "Find my photos", placeholder containing "yourwebsite", error message surfaced, input preserved). Follow the token contract exactly. Skeleton:

```javascript
// components/admin/import/ImportFlow.js
import { useState } from 'react'
import { discoverSource, makeImportBatchId } from '@/common/import/importClient'
import { MONO, monoLabel, primaryBtn, CloseIcon } from './importFlowStyles'

function hostOf(input) {
  try {
    return new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`).hostname
  } catch {
    return input
  }
}

export default function ImportFlow({ variant = 'modal', initialInput = '', onClose, onComplete }) {
  const [step, setStep] = useState('source')
  const [input, setInput] = useState(initialInput)
  const [error, setError] = useState(null)
  const [discovery, setDiscovery] = useState(null)

  async function handleDiscover() {
    const trimmed = input.trim()
    if (!trimmed) return
    setError(null)
    setStep('discovering')
    try {
      const result = await discoverSource(trimmed, undefined)
      setDiscovery(result)
      setStep('review')
    } catch (err) {
      setError(err?.message || 'We could not read that link.')
      setStep('source')
    }
  }

  const body = (
    <>
      {step === 'source' && (
        <div style={{ padding: '28px 28px 24px' }}>
          <h2 className="font-fraunces" style={{ fontSize: 22, color: 'var(--text-primary)', marginBottom: 6 }}>
            Bring in your existing photos
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
            Paste a link to your photos — your website, SmugMug, Squarespace, and more.
          </p>
          <input
            autoFocus
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleDiscover() }}
            placeholder="yourwebsite.com"
            className="w-full text-[15px] outline-none bg-transparent border-b py-2 text-[#2c2416] placeholder:text-[#a8967a] focus:border-[#8b6f47]"
            style={{ borderColor: 'rgba(160,140,110,0.3)' }}
          />
          {error && <p style={{ marginTop: 10, fontSize: 12.5, color: '#a15c4a' }}>{error}</p>}
          <div className="flex items-center justify-between" style={{ marginTop: 22 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              SmugMug · Squarespace · Format · Wix · <span style={{ opacity: 0.6 }}>Instagram (soon)</span>
            </span>
            <button onClick={handleDiscover} disabled={!input.trim()} style={primaryBtn(!input.trim())}>
              Find my photos
            </button>
          </div>
        </div>
      )}

      {step === 'discovering' && (
        <div className="flex flex-col items-center justify-center" style={{ padding: '56px 28px' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#8b6f47', animation: 'importPulse 1.1s ease-in-out infinite' }} />
          <p style={{ marginTop: 18, ...monoLabel }}>{`Looking through ${hostOf(input)}…`}</p>
          <style>{`@keyframes importPulse { 0%,100%{opacity:.3;transform:scale(.85)} 50%{opacity:1;transform:scale(1)} }`}</style>
        </div>
      )}

      {/* review / importing / done — implemented in Task 4 */}
      {(step === 'review' || step === 'importing' || step === 'done') && (
        <div data-testid="import-later-steps" style={{ padding: 28 }} />
      )}
    </>
  )

  if (variant === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--desk)' }}>
        <div className="rounded-xl overflow-hidden" style={{ width: 520, maxHeight: '86vh', background: 'var(--popover)', boxShadow: 'var(--popover-shadow)' }}>
          {body}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(20,12,4,0.55)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' }}>
      <div className="flex flex-col rounded-xl overflow-hidden" style={{ width: 520, maxHeight: '86vh', background: 'var(--popover)', boxShadow: 'var(--popover-shadow)' }}>
        <div className="flex items-center px-4 flex-shrink-0" style={{ height: 44, borderBottom: '1px solid rgba(160,140,110,0.22)' }}>
          <span style={monoLabel}>Import from the web</span>
          {step !== 'importing' && step !== 'discovering' && (
            <button onClick={onClose} className="ml-auto w-6 h-6 flex items-center justify-center rounded hover:bg-black/5" style={{ color: 'var(--text-muted)' }} aria-label="Close">
              <CloseIcon />
            </button>
          )}
        </div>
        <div style={{ overflowY: 'auto' }}>{body}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/ImportFlowSource.test.js`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add components/admin/import/ImportFlow.js components/admin/import/importFlowStyles.js __tests__/components/ImportFlowSource.test.js
git commit -m "feat(import-ui): ImportFlow shell, source + discovering steps"
```

---

### Task 4: ImportFlow review + importing + done steps

**Files:**
- Modify: `components/admin/import/ImportFlow.js` (replace the placeholder branch with the three real steps)
- Create: `components/admin/import/ReviewStep.js`
- Create: `components/admin/import/ImportProgress.js`
- Test: `__tests__/components/ImportFlowReview.test.js`

**Interfaces:**
- Consumes: `importSelected`, `makeImportBatchId` from `@/common/import/importClient`; discovery payload from Task 3.
- Produces: `ReviewStep({ discovery, onBack, onImport })` and `ImportProgress({ progress })`; `ImportFlow` now runs the import and calls `onComplete({ importedCount, failedCount, setsCount, site, imported, collections })` when the user leaves the Done step.

**Design/behavior contract:**
- **Review step:** heading `We found {totalAssets} photos across {collections.length} galleries.` Primary button at top: `Import all {totalAssets} photos`. Below, a grid/list of collection rows, each with the collection name, its photo count, and a checkbox (all checked by default). Unchecking excludes that collection. The primary button imports only checked collections; its label updates to the checked total. A quiet "Back" affordance returns to `source`. Junk is already filtered server-side, so the list is clean.
- **Importing step:** the `ImportProgress` component — a 3px track (`rgba(160,140,110,0.22)`) with a `#8b6f47` fill at `done/total`, a mono line `{done} / {total}`, and a subline naming the running work. Close-X is hidden during this step.
- **Done step:** Fraunces heading `Imported {importedCount} photos into {setsCount} sets from {host}.` If `failedCount > 0`, a muted line `{failedCount} couldn't be brought in — you can add those manually.` Primary button "See my photos" that calls `onComplete(summary)` (the Library wiring in Task 5 closes the modal + refreshes).

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/components/ImportFlowReview.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ImportFlow from '@/components/admin/import/ImportFlow'
import * as client from '@/common/import/importClient'

jest.mock('@/common/import/importClient', () => ({
  __esModule: true,
  discoverSource: jest.fn(),
  importSelected: jest.fn(),
  makeImportBatchId: () => 'imp_test',
}))

const discovery = {
  provider: 'generic',
  site: { title: 'Joe', url: 'https://joe.com/' },
  totalAssets: 3,
  collections: [
    { id: 'c1', name: 'Travel', assetRefs: [{ remoteUrl: 'u1' }, { remoteUrl: 'u2' }] },
    { id: 'c2', name: 'Food', assetRefs: [{ remoteUrl: 'u3' }] },
  ],
}

async function toReview() {
  client.discoverSource.mockResolvedValue(discovery)
  render(<ImportFlow variant="modal" onClose={() => {}} onComplete={jest.fn()} />)
  fireEvent.change(screen.getByPlaceholderText(/yourwebsite/i), { target: { value: 'joe.com' } })
  fireEvent.click(screen.getByRole('button', { name: /find my photos/i }))
  await screen.findByText(/import all 3 photos/i)
}

describe('ImportFlow review + import', () => {
  afterEach(() => jest.resetAllMocks())

  it('shows discovered galleries and imports all by default', async () => {
    client.importSelected.mockImplementation(async ({ onProgress }) => {
      onProgress?.({ done: 3, total: 3, importedCount: 3, failedCount: 0 })
      return { imported: [{ assetId: 'a1', source: { externalCollectionId: 'c1' } }], failed: [], skipped: [], total: 3 }
    })
    await toReview()
    expect(screen.getByText('Travel')).toBeInTheDocument()
    expect(screen.getByText('Food')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /import all 3 photos/i }))
    await waitFor(() => expect(client.importSelected).toHaveBeenCalled())
    const arg = client.importSelected.mock.calls[0][0]
    expect(arg.selectedCollections).toHaveLength(2)
    expect(await screen.findByText(/see my photos/i)).toBeInTheDocument()
  })

  it('excludes an unchecked gallery from the import', async () => {
    client.importSelected.mockResolvedValue({ imported: [], failed: [], skipped: [], total: 2 })
    await toReview()
    // uncheck "Food" (c2)
    fireEvent.click(screen.getByLabelText(/Food/i))
    fireEvent.click(screen.getByRole('button', { name: /import all 2 photos/i }))
    await waitFor(() => expect(client.importSelected).toHaveBeenCalled())
    const arg = client.importSelected.mock.calls[0][0]
    expect(arg.selectedCollections.map((c) => c.id)).toEqual(['c1'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/ImportFlowReview.test.js`
Expected: FAIL — placeholder branch renders no review UI.

- [ ] **Step 3: Implement `ReviewStep.js`, `ImportProgress.js`, and wire them into `ImportFlow.js`**

`ReviewStep.js` — renders the heading, the top primary button whose label is `Import all {selectedCount} photos`, and one row per collection with a labeled checkbox (`<label>` wrapping an `<input type="checkbox">` and the collection name so `getByLabelText(name)` works). Selection state is local; `onImport(selectedCollections)` passes only checked collections (full objects incl. `assetRefs`). `ImportProgress.js` — the track + fill + counts per the contract.

In `ImportFlow.js`, replace the placeholder branch:
- Add state: `progress`, `summary`.
- `review`: render `<ReviewStep discovery={discovery} onBack={() => setStep('source')} onImport={handleImport} />`.
- `handleImport(selectedCollections)`: set step `importing`; compute `label = discovery.site?.title || hostOf(input)`; `const batchId = makeImportBatchId(discovery.provider, input, Date.now())`; call `importSelected({ provider: discovery.provider, label, importBatchId: batchId, selectedCollections, onProgress: setProgress })`; on resolve compute `setsCount` = number of distinct `externalCollectionId` among `result.imported` (fallback to selectedCollections length), build `summary = { importedCount: result.imported.length, failedCount: result.failed.length, setsCount, site: discovery.site, imported: result.imported, collections: discovery.collections }`, `setSummary(summary)`, step `done`. On throw, step back to `review` with an inline error.
- `importing`: `<ImportProgress progress={progress} />`.
- `done`: heading from `summary`, optional failed line, primary "See my photos" → `onComplete(summary)`.

Follow the token contract; keep copy warm.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/ImportFlowReview.test.js`
Expected: PASS (both tests).

- [ ] **Step 5: In-browser verification**

With the dev server (http://localhost:3000) and a signed-in session, drive a real import against a public URL and confirm the full flow renders and photos land in the Library. Capture screenshots of the review, importing, and done steps for the report. (If no live source is handy, verify the visual states by temporarily rendering the component; do not commit throwaway code.)

- [ ] **Step 6: Commit**

```bash
git add components/admin/import/ReviewStep.js components/admin/import/ImportProgress.js components/admin/import/ImportFlow.js __tests__/components/ImportFlowReview.test.js
git commit -m "feat(import-ui): ImportFlow review, importing, and done steps"
```

---

### Task 5: Wire ImportFlow into the Library — entry point, persistence, empty-state hero

**Files:**
- Modify: `components/admin/AdminLibrary.js` (mount `ImportFlow`, add `handleImportComplete`, pass an opener to the sidebar; render empty-state hero)
- Modify: `components/admin/AlbumSidebar.js` (an "Import from the web" action beside the Source section header)
- Test: `__tests__/components/LibraryImportWiring.test.js`

**Interfaces:**
- Consumes: `ImportFlow`; `applyImportToConfig` from `@/common/import/importClient`.
- Produces: `AdminLibrary` state `importOpen`; `handleImportComplete(summary)` that merges via `applyImportToConfig(currentConfig(), { imported: summary.imported, collections: summary.collections })`, calls `saveConfig(next)`, highlights the imported URLs, closes the modal; `AlbumSidebar` prop `onImportFromWeb`.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/components/LibraryImportWiring.test.js
import { applyImportToConfig } from '@/common/import/importClient'

// Focused wiring/logic test: the merge that handleImportComplete performs.
describe('handleImportComplete merge', () => {
  it('adds imported assets and a gallery per collection to the config', () => {
    const config = { portfolios: {}, galleries: {}, assets: {} }
    const summary = {
      imported: [
        { assetId: 'a1', publicUrl: 'https://cdn/1.jpg', source: { provider: 'generic', externalCollectionId: 'c1' } },
        { assetId: 'a2', publicUrl: 'https://cdn/2.jpg', source: { provider: 'generic', externalCollectionId: 'c1' } },
      ],
      collections: [{ id: 'c1', name: 'Travel' }],
    }
    const next = applyImportToConfig(config, summary)
    expect(next.assets.a1.source.provider).toBe('generic')
    expect(next.galleries.travel).toEqual(['https://cdn/1.jpg', 'https://cdn/2.jpg'])
  })
})
```

(Note: `applyImportToConfig` is already covered in Task 1; this test documents the exact wiring contract `handleImportComplete` relies on. The DOM wiring is verified in-browser at Step 4 because it depends on the full `AdminLibrary` data-fetch lifecycle.)

- [ ] **Step 2: Run test to verify it passes (regression guard)**

Run: `npx jest __tests__/components/LibraryImportWiring.test.js`
Expected: PASS (relies on Task 1's `applyImportToConfig`).

- [ ] **Step 3: Mount ImportFlow + handler in AdminLibrary.js**

Read `components/admin/AdminLibrary.js`. Edits:
1. Import: `import ImportFlow from './import/ImportFlow'` and add `applyImportToConfig` to the `@/common/import/importClient` import.
2. Add state: `const [importOpen, setImportOpen] = useState(false)`.
3. Add the handler (mirrors `handleUploaded`'s highlight+save pattern):
   ```javascript
   const handleImportComplete = useCallback(async (summary) => {
     setImportOpen(false)
     if (!summary?.imported?.length) return
     const next = applyImportToConfig(currentConfig(), { imported: summary.imported, collections: summary.collections })
     const urls = summary.imported.map((a) => a.publicUrl)
     setHighlightedUrls(new Set(urls))
     setTimeout(() => setHighlightedUrls(null), 2500)
     setSelectedAlbum({ type: 'all', key: 'all' })
     await saveConfig(next)
   }, [currentConfig, saveConfig])
   ```
4. Pass `onImportFromWeb={() => setImportOpen(true)}` to `<AlbumSidebar ... />`.
5. Mount the modal near the other modals:
   ```javascript
   {importOpen && (
     <ImportFlow variant="modal" onClose={() => setImportOpen(false)} onComplete={handleImportComplete} />
   )}
   ```

- [ ] **Step 4: Add the sidebar entry beside the Source section (AlbumSidebar.js)**

Give the Source `SidebarSection` an `action` that opens the flow (the `SidebarSection` component already supports an `action` prop rendered on the right of its header). Add `onImportFromWeb` to the destructured props, and set:

```javascript
<SidebarSection
  title="Source"
  openOverride={sectionsOpen}
  action={
    <button
      onClick={onImportFromWeb}
      title="Import from the web"
      className="flex items-center justify-center rounded transition-colors"
      style={{ width: 18, height: 18, color: '#a8967a' }}
      onMouseEnter={(e) => (e.currentTarget.style.color = '#8b6f47')}
      onMouseLeave={(e) => (e.currentTarget.style.color = '#a8967a')}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  }
>
```

Also handle the case where the Source section is hidden because there are zero assets: in the empty-state hero (Step 5) the import entry is present regardless, so discoverability never depends on already having photos.

- [ ] **Step 5: Empty-state hero**

In `AdminLibrary.js`, when `libraryData` is loaded and `(libraryData.images || []).length === 0`, render a centered hero in the grid area INSTEAD of the empty "No photos" text, before/around the normal PhotoGrid mount. Keep it in AdminLibrary so it can open the modal:

```javascript
{libraryData && (libraryData.images || []).length === 0 ? (
  <div className="flex flex-1 flex-col items-center justify-center text-center" style={{ padding: 40 }}>
    <h2 className="font-fraunces" style={{ fontSize: 24, color: 'var(--text-primary)', marginBottom: 8 }}>
      Bring in your existing photos
    </h2>
    <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 360, lineHeight: 1.55, marginBottom: 22 }}>
      Import from your current website, SmugMug, or Squarespace — or upload photos from your computer.
    </p>
    <div className="flex items-center gap-3">
      <button onClick={() => setImportOpen(true)} style={{ background: '#2c2416', color: '#f5ecd6', fontSize: 13, fontWeight: 500, padding: '10px 18px', borderRadius: 4, border: 'none', cursor: 'pointer' }}>
        Import from the web
      </button>
      <button onClick={() => setUploadOpen(true)} style={{ background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, padding: '10px 18px', borderRadius: 4, border: '1px solid rgba(160,140,110,0.35)', cursor: 'pointer' }}>
        Upload photos
      </button>
    </div>
  </div>
) : (
  /* existing sidebar + PhotoGrid layout */
)}
```

Wire it so the existing layout renders in the `else` branch. Keep the change minimal and localized; do not restructure the working layout beyond this conditional.

- [ ] **Step 6: Verify (focused + in-browser)**

Run: `npx jest __tests__/components/LibraryImportWiring.test.js` → PASS.
Run: `npx jest` → only the 3 known pre-existing failing suites; no new failures.
In-browser (http://localhost:3000, signed in): (a) with an empty library, confirm the hero shows and "Import from the web" opens the flow; (b) with photos present, confirm the "+" beside the Source section opens the flow; (c) run a real import and confirm photos appear in the Library, grouped into a Set per gallery, and the Source filter now lists "Website"/"SmugMug" with counts. Screenshots for the report.

- [ ] **Step 7: Commit**

```bash
git add components/admin/AdminLibrary.js components/admin/AlbumSidebar.js __tests__/components/LibraryImportWiring.test.js
git commit -m "feat(import-ui): Library import entry, persistence, and empty-state hero"
```

---

### Task 6: Full-flow polish + regression pass

**Files:**
- Modify: any of the Task 3–5 components for polish found during review (no new surfaces).
- Test: re-run the full import UI suite.

- [ ] **Step 1: Run the whole import UI + engine suite**

Run: `npx jest __tests__/import __tests__/components/ImportFlowSource.test.js __tests__/components/ImportFlowReview.test.js __tests__/components/LibraryImportWiring.test.js`
Expected: all PASS.

- [ ] **Step 2: Run the full suite**

Run: `npx jest`
Expected: only the 3 pre-existing failing suites (siteConfig ×2, CrossBlockDrag); no new failures.

- [ ] **Step 3: In-browser end-to-end dogfood**

With the dev server and a signed-in session, do a complete real import from a public site (e.g. a Squarespace/Format/Wix portfolio or a public SmugMug URL if `SMUGMUG_API_KEY` is set). Confirm: source step → discovering → review (uncheck one gallery) → importing progress → done summary → Library shows the photos, the Sets, the Source filter counts, and re-running the same import de-dupes (no duplicates). Capture a short screenshot sequence for the report. File any polish gaps as follow-ups; fix trivial ones inline and re-commit.

- [ ] **Step 4: Commit any polish**

```bash
git add -A
git commit -m "polish(import-ui): full-flow review fixes"
```

---

## Self-Review

**Spec coverage (against `2026-07-08-web-import-onboarding-design.md` §6.2–6.3):**
- §6.2 shared ImportFlow component, 5 steps (Source → Discovering → Review → Importing → Done) → Tasks 3–4. `variant='fullscreen'` prop present for Plan 3's onboarding reuse. ✅
- §6.2 Review = the B screen with a prominent "Import all N photos" default + per-gallery toggles → Task 4. ✅
- §6.2 Importing progress bar + Done summary incl. failed count → Task 4. ✅
- §6.3 Source filter section driven by `source.provider` → Task 2. ✅
- §6.3 standalone "Import from the web" entry homed WITH the Source section (not in PhotoPickerModal/per-photo header) → Task 5 + Global Constraints placement rule. ✅
- §6.3 empty-state hero → Task 5. ✅
- §4.5 one Set per discovered collection, source-tagged assets, re-import dedupe → Task 1 (`applyImportToConfig`) + engine dedupe (Plan 1). ✅
- Engine reuse via discover/fetch-batch/library PUT, no schema changes → Task 1. ✅

**Deferred to later plans (not gaps):** onboarding placement, sign-in-page removal, landing deep-link (Plan 3); headless crawling (Plan 1.5). The `variant='fullscreen'` prop is built here so Plan 3 only wires it in.

**Placeholder scan:** logic tasks (1, 2) carry complete code. Component tasks (3–4) carry a full working skeleton that satisfies the tests plus an exact token/copy/behavior contract for the polish; the Task 3 `review/importing/done` placeholder is explicitly replaced in Task 4. No "TBD"/"handle errors"-style gaps.

**Type consistency:** `discovery` shape `{ provider, site, collections:[{id,name,assetRefs:[{remoteUrl,caption}]}], totalAssets }` is consistent across `discoverSource` (Task 1), ImportFlow (Task 3), ReviewStep (Task 4). `summary` shape `{ importedCount, failedCount, setsCount, site, imported, collections }` produced in Task 4 is consumed by `handleImportComplete` (Task 5). `applyImportToConfig(config, { imported, collections })` signature identical in Tasks 1 and 5. `onImportFromWeb` prop consistent between AdminLibrary and AlbumSidebar (Task 5).

**Test-harness notes:** component tests run under the default jsdom env (no node docblock needed — they mock `@/common/import/importClient`, so cheerio is never loaded). `importClient.test.js` mocks `global.fetch`; it does not import cheerio, so it also stays in jsdom.
