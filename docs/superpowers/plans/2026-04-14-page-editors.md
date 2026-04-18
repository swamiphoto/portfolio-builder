# Page Editors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the admin content pane so clicking a page in the sidebar opens its editor — cover/single pages get a block editor (BlockBuilder + live preview), gallery pages get an album list that drills into a block editor per album.

**Architecture:** `selectedPageId` and `selectedAlbumId` live in `pages/admin/index.js` and flow down as props. `PageEditor` dispatches to `BlockPageEditor` (cover/single) or `GalleryPageEditor` (gallery). Both editors wrap the existing `BlockBuilder` + `GalleryPreview` components — adapting the platform's page/album data shape to the gallery object shape BlockBuilder expects. All mutations route through `updateConfig` (the debounced autosave HOF in admin/index.js).

**Tech Stack:** Next.js 14, React, existing BlockBuilder/GalleryPreview/PhotoPickerModal components, Tailwind CSS

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `components/admin/platform/PlatformSidebar.js` | Modify | Add `selectedPageId` highlight + `onSelectPage` callback on page click |
| `pages/admin/index.js` | Modify | Add `selectedPageId`, `selectedAlbumId` state; render `PageEditor` in content pane |
| `components/admin/platform/PageEditor.js` | Create | Dispatches to correct editor based on page.type |
| `components/admin/platform/BlockPageEditor.js` | Create | BlockBuilder + GalleryPreview for cover/single pages |
| `components/admin/platform/GalleryPageEditor.js` | Create | Album list (Level 2) + AlbumBlockEditor (Level 3) for gallery pages |

---

## Task 0: Page selection in sidebar

**Files:**
- Modify: `components/admin/platform/PlatformSidebar.js`

Add `selectedPageId` and `onSelectPage` props. Highlight the selected page. Make page rows clickable.

- [ ] **Step 1: Add the two new props to the component signature**

In `components/admin/platform/PlatformSidebar.js`, find the function signature:
```js
export default function PlatformSidebar({ siteConfig, saveStatus, onConfigChange, onSignOut }) {
```

Change to:
```js
export default function PlatformSidebar({ siteConfig, saveStatus, onConfigChange, onSignOut, selectedPageId, onSelectPage }) {
```

- [ ] **Step 2: Make each page row clickable and highlight when selected**

Find the non-renaming page row div (the `<div className="flex items-center px-3 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100 group">`):

Replace with:
```js
<div
  onClick={() => onSelectPage?.(page.id)}
  className={`flex items-center px-3 py-1.5 rounded-md text-sm cursor-pointer group ${
    selectedPageId === page.id
      ? 'bg-gray-900 text-white'
      : 'text-gray-700 hover:bg-gray-100'
  }`}
>
  <span className={`mr-2 text-xs w-4 text-center ${selectedPageId === page.id ? 'text-gray-300' : 'text-gray-400'}`}>
    {PAGE_TYPE_ICONS[page.type] || '☰'}
  </span>
  <span className="flex-1 truncate">{page.title}</span>
  <span className={`text-xs mr-1 hidden group-hover:inline ${selectedPageId === page.id ? 'text-gray-400' : 'text-gray-400'}`}>
    {PAGE_TYPE_LABELS[page.type]}
  </span>
  {page.id !== 'cover' && (
    <button
      onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === page.id ? null : page.id) }}
      className={`ml-1 hover:text-gray-300 opacity-0 group-hover:opacity-100 px-1 ${selectedPageId === page.id ? 'text-gray-400' : 'text-gray-400'}`}
    >
      ···
    </button>
  )}
</div>
```

- [ ] **Step 3: Run all tests**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest
```

Expected: 22 tests pass (sidebar changes are not unit-tested).

- [ ] **Step 4: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add components/admin/platform/PlatformSidebar.js
git commit -m "feat: add page selection highlight to platform sidebar"
```

---

## Task 1: PageEditor dispatcher + admin/index.js wiring

**Files:**
- Create: `components/admin/platform/PageEditor.js`
- Modify: `pages/admin/index.js`

- [ ] **Step 1: Create PageEditor.js**

