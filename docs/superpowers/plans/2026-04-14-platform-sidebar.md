# Platform Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Level 1 platform sidebar — page list, CRUD (add/rename/delete/reorder), site name, publish badge, and the per-user site-config.json data layer it reads from/writes to.

**Architecture:** `common/siteConfig.js` handles per-user R2 reads/writes (using existing `gcsUser.js` path helpers + `gcsClient.js` storage helpers). A single API route (`/api/admin/site-config`) serves GET/PUT. The sidebar (`components/admin/platform/PlatformSidebar.js`) is a pure React component driven by site config state in `pages/admin/index.js`. Autosave is debounced 1.5s (matching existing GalleryBuilder pattern).

**Tech Stack:** Next.js 14 pages router, React, Tailwind CSS, @hello-pangea/dnd (already installed), next-auth (session), Jest

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `common/siteConfig.js` | Create | Read/write per-user site-config.json from R2 |
| `pages/api/admin/site-config.js` | Create | GET/PUT API route for site config |
| `components/admin/platform/AdminLayout.js` | Create | Sidebar + content split layout wrapper |
| `components/admin/platform/PlatformSidebar.js` | Create | Level 1 sidebar: page list, CRUD, publish badge |
| `pages/admin/index.js` | Modify | Replace minimal shell with AdminLayout + PlatformSidebar |
| `__tests__/common/siteConfig.test.js` | Create | Unit tests for config helpers |

---

## Task 0: Site config data helpers

**Files:**
- Create: `common/siteConfig.js`
- Create: `__tests__/common/siteConfig.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// __tests__/common/siteConfig.test.js
import {
  createDefaultSiteConfig,
  generatePageId,
} from '../../common/siteConfig'

describe('createDefaultSiteConfig', () => {
  it('returns a config with one cover page', () => {
    const config = createDefaultSiteConfig('user-123')
    expect(config.userId).toBe('user-123')
    expect(config.pages).toHaveLength(1)
    expect(config.pages[0].type).toBe('cover')
    expect(config.pages[0].id).toBe('cover')
    expect(config.pages[0].showInNav).toBe(false)
  })

  it('sets default theme to minimal-light', () => {
    const config = createDefaultSiteConfig('user-123')
    expect(config.theme).toBe('minimal-light')
  })

  it('sets publishedAt to null', () => {
    const config = createDefaultSiteConfig('user-123')
    expect(config.publishedAt).toBeNull()
  })
})

describe('generatePageId', () => {
  it('slugifies the title', () => {
    expect(generatePageId('Landscape Photography')).toBe('landscape-photography')
  })

  it('strips special characters', () => {
    expect(generatePageId('Birds & Wildlife!')).toBe('birds-wildlife')
  })

  it('collapses multiple dashes', () => {
    expect(generatePageId('Black  White')).toBe('black-white')
  })

  it('appends suffix when provided', () => {
    expect(generatePageId('Landscapes', '-2')).toBe('landscapes-2')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest __tests__/common/siteConfig.test.js
```

Expected: FAIL — `Cannot find module '../../common/siteConfig'`

- [ ] **Step 3: Implement siteConfig.js**

```js
// common/siteConfig.js
// Server-side only — never import from client components.
import { downloadJSON, uploadJSON } from './gcsClient'
import { getUserSiteConfigPath } from './gcsUser'

/**
 * Slugify a title into a URL-safe page ID.
 * @param {string} title
 * @param {string} [suffix] - optional suffix to append (e.g. '-2' for dedup)
 * @returns {string}
 */
export function generatePageId(title, suffix = '') {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') + suffix
}

/**
 * Create the default site config for a brand-new user.
 * @param {string} userId - Google OAuth sub
 * @returns {SiteConfig}
 */
export function createDefaultSiteConfig(userId) {
  return {
    userId,
    siteName: 'My Portfolio',
    slug: '',
    theme: 'minimal-light',
    customDomain: null,
    publishedAt: null,
    pages: [
      {
        id: 'cover',
        type: 'cover',
        title: 'Home',
        showInNav: false,
        blocks: [],
      },
    ],
  }
}

/**
 * Read the site config for a user from R2.
 * Returns null if the config doesn't exist yet.
 * @param {string} userId
 * @returns {Promise<SiteConfig|null>}
 */
export async function readSiteConfig(userId) {
  try {
    return await downloadJSON(getUserSiteConfigPath(userId))
  } catch {
    return null
  }
}

/**
 * Write the site config for a user to R2.
 * @param {string} userId
 * @param {SiteConfig} config
 */
export async function writeSiteConfig(userId, config) {
  await uploadJSON(getUserSiteConfigPath(userId), config)
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest __tests__/common/siteConfig.test.js
```

