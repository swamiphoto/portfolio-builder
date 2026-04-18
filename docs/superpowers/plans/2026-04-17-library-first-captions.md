# Library-First Caption Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the library asset caption the single source of truth, with opt-in per-block overrides edited exclusively through the lightbox.

**Architecture:** Change `imageRef.caption` semantics so `undefined` means "no override → fall back to library," while a defined string (including empty) means "this is an explicit override." Remove all inline caption editing from the block sidebar and thumbnail hover. The lightbox becomes the single edit surface: default edits update the library asset (propagating to every use), while a "Override for this page" toggle switches the edit to write to the block ref. Both admin and published-site render paths resolve captions via a shared helper that consults the library when no override exists.

**Tech Stack:** Next.js (pages router), React, GCS JSON config storage, existing `/api/admin/library` and `/api/admin/site-config` endpoints.

---

## File Structure

**New:**
- `common/captionResolver.js` — single helper: `resolveCaption(ref, assetsByUrl)` returning `ref.caption ?? asset?.caption ?? ''`
- `__tests__/common/captionResolver.test.js` — unit tests for resolver
- `__tests__/common/assetRefs.captions.test.js` — tests for undefined-preserving normalization

**Modified:**
- `common/assetRefs.js` — `normalizeImageRefs` and `buildMultiImageFields` must preserve `undefined` captions distinctly from empty strings
- `components/admin/gallery-builder/PhotoPickerModal.js` — stop copying library caption into the new ref; insert `{ assetId, url }` with no caption
- `components/admin/gallery-builder/GalleryBuilder.js` — `handlePhotoPickerConfirm` stops seeding captions from `captionMap`
- `components/admin/gallery-builder/BlockCard.js` — remove photo-block `<input>` caption field; remove click-to-edit on `PhotoThumb`; keep caption display; feed resolved captions into hover display
- `components/admin/AdminPhotoLightbox.js` — caption textarea wired to library by default; adds "Override for this page" toggle; shows override indicator + "Revert to library" link
- `components/admin/gallery-builder/BlockBuilder.js` — pass `onUpdateLibraryCaption` callback and `assetsByUrl` through to `BlockCard`
- `components/admin/platform/PageEditorSidebar.js` — wire `onUpdateLibraryCaption` callback
- `pages/admin/index.js` — add `handleUpdateLibraryCaption` that PATCHes the library config for a single asset
- `pages/api/admin/library.js` — accept partial asset updates (single-asset caption patch)
- `pages/sites/[username].js` — load library config alongside site config and pass `assetsByUrl` to gallery renderer
- `components/image-displays/gallery/Gallery.js` (or whatever renders blocks publicly) — accept `assetsByUrl` and resolve captions before passing to each block renderer

---

## Task 1: Preserve undefined caption in normalization

**Files:**
- Modify: `common/assetRefs.js`
- Test: `__tests__/common/assetRefs.captions.test.js` (create)

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/common/assetRefs.captions.test.js
import { normalizeImageRefs, buildMultiImageFields } from '../../common/assetRefs'