```js
// components/admin/platform/PageEditor.js
import BlockPageEditor from './BlockPageEditor'
import GalleryPageEditor from './GalleryPageEditor'

export default function PageEditor({ page, siteConfig, saveStatus, onPageChange, onAlbumChange }) {
  if (!page) {
    return (
      <div className="flex items-center justify-center h-full text-gray-300 text-sm">
        Select a page to edit
      </div>
    )
  }

  if (page.type === 'gallery') {
    return (
      <GalleryPageEditor
        page={page}
        saveStatus={saveStatus}
        onPageChange={onPageChange}
      />
    )
  }

  // cover and single pages — block-based editing
  return (
    <BlockPageEditor
      page={page}
      saveStatus={saveStatus}
      onPageChange={onPageChange}
    />
  )
}
```

- [ ] **Step 2: Update pages/admin/index.js**

Replace the entire file:

```js
// pages/admin/index.js
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useState, useRef, useCallback } from 'react'
import AdminLayout from '../../components/admin/platform/AdminLayout'
import PlatformSidebar from '../../components/admin/platform/PlatformSidebar'
import PageEditor from '../../components/admin/platform/PageEditor'

const AUTOSAVE_DELAY = 1500

export default function AdminIndex() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [siteConfig, setSiteConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState('idle')
  const [selectedPageId, setSelectedPageId] = useState(null)
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
      const res = await fetch('/api/admin/site-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      console.error('Autosave failed:', err)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
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

  // Update a specific page's data within the site config
  const updatePage = useCallback((pageId, updatedPage) => {
    updateConfig(prev => ({
      ...prev,
      pages: prev.pages.map(p => p.id === pageId ? updatedPage : p),
    }))
  }, [updateConfig])

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400 text-sm">
        Loading...
      </div>
    )
  }

  if (!session || !siteConfig) return null

  const selectedPage = siteConfig.pages.find(p => p.id === selectedPageId) || null

  return (
    <AdminLayout
      sidebar={
        <PlatformSidebar
          siteConfig={siteConfig}
          saveStatus={saveStatus}
          onConfigChange={updateConfig}
          onSignOut={() => signOut({ callbackUrl: '/auth/signin' })}
          selectedPageId={selectedPageId}
          onSelectPage={setSelectedPageId}
        />
      }
    >
      <PageEditor
        page={selectedPage}
        siteConfig={siteConfig}
        saveStatus={saveStatus}
        onPageChange={(updated) => updatePage(selectedPageId, updated)}
      />
    </AdminLayout>
  )
}
```

- [ ] **Step 3: Run all tests**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest
```

Expected: 22 tests pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add components/admin/platform/PageEditor.js pages/admin/index.js
git commit -m "feat: wire page selection to content pane via PageEditor"
```

---

## Task 2: BlockPageEditor — cover and single page block editing

**Files:**
- Create: `components/admin/platform/BlockPageEditor.js`

This wraps the existing `BlockBuilder` + `GalleryPreview` (from `components/admin/gallery-builder/`). The platform page data is adapted to the gallery object shape that BlockBuilder expects.

BlockBuilder expects `gallery` with: `blocks`, `name`, `description`, `thumbnailUrl`, `enableSlideshow`, `showCover`

- [ ] **Step 1: Create BlockPageEditor.js**