Expected: `PASS __tests__/common/siteConfig.test.js` — 7 tests passing

- [ ] **Step 5: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add common/siteConfig.js __tests__/common/siteConfig.test.js
git commit -m "feat: add per-user site config data helpers"
```

---

## Task 1: Site config API route

**Files:**
- Create: `pages/api/admin/site-config.js`

No unit tests — route integration is verified manually in Task 5.

- [ ] **Step 1: Create the API route**

```js
// pages/api/admin/site-config.js
import { withAuth } from '../../../common/withAuth'
import {
  readSiteConfig,
  writeSiteConfig,
  createDefaultSiteConfig,
} from '../../../common/siteConfig'

async function handler(req, res, user) {
  if (req.method === 'GET') {
    try {
      let config = await readSiteConfig(user.id)
      if (!config) {
        config = createDefaultSiteConfig(user.id)
        await writeSiteConfig(user.id, config)
      }
      return res.status(200).json(config)
    } catch (err) {
      console.error('GET /api/admin/site-config error:', err)
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'PUT') {
    try {
      const config = req.body
      if (!config || !Array.isArray(config.pages)) {
        return res.status(400).json({ error: 'Invalid config: must have pages array' })
      }
      await writeSiteConfig(user.id, config)
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('PUT /api/admin/site-config error:', err)
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
```

- [ ] **Step 2: Run all existing tests to confirm nothing broke**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest
```

Expected: all tests pass (12 total — 11 existing + siteConfig suite).

Wait — the siteConfig tests are 7 tests from Task 0. So expected total: `Test Suites: 3 passed, Tests: 18 passed` (8 gcsUser + 3 withAuth + 7 siteConfig).

- [ ] **Step 3: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add pages/api/admin/site-config.js
git commit -m "feat: add site config GET/PUT API route"
```

---

## Task 2: Admin layout shell

**Files:**
- Create: `components/admin/platform/AdminLayout.js`
- Modify: `pages/admin/index.js`

- [ ] **Step 1: Create AdminLayout.js**

```js
// components/admin/platform/AdminLayout.js
// Splits the admin screen into a fixed sidebar (left) and scrollable content (right).

export default function AdminLayout({ sidebar, children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Sidebar — fixed width, full height */}
      <div className="w-64 flex-shrink-0 border-r border-gray-200 flex flex-col h-full overflow-hidden">
        {sidebar}
      </div>

      {/* Content area — scrollable */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update pages/admin/index.js to use AdminLayout**

Replace the entire file:

```js
// pages/admin/index.js
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useState, useRef, useCallback } from 'react'
import AdminLayout from '../../components/admin/platform/AdminLayout'
import PlatformSidebar from '../../components/admin/platform/PlatformSidebar'

const AUTOSAVE_DELAY = 1500

export default function AdminIndex() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [siteConfig, setSiteConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saving' | 'saved'
  const autosaveTimer = useRef(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/admin/site-config')
      .then(r => r.json())
      .then(config => {
        setSiteConfig(config)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load site config:', err)
        setLoading(false)
      })
  }, [status])

  const save = useCallback(async (config) => {
    setSaveStatus('saving')
    try {
      await fetch('/api/admin/site-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      console.error('Autosave failed:', err)
      setSaveStatus('idle')
    }
  }, [])

  const updateConfig = useCallback((updater) => {
    setSiteConfig(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      clearTimeout(autosaveTimer.current)
      autosaveTimer.current = setTimeout(() => save(next), AUTOSAVE_DELAY)
      return next
    })
  }, [save])

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400 text-sm">
        Loading...
      </div>
    )
  }

  if (!session || !siteConfig) return null

  return (
    <AdminLayout
      sidebar={
        <PlatformSidebar
          siteConfig={siteConfig}
          saveStatus={saveStatus}
          onConfigChange={updateConfig}
          onSignOut={() => signOut({ callbackUrl: '/auth/signin' })}
        />
      }
    >
      {/* Content pane — placeholder until page editors are wired in */}
      <div className="flex items-center justify-center h-full text-gray-300 text-sm">
        Select a page to edit
      </div>
    </AdminLayout>
  )
}
```

- [ ] **Step 3: Run all tests**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add components/admin/platform/AdminLayout.js pages/admin/index.js
git commit -m "feat: add admin layout shell with sidebar slot"
```

---

## Task 3: Platform sidebar — Level 1 UI

**Files:**
- Create: `components/admin/platform/PlatformSidebar.js`

This component receives `siteConfig` and `onConfigChange` as props — it never fetches or saves directly.

Visual reference: `components/admin/AlbumSidebar.js` (same bg-gray-50, border-r, Tailwind patterns).

- [ ] **Step 1: Create PlatformSidebar.js**

```js
// components/admin/platform/PlatformSidebar.js
import { useState } from 'react'

const PAGE_TYPE_ICONS = {
  cover: '⌂',
  gallery: '▦',
  single: '☰',
}

const PAGE_TYPE_LABELS = {
  cover: 'Cover',
  gallery: 'Gallery',
  single: 'Page',
}

function SaveBadge({ status }) {
  if (status === 'saving') return <span className="text-xs text-gray-400">Saving…</span>
  if (status === 'saved') return <span className="text-xs text-green-500">Saved</span>
  return null
}

function PublishBadge({ publishedAt }) {
  if (publishedAt) {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        Published
      </span>
    )
  }
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
      Draft
    </span>
  )
}

export default function PlatformSidebar({ siteConfig, saveStatus, onConfigChange, onSignOut }) {
  const [addingPage, setAddingPage] = useState(false)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [menuOpenId, setMenuOpenId] = useState(null)

  if (!siteConfig) return null

  const { pages = [], siteName, publishedAt } = siteConfig

  // --- Handlers ---

  function handleRenameStart(page) {
    setRenamingId(page.id)
    setRenameValue(page.title)
    setMenuOpenId(null)
  }

  function handleRenameCommit(pageId) {
    const trimmed = renameValue.trim()
    if (!trimmed) { setRenamingId(null); return }
    onConfigChange(prev => ({
      ...prev,
      pages: prev.pages.map(p => p.id === pageId ? { ...p, title: trimmed } : p),
    }))
    setRenamingId(null)
  }

  function handleDelete(pageId) {
    if (pageId === 'cover') return // cover is protected
    if (!confirm('Delete this page? This cannot be undone.')) return
    onConfigChange(prev => ({
      ...prev,
      pages: prev.pages.filter(p => p.id !== pageId),
    }))
  }

  function handleAddPage(type) {
    const title = type === 'gallery' ? 'New Gallery' : 'New Page'
    const baseId = title.toLowerCase().replace(/\s+/g, '-')
    const existingIds = new Set(siteConfig.pages.map(p => p.id))
    let id = baseId
    let n = 2
    while (existingIds.has(id)) { id = `${baseId}-${n++}` }

    const newPage = type === 'gallery'
      ? { id, type: 'gallery', title, showInNav: true, layout: '2col', albums: [] }
      : { id, type: 'single', title, showInNav: true, blocks: [] }

    onConfigChange(prev => ({ ...prev, pages: [...prev.pages, newPage] }))
    setAddingPage(false)
    // Start rename immediately so user can name the page
    setRenamingId(id)
    setRenameValue(title)
  }

  function handlePublishToggle() {
    onConfigChange(prev => ({
      ...prev,
      publishedAt: prev.publishedAt ? null : new Date().toISOString(),
    }))
  }

  // --- Render ---

  return (
    <div className="flex flex-col h-full bg-gray-50 select-none">

      {/* Header: site name + publish badge */}
      <div className="px-4 py-4 border-b border-gray-200 flex-shrink-0">
        <div className="font-bold text-gray-900 text-base truncate">{siteName || 'My Portfolio'}</div>
        <div className="flex items-center gap-2 mt-1">
          <PublishBadge publishedAt={publishedAt} />
          <SaveBadge status={saveStatus} />
        </div>
      </div>

      {/* Pages list */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-1 mb-1">
          Pages
        </div>

        {pages.map(page => (
          <div key={page.id} className="relative">
            {renamingId === page.id ? (
              /* Inline rename input */
              <input
                autoFocus
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onBlur={() => handleRenameCommit(page.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRenameCommit(page.id)
                  if (e.key === 'Escape') setRenamingId(null)
                }}
                className="w-full px-3 py-1.5 text-sm border border-blue-400 rounded-md outline-none bg-white"
              />
            ) : (
              <div className="flex items-center px-3 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100 group">
                {/* Type icon */}
                <span className="mr-2 text-gray-400 text-xs w-4 text-center">
                  {PAGE_TYPE_ICONS[page.type] || '☰'}
                </span>

                {/* Title */}
                <span className="flex-1 truncate">{page.title}</span>

                {/* Type label */}
                <span className="text-xs text-gray-400 mr-1 hidden group-hover:inline">
                  {PAGE_TYPE_LABELS[page.type]}
                </span>

                {/* Three-dot menu */}
                {page.id !== 'cover' && (
                  <button
                    onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === page.id ? null : page.id) }}
                    className="ml-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 px-1"
                  >
                    ···
                  </button>
                )}
              </div>
            )}

            {/* Dropdown menu */}
            {menuOpenId === page.id && (
              <div className="absolute right-2 top-7 z-10 bg-white border border-gray-200 rounded-md shadow-md py-1 w-32">
                <button
                  onClick={() => handleRenameStart(page)}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Rename
                </button>
                <button
                  onClick={() => { setMenuOpenId(null); handleDelete(page.id) }}
                  className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add page */}
        {addingPage ? (
          <div className="mt-1 border border-gray-200 rounded-md bg-white p-2">
            <div className="text-xs text-gray-500 mb-1 px-1">Choose type:</div>
            <button
              onClick={() => handleAddPage('gallery')}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded"
            >
              ▦ Gallery
            </button>
            <button
              onClick={() => handleAddPage('single')}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded"
            >
              ☰ Page
            </button>
            <button
              onClick={() => setAddingPage(false)}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-50 rounded mt-1"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingPage(true)}
            className="flex items-center w-full px-3 py-1.5 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md mt-1"
          >
            <span className="mr-2">+</span> Add Page
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-3 flex-shrink-0 space-y-1">
        {/* Publish toggle */}
        <button
          onClick={handlePublishToggle}
          className={`w-full py-1.5 rounded-md text-sm font-medium transition-colors ${
            publishedAt
              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              : 'bg-gray-900 text-white hover:bg-gray-700'
          }`}
        >
          {publishedAt ? 'Unpublish' : 'Publish'}
        </button>

        {/* Theme — inactive (single theme) */}
        <div className="flex items-center px-3 py-1.5 text-sm text-gray-400 rounded-md">
          <span className="flex-1">Theme: Minimal Light</span>
        </div>

        {/* Sign out */}
        <button
          onClick={onSignOut}
          className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 rounded-md"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add components/admin/platform/PlatformSidebar.js
git commit -m "feat: add platform sidebar with page list, CRUD, and publish toggle"
```

---

## Task 4: Close click-outside for dropdown menu

The three-dot dropdown in Task 3 doesn't close when clicking elsewhere on the page. This is a quick fix.

**Files:**
- Modify: `components/admin/platform/PlatformSidebar.js`

- [ ] **Step 1: Add useEffect to close menu on outside click**

At the top of the `PlatformSidebar` component (after the existing `useState` lines), add:

```js
import { useState, useEffect, useRef } from 'react'
```

Add inside the component, after the state declarations:

```js
const menuRef = useRef(null)
useEffect(() => {
  if (!menuOpenId) return
  function handleClickOutside(e) {
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      setMenuOpenId(null)
    }
  }
  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [menuOpenId])
```

Wrap the dropdown `<div>` in a `<div ref={menuRef}>`:

Find the dropdown menu div:
```js
{menuOpenId === page.id && (
  <div className="absolute right-2 top-7 z-10 bg-white border border-gray-200 rounded-md shadow-md py-1 w-32">
```

Change to:
```js
{menuOpenId === page.id && (
  <div ref={menuRef} className="absolute right-2 top-7 z-10 bg-white border border-gray-200 rounded-md shadow-md py-1 w-32">
```

- [ ] **Step 2: Run all tests**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add components/admin/platform/PlatformSidebar.js
git commit -m "fix: close page menu dropdown on outside click"
```

---

## Task 5: Manual end-to-end verification

- [ ] **Step 1: Open http://localhost:3000/admin**

Expected: sidebar visible on the left with "My Portfolio" header, "Draft" badge, one "Home" cover page, "Add Page" button, and "Publish" button at the bottom.

- [ ] **Step 2: Add a gallery page**

Click "Add Page" → "Gallery". Expected: new page "New Gallery" appears in list with an inline rename input already focused. Type "Landscapes" and press Enter. Expected: page appears as "Landscapes" in the list. Wait 1.5s — expected: "Saved" flashes briefly.

- [ ] **Step 3: Add a single page**

Click "Add Page" → "Page". Type "About" and press Enter. Expected: "About" appears in list.

- [ ] **Step 4: Rename a page**

Hover over "Landscapes" → click "···" → "Rename". Type "Landscape Photography" → Enter. Expected: page renamed.

- [ ] **Step 5: Delete a page**

Click "···" on "About" → "Delete" → confirm. Expected: page removed from list.

- [ ] **Step 6: Verify cover page is protected**

The "Home" cover page should have no "···" menu.

- [ ] **Step 7: Publish**

Click "Publish". Expected: badge changes to "Published", button changes to "Unpublish".

- [ ] **Step 8: Verify persistence**

Refresh the page. Expected: all changes (page list, publish state) are preserved — loaded from R2.

- [ ] **Step 9: Run all tests**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest
```

Expected: all tests pass.

---

## Self-Review

**Spec coverage:**
- ✅ Per-user site-config.json at `users/{userId}/site-config.json` — Task 0 (readSiteConfig/writeSiteConfig use getUserSiteConfigPath)
- ✅ Cover page always first, cannot be deleted — PlatformSidebar: cover check in handleDelete + no three-dot menu
- ✅ Gallery Page and Single Page types — handleAddPage in PlatformSidebar
- ✅ showInNav: true for new pages — handleAddPage sets showInNav: true
- ✅ Autosave 1.5s debounce — AdminIndex AUTOSAVE_DELAY = 1500
- ✅ Draft/Published badge — PublishBadge component
- ✅ Inline rename (same pattern as existing BlockBuilder) — renamingId state + input
- ✅ Three-dot menu with Rename/Delete — menuOpenId state
- ✅ Theme dropdown (inactive, single theme) — footer shows "Theme: Minimal Light" non-interactive

**Out of scope (next steps):**
- Drag-to-reorder pages (DnD with @hello-pangea/dnd) — deferred; cover-always-first enforced at delete/add time for now
- Level 2 sidebar (clicking into a gallery page)
- Level 3 (album block editor navigation)
- Site name editing
- Breadcrumb navigation