describe('caption semantics', () => {
  test('normalizeImageRefs preserves undefined caption', () => {
    const result = normalizeImageRefs([{ assetId: 'a1', url: 'u1' }])
    expect(result[0]).toEqual({ assetId: 'a1', url: 'u1' })
    expect(result[0].caption).toBeUndefined()
  })

  test('normalizeImageRefs preserves explicit empty caption as override', () => {
    const result = normalizeImageRefs([{ assetId: 'a1', url: 'u1', caption: '' }])
    expect(result[0]).toEqual({ assetId: 'a1', url: 'u1', caption: '' })
    expect('caption' in result[0]).toBe(true)
  })

  test('normalizeImageRefs preserves defined caption', () => {
    const result = normalizeImageRefs([{ assetId: 'a1', url: 'u1', caption: 'hi' }])
    expect(result[0]).toEqual({ assetId: 'a1', url: 'u1', caption: 'hi' })
  })

  test('normalizeImageRefs accepts bare string URLs without caption', () => {
    const result = normalizeImageRefs(['u1'])
    expect(result[0]).toEqual({ assetId: null, url: 'u1' })
    expect(result[0].caption).toBeUndefined()
  })

  test('buildMultiImageFields preserves undefined caption per ref', () => {
    const refs = [{ assetId: 'a1', url: 'u1' }, { assetId: 'a2', url: 'u2', caption: 'two' }]
    const fields = buildMultiImageFields(refs)
    expect(fields.images[0].caption).toBeUndefined()
    expect(fields.images[1].caption).toBe('two')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest __tests__/common/assetRefs.captions.test.js`
Expected: FAIL — current normalizer likely defaults caption to `''`.

- [ ] **Step 3: Update normalizer**

Edit `common/assetRefs.js`. Replace the caption default with conditional preservation. The `normalizeImageRefs` function must look like:

```javascript
export function normalizeImageRefs(raw) {
  if (!raw) return []
  return raw.map(item => {
    if (typeof item === 'string') return { assetId: null, url: item }
    const { assetId = null, url, caption } = item
    const ref = { assetId, url }
    if (caption !== undefined) ref.caption = caption
    return ref
  }).filter(r => r.url)
}
```

And `buildMultiImageFields`:

```javascript
export function buildMultiImageFields(refs) {
  const images = refs.map(r => {
    const out = { assetId: r.assetId ?? null, url: r.url }
    if (r.caption !== undefined) out.caption = r.caption
    return out
  })
  const imageUrls = images.map(i => i.url)
  return { images, imageUrls }
}
```

- [ ] **Step 4: Run tests**

Run: `npx jest __tests__/common/assetRefs`
Expected: PASS for both the new caption tests and the existing `assetRefs.test.js`.

- [ ] **Step 5: Commit**

```bash
git add common/assetRefs.js __tests__/common/assetRefs.captions.test.js
git commit -m "feat(assetRefs): preserve undefined caption to signal no override"
```

---

## Task 2: Caption resolver helper

**Files:**
- Create: `common/captionResolver.js`
- Test: `__tests__/common/captionResolver.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/common/captionResolver.test.js
import { resolveCaption } from '../../common/captionResolver'

describe('resolveCaption', () => {
  const assetsByUrl = {
    'https://cdn/1.jpg': { assetId: 'a1', caption: 'Library caption' },
    'https://cdn/2.jpg': { assetId: 'a2', caption: '' },
  }

  test('returns ref caption when defined', () => {
    expect(resolveCaption({ url: 'https://cdn/1.jpg', caption: 'Override' }, assetsByUrl))
      .toBe('Override')
  })

  test('returns ref caption even if empty string (explicit override)', () => {
    expect(resolveCaption({ url: 'https://cdn/1.jpg', caption: '' }, assetsByUrl))
      .toBe('')
  })

  test('falls back to library caption when ref caption undefined', () => {
    expect(resolveCaption({ url: 'https://cdn/1.jpg' }, assetsByUrl))
      .toBe('Library caption')
  })

  test('returns empty string when neither defined', () => {
    expect(resolveCaption({ url: 'https://cdn/missing.jpg' }, assetsByUrl))
      .toBe('')
  })

  test('isCaptionOverridden returns true when ref.caption defined', () => {
    const { isCaptionOverridden } = require('../../common/captionResolver')
    expect(isCaptionOverridden({ url: 'u', caption: 'x' })).toBe(true)
    expect(isCaptionOverridden({ url: 'u', caption: '' })).toBe(true)
    expect(isCaptionOverridden({ url: 'u' })).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest __tests__/common/captionResolver.test.js`
Expected: FAIL — file does not exist.

- [ ] **Step 3: Create helper**

Create `common/captionResolver.js`:

```javascript
export function resolveCaption(ref, assetsByUrl) {
  if (ref && ref.caption !== undefined) return ref.caption
  const asset = assetsByUrl?.[ref?.url]
  return asset?.caption ?? ''
}

export function isCaptionOverridden(ref) {
  return ref != null && ref.caption !== undefined
}
```

- [ ] **Step 4: Run tests**

Run: `npx jest __tests__/common/captionResolver.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/captionResolver.js __tests__/common/captionResolver.test.js
git commit -m "feat: add resolveCaption/isCaptionOverridden helper"
```

---

## Task 3: PhotoPickerModal stops copying library captions into refs

**Files:**
- Modify: `components/admin/gallery-builder/PhotoPickerModal.js` (lines ~131 and ~247)
- Modify: `components/admin/gallery-builder/GalleryBuilder.js` (`handlePhotoPickerConfirm`, lines ~130-157)

- [ ] **Step 1: Update PhotoPickerModal's `onConfirm` invocation**

Read `components/admin/gallery-builder/PhotoPickerModal.js`. Find both call sites (single-image and multi-image confirm) and change them from passing `(refs, captionMap)` to just `(refs)`. The refs already carry `{ assetId, url }`; callers should never receive captions.

Replace:
```javascript
onConfirm(refs, Object.fromEntries(selectedAssets.map(a => [a.publicUrl, a.caption || ""])))
```

With:
```javascript
onConfirm(refs)
```

Do this at both call sites (around lines 131 and 247).

- [ ] **Step 2: Update `handlePhotoPickerConfirm` in GalleryBuilder.js**

Read `components/admin/gallery-builder/GalleryBuilder.js`. Find `handlePhotoPickerConfirm` and simplify it to drop the `captionMap` parameter and never seed caption into block data. The handler should:

- For `photo` block target: set `{ ...block, imageUrl: refs[0].url }` only. Do NOT set `block.caption`.
- For multi-image block target: pass refs through `buildMultiImageFields` directly, without mapping captions.

Replace the handler body with:

```javascript
const handlePhotoPickerConfirm = (refs) => {
  if (!picker) return
  const { blockIndex, replaceIndex } = picker
  const block = gallery.blocks[blockIndex]
  if (!block) { setPicker(null); return }

  if (block.type === 'photo') {
    const first = refs[0]
    if (first) updateBlock(blockIndex, { ...block, imageUrl: first.url })
  } else {
    const existing = normalizeImageRefs(block.images || block.imageUrls || [])
    const merged = replaceIndex != null
      ? existing.map((r, i) => i === replaceIndex ? refs[0] : r).filter(Boolean)
      : [...existing, ...refs]
    updateBlock(blockIndex, { ...block, ...buildMultiImageFields(merged) })
  }
  setPicker(null)
}
```

- [ ] **Step 3: Manual test**

Run: `npm run dev`. In the admin, add a photo from the library to a photo block. Confirm the saved site-config has no `caption` field on the ref (inspect via network tab or GCS).

Expected: Ref shape is `{ assetId, url }` with no caption.

- [ ] **Step 4: Commit**

```bash
git add components/admin/gallery-builder/PhotoPickerModal.js components/admin/gallery-builder/GalleryBuilder.js
git commit -m "feat(picker): stop copying library caption into block refs"
```

---

## Task 4: Library caption PATCH endpoint

**Files:**
- Modify: `pages/api/admin/library.js`

- [ ] **Step 1: Add a PATCH handler for single-asset updates**

Read `pages/api/admin/library.js`. Add a `PATCH` method branch that accepts `{ assetId, patch }` where `patch` is `{ caption }`. The server should load the library, merge the patch into `assets[assetId]`, write back.

Add inside the main handler (after the existing PUT branch):

```javascript
if (req.method === 'PATCH') {
  const { assetId, patch } = req.body || {}
  if (!assetId || !patch || typeof patch !== 'object') {
    return res.status(400).json({ error: 'assetId and patch required' })
  }
  const existingConfig = await readLibraryConfig(userId)
  const asset = existingConfig.assets?.[assetId]
  if (!asset) return res.status(404).json({ error: 'asset not found' })
  const nextAsset = { ...asset }
  if ('caption' in patch) nextAsset.caption = String(patch.caption ?? '')
  const next = {
    ...existingConfig,
    assets: { ...existingConfig.assets, [assetId]: nextAsset },
  }
  await writeLibraryConfig(userId, next)
  return res.status(200).json({ ok: true })
}
```

- [ ] **Step 2: Manual smoke test**

```bash
curl -X PATCH http://localhost:3000/api/admin/library \
  -H 'Content-Type: application/json' \
  -b 'next-auth.session-token=<copy-from-browser>' \
  -d '{"assetId":"some-real-id","patch":{"caption":"hello"}}'
```

Expected: `{"ok":true}`. Then reload admin library — caption is updated.

- [ ] **Step 3: Commit**

```bash
git add pages/api/admin/library.js
git commit -m "feat(api): add PATCH /api/admin/library for single-asset updates"
```

---

## Task 5: Plumb `onUpdateLibraryCaption` from admin index to BlockCard

**Files:**
- Modify: `pages/admin/index.js`
- Modify: `components/admin/platform/PageEditorSidebar.js`
- Modify: `components/admin/gallery-builder/BlockBuilder.js`
- Modify: `components/admin/gallery-builder/BlockCard.js`

- [ ] **Step 1: Add handler in `pages/admin/index.js`**

Add a new callback that optimistically updates the library config in local state and PATCHes the server. Insert after `handleDropImagesToPage` (around line 139):

```javascript
const [libraryConfig, setLibraryConfig] = useState(null)

useEffect(() => {
  if (status !== 'authenticated') return
  fetch('/api/admin/library').then(r => r.json()).then(setLibraryConfig).catch(() => {})
}, [status])

const handleUpdateLibraryCaption = useCallback(async (assetId, caption) => {
  if (!assetId) return
  setLibraryConfig(prev => prev ? {
    ...prev,
    assets: { ...prev.assets, [assetId]: { ...(prev.assets?.[assetId] || {}), caption } }
  } : prev)
  try {
    await fetch('/api/admin/library', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId, patch: { caption } }),
    })
  } catch (err) {
    console.error('Library caption update failed:', err)
  }
}, [])
```

Then pass `libraryConfig` and `handleUpdateLibraryCaption` through to `PageEditorSidebar`:

```javascript
const panel = selectedPage ? (
  <PageEditorSidebar
    page={selectedPage}
    siteConfig={siteConfig}
    libraryConfig={libraryConfig}
    saveStatus={saveStatus}
    onPageChange={(updated) => updatePage(selectedPageId, updated)}
    onBack={null}
    onMoveBlockToPage={handleMoveBlockToPage}
    onUpdateLibraryCaption={handleUpdateLibraryCaption}
  />
) : null
```

- [ ] **Step 2: Thread props through `PageEditorSidebar`**

Read `components/admin/platform/PageEditorSidebar.js`. Add `libraryConfig` and `onUpdateLibraryCaption` to the destructured props. Build `assetsByUrl` once:

```javascript
const assetsByUrl = useMemo(() => {
  const map = {}
  const assets = libraryConfig?.assets || {}
  for (const a of Object.values(assets)) {
    if (a?.publicUrl) map[a.publicUrl] = a
  }
  return map
}, [libraryConfig])
```

Pass `assetsByUrl` and `onUpdateLibraryCaption` into `BlockBuilder`.

- [ ] **Step 3: Thread through `BlockBuilder.js`**

Accept `assetsByUrl` and `onUpdateLibraryCaption` as props. Pass them down into each `BlockCard`.

- [ ] **Step 4: Accept props in `BlockCard.js`**

Add `assetsByUrl` and `onUpdateLibraryCaption` to the `BlockCard` props list. No UI changes yet — just accepting the plumbing. These are used in Task 6 and Task 7.

- [ ] **Step 5: Commit**

```bash
git add pages/admin/index.js components/admin/platform/PageEditorSidebar.js components/admin/gallery-builder/BlockBuilder.js components/admin/gallery-builder/BlockCard.js
git commit -m "feat: plumb library config + caption update handler to BlockCard"
```

---

## Task 6: Lightbox edits library by default, with per-page override toggle

**Files:**
- Modify: `components/admin/AdminPhotoLightbox.js`
- Modify: `components/admin/gallery-builder/BlockCard.js` (lightbox invocation, lines ~541-564)

- [ ] **Step 1: Add override toggle + revert link to AdminPhotoLightbox**

Read `components/admin/AdminPhotoLightbox.js`. The caption textarea currently saves via `onCaptionChange(index, newCaption)`. Update the component to accept new props and control which destination receives the save:

```javascript
// New props: onCaptionChangeToLibrary(index, newCaption), isOverride(index), onRevertToLibrary(index)
// Existing: onCaptionChange (used when override is ON)
```

In the render, near the caption textarea:

```jsx
<div className="mb-2 flex items-center justify-between text-xs">
  <label className="flex items-center gap-1.5 cursor-pointer">
    <input
      type="checkbox"
      checked={isOverride?.(index) ?? false}
      onChange={(e) => onToggleOverride?.(index, e.target.checked)}
      className="w-3 h-3"
    />
    <span className="text-stone-600">Override for this page</span>
  </label>
  {isOverride?.(index) && (
    <button
      type="button"
      onClick={() => onRevertToLibrary?.(index)}
      className="text-blue-600 hover:underline"
    >
      Revert to library
    </button>
  )}
</div>
<textarea
  value={caption}
  onChange={(e) => setCaption(e.target.value)}
  onBlur={saveCaption}
  placeholder={isOverride?.(index) ? 'Page-specific caption' : 'Library caption'}
  ...
/>
```

In `saveCaption`, branch based on override state:

```javascript
const saveCaption = () => {
  if (isOverride?.(index)) {
    onCaptionChange?.(index, caption)              // writes to ref.caption
  } else {
    onCaptionChangeToLibrary?.(index, caption)     // writes to library asset
  }
}
```

- [ ] **Step 2: Wire callbacks from BlockCard**

In `BlockCard.js`, locate the `AdminPhotoLightbox` render (around line 541). Replace the `onCaptionChange` prop with the expanded set:

```jsx
<AdminPhotoLightbox
  images={enriched}
  allCollections={allCollections}
  index={lightboxIndex}
  onClose={() => setLightboxIndex(null)}
  onNavigate={setLightboxIndex}
  isOverride={(i) => {
    if (isPhotoBlock) {
      const refs = normalizeImageRefs(block.images || block.imageUrls || [])
      return refs[i] != null && refs[i].caption !== undefined
    }
    return block.caption !== undefined
  }}
  onToggleOverride={(i, checked) => {
    if (isPhotoBlock) {
      const refs = normalizeImageRefs(block.images || block.imageUrls || [])
      const updated = refs.map((r, j) => {
        if (j !== i) return r
        if (checked) {
          const asset = assetsByUrl?.[r.url]
          return { ...r, caption: asset?.caption ?? '' }
        }
        const { caption, ...rest } = r
        return rest
      })
      onUpdate({ ...block, ...buildMultiImageFields(updated) })
    } else {
      if (checked) {
        const asset = assetsByUrl?.[block.imageUrl]
        onUpdate({ ...block, caption: asset?.caption ?? '' })
      } else {
        const { caption, ...rest } = block
        onUpdate(rest)
      }
    }
  }}
  onRevertToLibrary={(i) => {
    if (isPhotoBlock) {
      const refs = normalizeImageRefs(block.images || block.imageUrls || [])
      const updated = refs.map((r, j) => {
        if (j !== i) return r
        const { caption, ...rest } = r
        return rest
      })
      onUpdate({ ...block, ...buildMultiImageFields(updated) })
    } else {
      const { caption, ...rest } = block
      onUpdate(rest)
    }
  }}
  onCaptionChange={(i, newCaption) => {
    // override path: write to block ref
    if (isPhotoBlock) {
      const refs = normalizeImageRefs(block.images || block.imageUrls || [])
      const updated = refs.map((r, j) => j === i ? { ...r, caption: newCaption } : r)
      onUpdate({ ...block, ...buildMultiImageFields(updated) })
    } else {
      onUpdate({ ...block, caption: newCaption })
    }
  }}
  onCaptionChangeToLibrary={(i, newCaption) => {
    const img = enriched[i]
    if (img?.assetId && onUpdateLibraryCaption) {
      onUpdateLibraryCaption(img.assetId, newCaption)
    }
  }}
  onToggleCollection={(slug, type, add) => {
    const img = enriched[lightboxIndex];
    if (img && onToggleCollection) onToggleCollection(img.url, slug, type, add);
  }}
/>
```

- [ ] **Step 3: Ensure enrichment uses resolveCaption**

Still in `BlockCard.js`, find the enrichment loop (around line 524) where `enriched` is built. Replace the caption priority `ref.caption ?? asset.caption ?? ''` with explicit use of the helper so the lightbox shows the effective caption:

```javascript
import { resolveCaption } from '../../../common/captionResolver'
// ...
const enriched = baseImages.map(ref => {
  const asset = getAssetByUrl ? getAssetByUrl(ref.url) : null
  const effectiveCaption = resolveCaption(ref, assetsByUrl || {})
  return asset ? {
    url: asset.publicUrl,
    caption: effectiveCaption,
    originalFilename: asset.originalFilename,
    bytes: asset.bytes,
    width: asset.width,
    height: asset.height,
    source: asset.source,
    capture: asset.capture,
    usage: asset.usage,
    orientation: asset.orientation,
    assetId: asset.assetId,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    collections: collectionsByUrl?.[ref.url] || [],
  } : { ...ref, caption: effectiveCaption, collections: collectionsByUrl?.[ref.url] || [] }
})
```

- [ ] **Step 4: Manual test**

Run: `npm run dev`.

1. Open a photo in the lightbox. Edit caption. Close.
2. Open the same photo in a different block — caption should match (library-wide).
3. Open a photo, toggle "Override for this page," edit. The thumbnail in this block shows the override; the other block still shows the library caption.
4. Click "Revert to library" — override cleared, library caption shows again.

- [ ] **Step 5: Commit**

```bash
git add components/admin/AdminPhotoLightbox.js components/admin/gallery-builder/BlockCard.js
git commit -m "feat(lightbox): library-default caption edit + per-page override toggle"
```

---

## Task 7: Remove inline caption input from photo block sidebar

**Files:**
- Modify: `components/admin/gallery-builder/BlockCard.js`

- [ ] **Step 1: Delete the caption input**

Find the `{block.type === "photo" && (...)}` section. The caption `<input>` is the last child in the fragment (around line 374-379 after recent edits). Delete the entire input element:

```jsx
<input
  className={INPUT}
  placeholder="Caption"
  value={block.caption || ""}
  onChange={(e) => onUpdate({ ...block, caption: e.target.value })}
/>
```

Leave the image drag/drop zone as-is. The fragment now only contains the drop zone div.

- [ ] **Step 2: Manual verify**

Run: `npm run dev`. Open a photo block. Confirm there is no caption input below the image. The only way to edit the caption is to click the image, which opens the lightbox.

- [ ] **Step 3: Commit**

```bash
git add components/admin/gallery-builder/BlockCard.js
git commit -m "feat(sidebar): remove inline caption input from photo block"
```

---

## Task 8: Remove click-to-edit on thumbnail, show resolved caption only

**Files:**
- Modify: `components/admin/gallery-builder/BlockCard.js` (`PhotoThumb` subcomponent, lines ~28-93)

- [ ] **Step 1: Strip editing UI from `PhotoThumb`**

Replace the entire `PhotoThumb` function with a simpler version that only displays the caption on hover (no click-to-edit, no input, no `onUpdateCaption` prop). The `imageRef` passed in should already contain the resolved caption (see Step 2).

```javascript
function PhotoThumb({ imageRef, dragHandleProps, onRemove, onPreview, selected }) {
  const caption = imageRef.caption || ''

  return (
    <div
      {...dragHandleProps}
      className={`relative group/thumb aspect-square bg-stone-100 overflow-hidden cursor-grab ${selected ? 'ring-2 ring-inset ring-blue-500' : ''}`}
      onClick={onPreview}
    >
      <img
        src={getSizedUrl(imageRef.url, 'thumbnail')}
        alt=""
        className="w-full h-full object-cover pointer-events-none"
        loading="lazy"
        onError={(e) => { if (e.target.src !== imageRef.url) e.target.src = imageRef.url }}
      />
      {selected && (
        <div className="absolute top-0.5 left-0.5 bg-blue-500 text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full z-10 leading-none pointer-events-none">
          ✓
        </div>
      )}
      {caption && (
        <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[9px] px-1.5 py-1 opacity-0 group-hover/thumb:opacity-100 transition-opacity leading-tight pointer-events-none">
          {caption}
        </div>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute top-0.5 right-0.5 bg-black/50 text-white text-[9px] px-1 py-0.5 opacity-0 group-hover/thumb:opacity-100 transition-opacity leading-none z-10"
      >
        ×
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Pass resolved captions into thumbs**

Still in `BlockCard.js`, in the photos-block render loop (around line 396), compute thumbnail refs through `resolveCaption` so the display value is the correct (ref-override-or-library) caption:

```javascript
const thumbRefs = blockImageRefs.map(r => ({ ...r, caption: resolveCaption(r, assetsByUrl || {}) }))
// ...
{thumbRefs.map((ref, i) => (
  <PhotoThumb
    key={ref.url}
    imageRef={ref}
    selected={selectedIndices.has(i)}
    onPreview={(e) => {
      handleThumbClick(e, i);
      if (!e.metaKey && !e.ctrlKey && !e.shiftKey) setLightboxIndex(i);
    }}
    dragHandleProps={{ /* unchanged */ }}
    onRemove={() => onRemovePhoto(blockImageRefs[i])}
  />
))}
```

Remove the now-unused `onUpdateCaption` prop flow.

- [ ] **Step 3: Manual verify**

Run: `npm run dev`.
1. Hover a thumb — caption appears as overlay.
2. Click the caption overlay — does NOT enter edit mode; opens lightbox instead.
3. Thumb showing a library caption updates when the library caption is edited.

- [ ] **Step 4: Commit**

```bash
git add components/admin/gallery-builder/BlockCard.js
git commit -m "feat(thumb): caption is display-only; editing moves to lightbox"
```

---

## Task 9: Admin renders resolved captions in GalleryPreview

**Files:**
- Modify: `components/admin/gallery-builder/GalleryPreview.js` (accept `assetsByUrl` and resolve)
- Modify: `pages/admin/index.js` (pass `assetsByUrl` to GalleryPreview)

- [ ] **Step 1: Accept `assetsByUrl` in GalleryPreview**

Read `components/admin/gallery-builder/GalleryPreview.js`. Add an `assetsByUrl` prop. Before passing each block to its renderer, map the block's images through `resolveCaption` so the preview matches the published-site rendering. This is done in-place right before rendering each block.

At the top of the file:

```javascript
import { resolveCaption } from '../../../common/captionResolver'
```

In the block render loop, for each block that has `images` or `imageUrls`:

```javascript
const resolvedBlock = (() => {
  if (block.type === 'photo') {
    const ref = { assetId: null, url: block.imageUrl, caption: block.caption }
    const resolved = resolveCaption(ref, assetsByUrl || {})
    return { ...block, caption: resolved }
  }
  if (block.type === 'photos' || block.type === 'stacked' || block.type === 'masonry') {
    const refs = (block.images || []).length
      ? block.images
      : (block.imageUrls || []).map(url => ({ url }))
    const images = refs.map(r => ({ ...r, caption: resolveCaption(r, assetsByUrl || {}) }))
    return { ...block, images, imageUrls: images.map(i => i.url) }
  }
  return block
})()
```

Use `resolvedBlock` when rendering.

- [ ] **Step 2: Pass `assetsByUrl` from admin/index.js**

In `pages/admin/index.js`, compute `assetsByUrl` from `libraryConfig` and pass it to `GalleryPreview`:

```javascript
const assetsByUrl = useMemo(() => {
  const map = {}
  for (const a of Object.values(libraryConfig?.assets || {})) {
    if (a?.publicUrl) map[a.publicUrl] = a
  }
  return map
}, [libraryConfig])

// ...
<GalleryPreview
  gallery={{ name: selectedPage.title, description: selectedPage.description || '', blocks: selectedPage.blocks || [] }}
  pages={siteConfig.pages}
  assetsByUrl={assetsByUrl}
/>
```

- [ ] **Step 3: Manual verify**

Open the admin, edit a library caption via the lightbox, close. Preview updates without reload.

- [ ] **Step 4: Commit**

```bash
git add components/admin/gallery-builder/GalleryPreview.js pages/admin/index.js
git commit -m "feat(preview): resolve captions from library in admin preview"
```

---

## Task 10: Published site loads library and resolves captions

**Files:**
- Modify: `pages/sites/[username].js`
- Modify: the Gallery renderer used by `pages/sites/[username].js` (likely `components/image-displays/gallery/Gallery.js` — confirm by reading imports)

- [ ] **Step 1: Load library config in `getServerSideProps`**

Read `pages/sites/[username].js`. In `getServerSideProps`, add a parallel read for the library config:

```javascript
import { readSiteConfig } from '../../common/siteConfig'
import { readLibraryConfig } from '../../common/adminConfig'

// inside getServerSideProps, after resolving userId:
const [siteConfig, libraryConfig] = await Promise.all([
  readSiteConfig(lookup.userId),
  readLibraryConfig(lookup.userId).catch(() => ({ assets: {} })),
])

const assetsByUrl = {}
for (const a of Object.values(libraryConfig?.assets || {})) {
  if (a?.publicUrl) assetsByUrl[a.publicUrl] = { assetId: a.assetId, caption: a.caption }
}

return { props: { siteConfig, assetsByUrl } }
```

Pass `assetsByUrl` to whichever component renders the gallery.

- [ ] **Step 2: Enrich blocks before passing to renderers**

Find where the page iterates blocks and calls gallery renderers (PhotoBlock / StackedGallery / MasonryGallery). Wrap each block with the same resolver logic from Task 9 so each renderer receives block data with captions already resolved:

```javascript
import { resolveCaption } from '../../common/captionResolver'

function resolveBlock(block, assetsByUrl) {
  if (block.type === 'photo') {
    const ref = { url: block.imageUrl, caption: block.caption }
    return { ...block, caption: resolveCaption(ref, assetsByUrl) }
  }
  if (['photos', 'stacked', 'masonry'].includes(block.type)) {
    const refs = (block.images || []).length
      ? block.images
      : (block.imageUrls || []).map(url => ({ url }))
    const images = refs.map(r => ({ ...r, caption: resolveCaption(r, assetsByUrl) }))
    return { ...block, images, imageUrls: images.map(i => i.url) }
  }
  return block
}
```

Apply in the block map:

```javascript
blocks.map(block => renderBlock(resolveBlock(block, assetsByUrl)))
```

- [ ] **Step 3: Manual verify**

1. Run: `npm run dev`.
2. Visit the public site (e.g., `http://username.lvh.me:3000`).
3. Edit a library caption in admin. Reload public page — caption is updated.
4. Set an override in the admin lightbox. Reload public page — override shows on that page only.

- [ ] **Step 4: Commit**

```bash
git add pages/sites/[username].js
git commit -m "feat(public): load library config and resolve captions at render"
```

---

## Task 11: Cleanup — remove stale onUpdateCaption callbacks

**Files:**
- Modify: `components/admin/gallery-builder/BlockCard.js`
- Modify: `components/admin/gallery-builder/BlockBuilder.js` (if a caption-sync callback was threaded)
- Modify: `components/admin/gallery-builder/GalleryBuilder.js`

- [ ] **Step 1: Grep for `onUpdateCaption` references**

Run:
```bash
rg 'onUpdateCaption|captionMap' components pages
```

Expected: matches only in files you're about to clean up.

- [ ] **Step 2: Delete them**

Remove any `onUpdateCaption` prop threading, `captionMap` param, and caption-copying logic that Tasks 3–8 made unused.

- [ ] **Step 3: Re-run all tests**

```bash
npx jest
```

Expected: all tests pass.

- [ ] **Step 4: Manual smoke test**

End-to-end:
1. Add a photo from the library → block uses library caption automatically.
2. Open lightbox, edit caption (no override) → library caption updates; all instances reflect the change.
3. Toggle "Override for this page", edit caption → only this block shows the override.
4. Click "Revert to library" → override clears, library caption returns.
5. Remove the photo and re-add it → caption is the current library value (no stale override).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: drop unused onUpdateCaption plumbing and captionMap"
```

---

## Self-Review Notes

- **Spec coverage**
  - Remove sidebar caption input → Task 7 ✓
  - Remove thumb click-to-edit → Task 8 ✓
  - Lightbox library-default save → Task 6 ✓
  - Override toggle → Task 6 ✓
  - Revert to library → Task 6 ✓
  - Library propagation → Tasks 2, 6, 9, 10 ✓
  - Published site resolution → Task 10 ✓
  - No caption copy on insert → Task 3 ✓

- **Placeholder scan:** none — every step has concrete code.

- **Type consistency:** `assetsByUrl` shape `{ [url]: { assetId, caption, ... } }` is consistent across Tasks 5, 6, 9, 10. `resolveCaption(ref, assetsByUrl)` signature stable. `isOverride(index)` and `onToggleOverride(index, checked)` signatures match between the lightbox and BlockCard.

- **Known follow-ups (out of scope):** cross-page override indicator ("Overridden on 2 pages"), bulk caption editing, undo beyond the simple revert button.