```js
// components/admin/platform/BlockPageEditor.js
import { useState, useCallback } from 'react'
import BlockBuilder from '../gallery-builder/BlockBuilder'
import GalleryPreview from '../gallery-builder/GalleryPreview'
import PhotoPickerModal from '../gallery-builder/PhotoPickerModal'

/**
 * Adapts a platform page (cover/single) to the BlockBuilder interface.
 * Platform page shape: { id, type, title, blocks, showInNav }
 * BlockBuilder gallery shape: { name, description, blocks, thumbnailUrl, enableSlideshow, showCover }
 */
function pageToGallery(page) {
  return {
    name: page.title,
    description: '',
    blocks: page.blocks || [],
    thumbnailUrl: '',
    enableSlideshow: false,
    showCover: false,
  }
}

function galleryToPage(page, gallery) {
  return {
    ...page,
    title: gallery.name || page.title,
    blocks: gallery.blocks || [],
  }
}

export default function BlockPageEditor({ page, saveStatus, onPageChange }) {
  const [libraryImages, setLibraryImages] = useState(null)
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false)
  const [photoPickerBlockIndex, setPhotoPickerBlockIndex] = useState(null)
  const [expanded, setExpanded] = useState(false)

  const gallery = pageToGallery(page)

  const handleGalleryChange = useCallback((updatedGallery) => {
    onPageChange(galleryToPage(page, updatedGallery))
  }, [page, onPageChange])

  const fetchLibrary = useCallback(() => {
    if (libraryImages !== null) return
    setLibraryLoading(true)
    fetch('/api/admin/library')
      .then(r => r.json())
      .then(data => {
        setLibraryImages(data.allImages || [])
        setLibraryLoading(false)
      })
      .catch(() => setLibraryLoading(false))
  }, [libraryImages])

  const handleAddPhotosToBlock = useCallback((blockIndex) => {
    setPhotoPickerBlockIndex(blockIndex)
    setPhotoPickerOpen(true)
    fetchLibrary()
  }, [fetchLibrary])

  const handlePhotoPickerConfirm = useCallback((urls, blockType) => {
    if (photoPickerBlockIndex === null) return
    const blocks = [...(page.blocks || [])]
    const block = blocks[photoPickerBlockIndex]
    if (!block) return
    blocks[photoPickerBlockIndex] = {
      ...block,
      imageUrls: [...(block.imageUrls || []), ...urls],
    }
    onPageChange({ ...page, blocks })
    setPhotoPickerOpen(false)
    setPhotoPickerBlockIndex(null)
  }, [photoPickerBlockIndex, page, onPageChange])

  const autosaveStatus = saveStatus === 'saving' ? 'saving'
    : saveStatus === 'saved' ? 'saved'
    : saveStatus === 'error' ? 'unsaved'
    : 'idle'

  return (
    <div className="flex h-full">
      <BlockBuilder
        gallery={gallery}
        onChange={handleGalleryChange}
        onPublish={null}
        publishing={false}
        autosaveStatus={autosaveStatus}
        hasDraft={false}
        isPublished={false}
        onAddPhotosToBlock={handleAddPhotosToBlock}
        onPickThumbnail={null}
        expanded={expanded}
        onToggleExpand={() => setExpanded(v => !v)}
      />

      <GalleryPreview gallery={gallery} />

      {photoPickerOpen && (
        <PhotoPickerModal
          images={libraryImages || []}
          loading={libraryLoading}
          blockType={page.blocks?.[photoPickerBlockIndex]?.type || 'photo'}
          defaultFolder={null}
          onConfirm={handlePhotoPickerConfirm}
          onClose={() => { setPhotoPickerOpen(false); setPhotoPickerBlockIndex(null) }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest
```

Expected: 22 tests pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add components/admin/platform/BlockPageEditor.js
git commit -m "feat: add BlockPageEditor for cover and single pages"
```

---

## Task 3: GalleryPageEditor — album list + album block editing

**Files:**
- Create: `components/admin/platform/GalleryPageEditor.js`

Gallery pages have two levels:
- **Level 2**: Album list (click to select, Add Album button, breadcrumb)
- **Level 3**: Album block editor (same BlockBuilder setup as BlockPageEditor, breadcrumb shows Pages / Gallery / Album)

- [ ] **Step 1: Create GalleryPageEditor.js**

```js
// components/admin/platform/GalleryPageEditor.js
import { useState, useCallback } from 'react'
import BlockBuilder from '../gallery-builder/BlockBuilder'
import GalleryPreview from '../gallery-builder/GalleryPreview'
import PhotoPickerModal from '../gallery-builder/PhotoPickerModal'

function generateAlbumId(title, existingIds) {
  const base = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  let id = base
  let n = 2
  while (existingIds.has(id)) { id = `${base}-${n++}` }
  return id
}

function albumToGallery(album) {
  return {
    name: album.title,
    description: '',
    blocks: album.blocks || [],
    thumbnailUrl: album.thumbnailUrl || '',
    enableSlideshow: false,
    showCover: false,
  }
}

function galleryToAlbum(album, gallery) {
  return {
    ...album,
    title: gallery.name || album.title,
    blocks: gallery.blocks || [],
  }
}

// ---- Album Block Editor (Level 3) ----
function AlbumEditor({ page, album, onAlbumChange, saveStatus, onBack }) {
  const [libraryImages, setLibraryImages] = useState(null)
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false)
  const [photoPickerBlockIndex, setPhotoPickerBlockIndex] = useState(null)
  const [expanded, setExpanded] = useState(false)

  const gallery = albumToGallery(album)

  const handleGalleryChange = useCallback((updatedGallery) => {
    onAlbumChange(galleryToAlbum(album, updatedGallery))
  }, [album, onAlbumChange])

  const fetchLibrary = useCallback(() => {
    if (libraryImages !== null) return
    setLibraryLoading(true)
    fetch('/api/admin/library')
      .then(r => r.json())
      .then(data => { setLibraryImages(data.allImages || []); setLibraryLoading(false) })
      .catch(() => setLibraryLoading(false))
  }, [libraryImages])

  const handleAddPhotosToBlock = useCallback((blockIndex) => {
    setPhotoPickerBlockIndex(blockIndex)
    setPhotoPickerOpen(true)
    fetchLibrary()
  }, [fetchLibrary])

  const handlePhotoPickerConfirm = useCallback((urls) => {
    if (photoPickerBlockIndex === null) return
    const blocks = [...(album.blocks || [])]
    const block = blocks[photoPickerBlockIndex]
    if (!block) return
    blocks[photoPickerBlockIndex] = {
      ...block,
      imageUrls: [...(block.imageUrls || []), ...urls],
    }
    onAlbumChange({ ...album, blocks })
    setPhotoPickerOpen(false)
    setPhotoPickerBlockIndex(null)
  }, [photoPickerBlockIndex, album, onAlbumChange])

  const autosaveStatus = saveStatus === 'saving' ? 'saving'
    : saveStatus === 'saved' ? 'saved'
    : saveStatus === 'error' ? 'unsaved'
    : 'idle'

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-100 text-xs text-gray-400 flex-shrink-0">
        <button onClick={onBack} className="hover:text-gray-700 transition-colors">
          {page.title}
        </button>
        <span>/</span>
        <span className="text-gray-700 font-medium">{album.title}</span>
      </div>

      <div className="flex flex-1 min-h-0">
        <BlockBuilder
          gallery={gallery}
          onChange={handleGalleryChange}
          onPublish={null}
          publishing={false}
          autosaveStatus={autosaveStatus}
          hasDraft={false}
          isPublished={false}
          onAddPhotosToBlock={handleAddPhotosToBlock}
          onPickThumbnail={null}
          expanded={expanded}
          onToggleExpand={() => setExpanded(v => !v)}
        />
        <GalleryPreview gallery={gallery} />
      </div>

      {photoPickerOpen && (
        <PhotoPickerModal
          images={libraryImages || []}
          loading={libraryLoading}
          blockType={album.blocks?.[photoPickerBlockIndex]?.type || 'photo'}
          defaultFolder={null}
          onConfirm={handlePhotoPickerConfirm}
          onClose={() => { setPhotoPickerOpen(false); setPhotoPickerBlockIndex(null) }}
        />
      )}
    </div>
  )
}

// ---- Album List (Level 2) ----
function AlbumList({ page, onSelectAlbum, onPageChange }) {
  const albums = page.albums || []

  function handleAddAlbum() {
    const title = 'New Album'
    const existingIds = new Set(albums.map(a => a.id))
    const id = generateAlbumId(title, existingIds)
    const newAlbum = { id, title, thumbnailUrl: '', blocks: [] }
    onPageChange({ ...page, albums: [...albums, newAlbum] })
    onSelectAlbum(id)
  }

  function handleDeleteAlbum(albumId) {
    if (!confirm('Delete this album? This cannot be undone.')) return
    onPageChange({ ...page, albums: albums.filter(a => a.id !== albumId) })
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Breadcrumb */}
      <div className="text-xs text-gray-400 mb-6">{page.title}</div>

      <h1 className="text-xl font-semibold text-gray-900 mb-6">{page.title}</h1>

      {albums.length === 0 ? (
        <div className="text-gray-400 text-sm mb-6">No albums yet. Add one to get started.</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {albums.map(album => (
            <div
              key={album.id}
              className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-400 transition-colors cursor-pointer group relative"
              onClick={() => onSelectAlbum(album.id)}
            >
              {album.thumbnailUrl ? (
                <img src={album.thumbnailUrl} alt={album.title} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-300 text-sm">
                  No photos yet
                </div>
              )}
              <div className="px-3 py-2 flex items-center">
                <span className="flex-1 text-sm font-medium text-gray-800">{album.title}</span>
                <span className="text-xs text-gray-400">{(album.blocks || []).filter(b => b.type !== 'text').length} photos</span>
              </div>
              <button
                onClick={e => { e.stopPropagation(); handleDeleteAlbum(album.id) }}
                className="absolute top-2 right-2 bg-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 shadow text-gray-500 hover:text-red-600 text-xs transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleAddAlbum}
        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        + Add Album
      </button>
    </div>
  )
}

// ---- GalleryPageEditor (top-level: Level 2 or 3) ----
export default function GalleryPageEditor({ page, saveStatus, onPageChange }) {
  const [selectedAlbumId, setSelectedAlbumId] = useState(null)

  const selectedAlbum = (page.albums || []).find(a => a.id === selectedAlbumId) || null

  const handleAlbumChange = useCallback((updatedAlbum) => {
    onPageChange({
      ...page,
      albums: (page.albums || []).map(a => a.id === updatedAlbum.id ? updatedAlbum : a),
    })
  }, [page, onPageChange])

  if (selectedAlbum) {
    return (
      <AlbumEditor
        page={page}
        album={selectedAlbum}
        onAlbumChange={handleAlbumChange}
        saveStatus={saveStatus}
        onBack={() => setSelectedAlbumId(null)}
      />
    )
  }

  return (
    <AlbumList
      page={page}
      onSelectAlbum={setSelectedAlbumId}
      onPageChange={onPageChange}
    />
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest
```

Expected: 22 tests pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add components/admin/platform/GalleryPageEditor.js
git commit -m "feat: add GalleryPageEditor with album list and album block editor"
```

---

## Task 4: Manual end-to-end verification

- [ ] **Step 1: Visit http://localhost:3000/admin**

Expected: sidebar shows page list, content pane shows "Select a page to edit".

- [ ] **Step 2: Click "Home" (cover page)**

Expected: BlockBuilder sidebar appears on left, live preview on right. No content until you add blocks.

- [ ] **Step 3: Add a text block to the cover page**

In BlockBuilder, click "+" → Text → type something. Expected: preview updates. Wait 1.5s → "Saved" badge appears. Refresh → content persists.

- [ ] **Step 4: Add a gallery page and click into it**

Click "Add Page" → Gallery → name it "Landscapes". Click "Landscapes" in the sidebar. Expected: album list view (Level 2) with "+ Add Album" button.

- [ ] **Step 5: Add an album**

Click "+ Add Album". Expected: "New Album" appears in the grid and immediately opens the album editor (Level 3). Add a text block. Wait for save.

- [ ] **Step 6: Navigate back to album list**

Click "Landscapes" breadcrumb at top of album editor. Expected: returns to album list (Level 2).

- [ ] **Step 7: Add a single page and click into it**

Click "Add Page" → Page → name it "About". Click "About" in sidebar. Expected: BlockBuilder opens for the single page.

- [ ] **Step 8: Run all tests**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest
```

Expected: 22 tests pass.

---

## Self-Review

**Spec coverage:**
- ✅ Clicking a page in sidebar selects it and opens editor — Task 0 + Task 1
- ✅ Cover page → block editor — Task 2 (BlockPageEditor, type 'cover')
- ✅ Single page → block editor — Task 2 (BlockPageEditor, type 'single')
- ✅ Gallery page → album list — Task 3 (GalleryPageEditor AlbumList)
- ✅ Album → block editor — Task 3 (AlbumEditor)
- ✅ Breadcrumb: Pages / Gallery / Album — Task 3 (AlbumEditor breadcrumb shows page.title / album.title)
- ✅ Add Album — Task 3 (handleAddAlbum)
- ✅ Delete Album — Task 3 (handleDeleteAlbum with confirm)
- ✅ All mutations route through updateConfig/onPageChange — Tasks 1-3
- ✅ Photo picker wired — Tasks 2-3 (PhotoPickerModal + /api/admin/library)
- ✅ Autosave status shown in BlockBuilder header — Tasks 2-3 (autosaveStatus derived from saveStatus)

**Out of scope (next steps):**
- Cover page-specific editor fields (site name, tagline, hero image picker) — cover uses generic block editor for now
- Level 2 sidebar (platform sidebar updating breadcrumb when in gallery/album view)
- Album rename (click title to rename) — can be added to AlbumList
- Drag-to-reorder albums
- GalleryPreview for cover page (using Gallery component which expects gallery-style blocks)
