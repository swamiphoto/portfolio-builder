# Page Model Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the page model to a single type with blocks, rename stacked/masonry to `photos` with a `layout` field, and add a new `page-gallery` block type that renders a thumbnail grid linking to other pages.

**Architecture:** All pages are `{ id, title, showInNav, thumbnailUrl, blocks }` — no type field. The `page-gallery` block threads a `pages` prop from `admin/index.js` → `BlockPageEditor` → `BlockBuilder`/`GalleryPreview` → `BlockCard`/`Gallery`. Legacy `stacked`/`masonry` data types are handled gracefully in the renderer — no migration needed.

**Tech Stack:** Next.js 14, React, Tailwind CSS, existing BlockBuilder/GalleryPreview/Gallery/BlockCard components

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `common/siteConfig.js` | Modify | Remove `type` from default page, rename id from `cover` → `home` |
| `__tests__/common/siteConfig.test.js` | Modify | Update test to match new default page shape |
| `components/admin/gallery-builder/BlockTypeMenu.js` | Modify | Fix `defaultBlock("photos")`, add `page-gallery` type |
| `components/admin/gallery-builder/BlockCard.js` | Modify | Add `pages` prop, handle `photos` and `page-gallery` block types |
| `components/admin/gallery-builder/BlockBuilder.js` | Modify | Accept `pages` prop, pass to `BlockCard` |
| `components/admin/gallery-builder/GalleryPreview.js` | Modify | Accept `pages` prop, pass to `Gallery` |
| `components/image-displays/gallery/Gallery.js` | Modify | Accept `pages` prop, add `photos` case, add `page-gallery` case |
| `components/admin/platform/BlockPageEditor.js` | Modify | Accept `siteConfig` prop, fix thumbnail adapters, pass `pages` down |
| `components/admin/platform/PageEditor.js` | Modify | Remove gallery dispatch, always render `BlockPageEditor` |
| `components/admin/platform/GalleryPageEditor.js` | Delete | No longer needed |
| `components/admin/platform/PlatformSidebar.js` | Modify | Remove type icons/labels/picker, simplify Add Page |

---

## Task 1: Simplify default site config

**Files:**
- Modify: `common/siteConfig.js`
- Modify: `__tests__/common/siteConfig.test.js`

- [ ] **Step 1: Update the test to expect the new page shape**

In `__tests__/common/siteConfig.test.js`, replace the `createDefaultSiteConfig` describe block:

```js
describe('createDefaultSiteConfig', () => {
  it('returns a config with one home page', () => {
    const config = createDefaultSiteConfig('user-123')
    expect(config.userId).toBe('user-123')
    expect(config.pages).toHaveLength(1)
    expect(config.pages[0].id).toBe('home')
    expect(config.pages[0].title).toBe('Home')
    expect(config.pages[0].showInNav).toBe(false)
    expect(config.pages[0].thumbnailUrl).toBe('')
    expect(config.pages[0]).not.toHaveProperty('type')
    expect(config.pages[0]).not.toHaveProperty('albums')
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
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest __tests__/common/siteConfig.test.js -t "createDefaultSiteConfig" --no-coverage
```

Expected: FAIL — `expect(config.pages[0].id).toBe('home')` fails because id is `'cover'`.

- [ ] **Step 3: Update `createDefaultSiteConfig` in `common/siteConfig.js`**

Replace the `createDefaultSiteConfig` function:

```js
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
        id: 'home',
        title: 'Home',
        showInNav: false,
        thumbnailUrl: '',
        blocks: [],
      },
    ],
  }
}
```

- [ ] **Step 4: Run the tests**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest
```

Expected: all 22 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add common/siteConfig.js __tests__/common/siteConfig.test.js
git commit -m "feat: simplify default page — remove type, rename cover to home"
```

---

## Task 2: Fix `photos` block type + add `page-gallery` in BlockTypeMenu

**Files:**
- Modify: `components/admin/gallery-builder/BlockTypeMenu.js`

The current `defaultBlock("photos")` creates `{ type: "stacked", ... }` — a mismatch. Fix it to produce `{ type: "photos", layout: "stacked", ... }`. Add `page-gallery` to the menu.

- [ ] **Step 1: Replace the entire file**

```js
import { useEffect, useRef } from "react";

const BLOCK_TYPES = [
  { type: "photo", label: "Photo", desc: "Single photo with caption" },
  { type: "photos", label: "Photos", desc: "Multi-photo layout" },
  { type: "text", label: "Text", desc: "Text between photos" },
  { type: "video", label: "Video", desc: "YouTube video embed" },
  { type: "page-gallery", label: "Page Gallery", desc: "Thumbnail links to other pages" },
];

export function defaultBlock(type) {
  switch (type) {
    case "photo":
      return { type: "photo", imageUrl: "", caption: "", variant: 1 };
    case "photos":
      return { type: "photos", imageUrls: [], layout: "stacked" };
    case "stacked":
      return { type: "photos", imageUrls: [], layout: "stacked" };
    case "masonry":
      return { type: "photos", imageUrls: [], layout: "masonry" };
    case "text":
      return { type: "text", content: "", variant: 1 };
    case "video":
      return { type: "video", url: "", caption: "", variant: 1 };
    case "page-gallery":
      return { type: "page-gallery", pageIds: [] };
    default:
      return { type };
  }
}

export default function BlockTypeMenu({ onAdd, onClose, anchorRect }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const openUpward = anchorRect && window.innerHeight - anchorRect.bottom < 280;
  const style = anchorRect
    ? {
        position: "fixed",
        left: anchorRect.left,
        width: 256,
        zIndex: 9999,
        ...(openUpward
          ? { bottom: window.innerHeight - anchorRect.top + 4 }
          : { top: anchorRect.bottom + 4 }),
      }
    : undefined;

  return (
    <div
      ref={ref}
      className="bg-white border border-stone-200 shadow-[0_4px_20px_rgba(0,0,0,0.1)] py-1.5 overflow-hidden"
      style={style}
    >
      {BLOCK_TYPES.map(({ type, label, desc }) => (
        <button
          key={type}
          onClick={() => {
            onAdd(defaultBlock(type));
            onClose();
          }}
          className="w-full text-left px-4 py-2.5 hover:bg-stone-50 transition-colors"
        >
          <div className="text-sm font-medium text-stone-800">{label}</div>
          <div className="text-xs text-stone-400 mt-0.5">{desc}</div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Run all tests**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest
```

Expected: all 22 tests pass (BlockTypeMenu has no unit tests).

- [ ] **Step 3: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add components/admin/gallery-builder/BlockTypeMenu.js
git commit -m "feat: fix photos block type and add page-gallery to block picker"
```

---

## Task 3: Update BlockCard for `photos` and `page-gallery` block types

**Files:**
- Modify: `components/admin/gallery-builder/BlockCard.js`

BlockCard needs to: accept a `pages` prop, recognize `photos` as a photo block type (alongside legacy `stacked`/`masonry`), and render a checkbox list for `page-gallery` blocks.

- [ ] **Step 1: Replace the entire file**

```js
import { useState, useRef, useEffect } from "react";
import DesignPopover from "./DesignPopover";

const TYPE_LABELS = {
  photo: "Photo",
  photos: "Photos",
  stacked: "Photos",
  masonry: "Photos",
  text: "Text",
  video: "Video",
  "page-gallery": "Page Gallery",
};

const INPUT = "w-full border-b border-stone-200 pb-1.5 text-sm text-stone-800 outline-none focus:border-stone-500 transition-colors placeholder:text-stone-300 bg-transparent";

function PaintbrushIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    </svg>
  );
}

export default function BlockCard({
  block,
  dragHandleProps,
  onUpdate,
  onRemove,
  onAddPhotos,
  onRemovePhoto,
  pages,
}) {
  const isPhotoBlock = block.type === "photos" || block.type === "stacked" || block.type === "masonry";
  const dragPhotoIndex = useRef(null);
  const hasDesign = block.type === "photo" || isPhotoBlock || block.type === "text" || block.type === "video";

  const [expanded, setExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showDesign, setShowDesign] = useState(false);
  const menuRef = useRef(null);
  const designBtnRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    const url = e.dataTransfer.getData("text/plain");
    if (url && isPhotoBlock && !(block.imageUrls || []).includes(url)) {
      onUpdate({ ...block, imageUrls: [...(block.imageUrls || []), url] });
    }
  };

  return (
    <div
      className="bg-white border border-stone-200 rounded-lg shadow-sm group/card mb-1.5"
      onDragOver={isPhotoBlock ? handleDragOver : undefined}
      onDrop={isPhotoBlock ? handleDrop : undefined}
    >
      {/* Card header */}
      <div className="flex items-center gap-1.5 px-3 py-2.5">
        <span
          {...dragHandleProps}
          className="text-stone-300 cursor-grab hover:text-stone-500 text-sm leading-none select-none flex-shrink-0 transition-colors"
        >
          ⠿
        </span>

        <button
          className="text-xs font-semibold text-stone-600 tracking-wide flex-1 text-left hover:text-stone-900 transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          {TYPE_LABELS[block.type] || block.type}
        </button>

        {/* Hover-reveal actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
          {(block.type === "photo" || isPhotoBlock) && (
            <button
              onClick={onAddPhotos}
              title="Add photos"
              className="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors text-base leading-none"
            >
              +
            </button>
          )}

          {hasDesign && (
            <div className="relative">
              <button
                ref={designBtnRef}
                onClick={() => setShowDesign((v) => !v)}
                title="Design"
                className={`w-6 h-6 flex items-center justify-center transition-colors ${
                  showDesign ? "text-stone-800" : "text-stone-400 hover:text-stone-700"
                }`}
              >
                <PaintbrushIcon />
              </button>
              {showDesign && (
                <DesignPopover
                  block={block}
                  onUpdate={onUpdate}
                  onClose={() => setShowDesign(false)}
                  anchorEl={designBtnRef.current}
                />
              )}
            </div>
          )}

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors text-sm leading-none"
            >
              ⋯
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-stone-200 shadow-lg z-20 py-1 w-28">
                <button
                  onClick={() => { setShowMenu(false); onRemove(); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-stone-50 transition-colors whitespace-nowrap"
                >
                  Remove block
                </button>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-stone-300 hover:text-stone-500 transition-colors flex-shrink-0"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform ${expanded ? "" : "rotate-180"}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-stone-100 pt-3 space-y-2.5">

          {/* Single photo */}
          {block.type === "photo" && (
            <>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const url = e.dataTransfer.getData("text/plain");
                  if (url) onUpdate({ ...block, imageUrl: url });
                }}
              >
                {block.imageUrl ? (
                  <div className="relative group/img">
                    <img
                      src={`/_next/image?url=${encodeURIComponent(block.imageUrl)}&w=400&q=70`}
                      alt=""
                      className="w-full aspect-video object-cover"
                    />
                    <button
                      onClick={() => onUpdate({ ...block, imageUrl: "" })}
                      className="absolute top-1.5 right-1.5 bg-black/50 text-white text-[10px] px-2 py-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity"
                    >
                      × Remove
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={onAddPhotos}
                    className="flex flex-col items-center justify-center h-20 bg-stone-50 border border-dashed border-stone-200 hover:border-stone-400 cursor-pointer transition-colors gap-0.5"
                  >
                    <span className="text-xs text-stone-500">Drag a photo here</span>
                    <span className="text-xs text-stone-400">or <span className="underline underline-offset-2 hover:text-stone-700 transition-colors">select from library</span></span>
                  </div>
                )}
              </div>
              <input
                className={INPUT}
                placeholder="Caption"
                value={block.caption || ""}
                onChange={(e) => onUpdate({ ...block, caption: e.target.value })}
              />
            </>
          )}

          {/* Photos block (photos, stacked, or masonry — all treated as multi-photo) */}
          {isPhotoBlock && (
            <>
              {(block.imageUrls || []).length === 0 ? (
                <div
                  onClick={onAddPhotos}
                  className="flex flex-col items-center justify-center h-16 bg-stone-50 border border-dashed border-stone-200 hover:border-stone-400 cursor-pointer transition-colors gap-0.5"
                >
                  <span className="text-xs text-stone-500">Drag photos here</span>
                  <span className="text-xs text-stone-400">or <span className="underline underline-offset-2 hover:text-stone-700 transition-colors">select from library</span></span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-px bg-stone-200">
                  {(block.imageUrls || []).map((url, i) => (
                    <div
                      key={url}
                      draggable
                      onDragStart={(e) => {
                        dragPhotoIndex.current = i;
                        e.dataTransfer.effectAllowed = "move";
                        e.stopPropagation();
                      }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const from = dragPhotoIndex.current;
                        if (from === null || from === i) return;
                        const urls = [...(block.imageUrls || [])];
                        const [moved] = urls.splice(from, 1);
                        urls.splice(i, 0, moved);
                        dragPhotoIndex.current = null;
                        onUpdate({ ...block, imageUrls: urls });
                      }}
                      onDragEnd={() => { dragPhotoIndex.current = null; }}
                      className="relative group/thumb aspect-square bg-stone-100 overflow-hidden cursor-grab"
                    >
                      <img
                        src={`/_next/image?url=${encodeURIComponent(url)}&w=200&q=65`}
                        alt=""
                        className="w-full h-full object-cover pointer-events-none"
                        loading="lazy"
                      />
                      <button
                        onClick={() => onRemovePhoto(url)}
                        className="absolute top-0.5 right-0.5 bg-black/50 text-white text-[9px] px-1 py-0.5 opacity-0 group-hover/thumb:opacity-100 transition-opacity leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Text */}
          {block.type === "text" && (
            <textarea
              className={`${INPUT} resize-none`}
              placeholder="Write something…"
              rows={3}
              value={block.content || ""}
              onChange={(e) => onUpdate({ ...block, content: e.target.value })}
            />
          )}

          {/* Video */}
          {block.type === "video" && (
            <>
              <input
                className={INPUT}
                placeholder="YouTube URL"
                value={block.url || ""}
                onChange={(e) => onUpdate({ ...block, url: e.target.value })}
              />
              <input
                className={INPUT}
                placeholder="Caption"
                value={block.caption || ""}
                onChange={(e) => onUpdate({ ...block, caption: e.target.value })}
              />
            </>
          )}

          {/* Page Gallery */}
          {block.type === "page-gallery" && (
            <div className="space-y-1.5">
              {(!pages || pages.length === 0) ? (
                <p className="text-xs text-stone-400">No other pages yet.</p>
              ) : (
                pages.map(p => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(block.pageIds || []).includes(p.id)}
                      onChange={e => {
                        const pageIds = e.target.checked
                          ? [...(block.pageIds || []), p.id]
                          : (block.pageIds || []).filter(id => id !== p.id)
                        onUpdate({ ...block, pageIds })
                      }}
                      className="w-3 h-3 accent-stone-700 flex-shrink-0"
                    />
                    <span className="text-xs text-stone-700 truncate">{p.title}</span>
                  </label>
                ))
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run all tests**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest
```

Expected: all 22 tests pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add components/admin/gallery-builder/BlockCard.js
git commit -m "feat: add photos and page-gallery support to BlockCard"
```

---

## Task 4: Thread `pages` prop through BlockBuilder and GalleryPreview

**Files:**
- Modify: `components/admin/gallery-builder/BlockBuilder.js`
- Modify: `components/admin/gallery-builder/GalleryPreview.js`

- [ ] **Step 1: Add `pages` prop to BlockBuilder**

In `components/admin/gallery-builder/BlockBuilder.js`, find the function signature (line 52):

```js
export default function BlockBuilder({
  gallery,
  onChange,
  onPublish,
  publishing,
  autosaveStatus,
  hasDraft,
  isPublished,
  onAddPhotosToBlock,
  onPickThumbnail,
  expanded,
  onToggleExpand,
}) {
```

Replace with:

```js
export default function BlockBuilder({
  gallery,
  onChange,
  onPublish,
  publishing,
  autosaveStatus,
  hasDraft,
  isPublished,
  onAddPhotosToBlock,
  onPickThumbnail,
  expanded,
  onToggleExpand,
  pages,
}) {
```

- [ ] **Step 2: Pass `pages` to each BlockCard in BlockBuilder**

In `BlockBuilder.js`, find the `<BlockCard` JSX (around line 265):

```js
                          <BlockCard
                            block={block}
                            dragHandleProps={provided.dragHandleProps}
                            onUpdate={(updated) => updateBlock(index, updated)}
                            onRemove={() => removeBlock(index)}
                            onAddPhotos={() => onAddPhotosToBlock(index)}
                            onRemovePhoto={(url) => removePhotoFromBlock(index, url)}
                          />
```

Replace with:

```js
                          <BlockCard
                            block={block}
                            dragHandleProps={provided.dragHandleProps}
                            onUpdate={(updated) => updateBlock(index, updated)}
                            onRemove={() => removeBlock(index)}
                            onAddPhotos={() => onAddPhotosToBlock(index)}
                            onRemovePhoto={(url) => removePhotoFromBlock(index, url)}
                            pages={pages}
                          />
```

- [ ] **Step 3: Add `pages` prop to GalleryPreview**

Replace the entire `components/admin/gallery-builder/GalleryPreview.js`:

```js
import { useState, useEffect } from "react";
import Gallery from "../../image-displays/gallery/Gallery";

export default function GalleryPreview({ gallery, pages }) {
  const [debouncedGallery, setDebouncedGallery] = useState(gallery);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedGallery(gallery), 300);
    return () => clearTimeout(timer);
  }, [gallery]);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-white">
        {(debouncedGallery.blocks || []).length > 0 ? (
          <Gallery
            name={debouncedGallery.name}
            description={debouncedGallery.description}
            blocks={debouncedGallery.blocks}
            enableSlideshow={false}
            pages={pages}
            onBackClick={() => {}}
            onSlideshowClick={() => {}}
            onClientLoginClick={() => {}}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-300 text-sm">
            Add blocks to preview the gallery
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run all tests**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest
```

Expected: all 22 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add components/admin/gallery-builder/BlockBuilder.js components/admin/gallery-builder/GalleryPreview.js
git commit -m "feat: thread pages prop through BlockBuilder and GalleryPreview"
```

---

## Task 5: Update Gallery.js renderer

**Files:**
- Modify: `components/image-displays/gallery/Gallery.js`

Add a `pages` prop, a `photos` case (routes to stacked/masonry by layout), and a `page-gallery` case (thumbnail grid). Keep `stacked`/`masonry` cases as legacy fallbacks.

- [ ] **Step 1: Replace the entire file**

```js
import React from "react";
import GalleryCover from "./gallery-cover/GalleryCover";
import MasonryGallery from "./masonry-gallery/MasonryGallery";
import StackedGallery from "./stacked-gallery/StackedGallery";
import { useMediaQuery } from "react-responsive";
import WiggleLine from "components/wiggle-line/WiggleLine";
import VideoBlock from "./video-block/VideoBlock";
import PhotoBlock from "./photo-block/PhotoBlock";

const Gallery = ({ name, description, blocks, enableSlideshow, enableClientView, pages, onBackClick, onSlideshowClick, onClientLoginClick }) => {
  const isSmallScreen = useMediaQuery({ query: "(max-width: 768px)" });

  return (
    <div className="gallery-container">
      <GalleryCover name={name} description={description} enableSlideshow={enableSlideshow} enableClientView={enableClientView} onBackClick={onBackClick} onSlideshowClick={onSlideshowClick} onClientLoginClick={onClientLoginClick} />

      <div className="space-y-10">
        {blocks.map((block, index) => {
          switch (block.type) {
            case "photos": {
              const usemasonry = block.layout === "masonry" || isSmallScreen;
              return (
                <div key={`block-${index}`} className="photos-block">
                  {usemasonry
                    ? <MasonryGallery imageUrls={block.imageUrls || []} />
                    : <StackedGallery imageUrls={block.imageUrls || []} />}
                  <WiggleLine />
                </div>
              );
            }

            case "stacked":
              return (
                <div key={`block-${index}`} className="stacked-gallery-block">
                  {isSmallScreen ? <MasonryGallery imageUrls={block.imageUrls || []} /> : <StackedGallery imageUrls={block.imageUrls || []} />}
                  <WiggleLine />
                </div>
              );

            case "masonry":
              return (
                <div key={`block-${index}`} className="masonry-gallery-block">
                  <MasonryGallery imageUrls={block.imageUrls || []} />
                  <WiggleLine />
                </div>
              );

            case "text":
              return (
                <div key={`block-${index}`} className={`text-block text-center text-2xl md:text-4xl text-gray-800 max-w-3xl mx-auto py-10 ${block.variant === 2 ? "font-serif2" : ""}`}>
                  {block.content}
                </div>
              );

            case "photo":
              if (!block.imageUrl) return null;
              return (
                <div key={`block-${index}`} className="photo-block">
                  <PhotoBlock imageUrl={block.imageUrl} caption={block.caption} variant={block.variant || 1} />
                  <WiggleLine />
                </div>
              );

            case "video":
              return (
                <div key={`block-${index}`} className="video-block">
                  <VideoBlock url={block.url} caption={block.caption} variant={block.variant || 1} />
                  <WiggleLine />
                </div>
              );

            case "page-gallery": {
              const linkedPages = (block.pageIds || [])
                .map(id => (pages || []).find(p => p.id === id))
                .filter(Boolean);
              if (linkedPages.length === 0) return null;
              return (
                <div key={`block-${index}`} className="page-gallery-block px-8 py-4">
                  <div className="grid grid-cols-2 gap-6">
                    {linkedPages.map(p => (
                      <a key={p.id} href="#" className="block group">
                        {p.thumbnailUrl ? (
                          <img
                            src={p.thumbnailUrl}
                            alt={p.title}
                            className="w-full aspect-[4/3] object-cover"
                          />
                        ) : (
                          <div className="w-full aspect-[4/3] bg-gray-100 flex items-center justify-center text-gray-300 text-sm">
                            No thumbnail
                          </div>
                        )}
                        <div className="mt-2 text-sm text-gray-800 font-medium">{p.title}</div>
                      </a>
                    ))}
                  </div>
                </div>
              );
            }

            default:
              console.error(`Unsupported block type: ${block.type}`);
              return null;
          }
        })}
      </div>
    </div>
  );
};

export default Gallery;
```

- [ ] **Step 2: Run all tests**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest
```

Expected: all 22 tests pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add components/image-displays/gallery/Gallery.js
git commit -m "feat: add photos and page-gallery cases to Gallery renderer"
```

---

## Task 6: Fix BlockPageEditor — thumbnail adapter + pass pages

**Files:**
- Modify: `components/admin/platform/BlockPageEditor.js`

Two bugs to fix: `pageToGallery` hardcodes `thumbnailUrl: ''` (losing the page thumbnail), and `galleryToPage` doesn't write back `thumbnailUrl`. Also need to accept `siteConfig` and pass `pages` to BlockBuilder/GalleryPreview.

- [ ] **Step 1: Replace the entire file**

```js
// components/admin/platform/BlockPageEditor.js
import { useState, useCallback } from 'react'
import BlockBuilder from '../gallery-builder/BlockBuilder'
import GalleryPreview from '../gallery-builder/GalleryPreview'
import PhotoPickerModal from '../gallery-builder/PhotoPickerModal'

function pageToGallery(page) {
  return {
    name: page.title,
    description: '',
    blocks: page.blocks || [],
    thumbnailUrl: page.thumbnailUrl || '',
    enableSlideshow: false,
    showCover: false,
  }
}

function galleryToPage(page, gallery) {
  return {
    ...page,
    title: gallery.name || page.title,
    blocks: gallery.blocks || [],
    thumbnailUrl: gallery.thumbnailUrl || page.thumbnailUrl || '',
  }
}

export default function BlockPageEditor({ page, siteConfig, saveStatus, onPageChange }) {
  const [libraryImages, setLibraryImages] = useState(null)
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false)
  const [photoPickerBlockIndex, setPhotoPickerBlockIndex] = useState(null)
  const [expanded, setExpanded] = useState(false)

  const gallery = pageToGallery(page)
  const pages = siteConfig?.pages || []

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

  const handlePhotoPickerConfirm = useCallback((urls) => {
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
        pages={pages}
      />

      <GalleryPreview gallery={gallery} pages={pages} />

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

Expected: all 22 tests pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add components/admin/platform/BlockPageEditor.js
git commit -m "feat: fix thumbnail adapter and pass pages prop in BlockPageEditor"
```

---

## Task 7: Simplify PageEditor + delete GalleryPageEditor

**Files:**
- Modify: `components/admin/platform/PageEditor.js`
- Delete: `components/admin/platform/GalleryPageEditor.js`

- [ ] **Step 1: Replace PageEditor.js**

```js
// components/admin/platform/PageEditor.js
import BlockPageEditor from './BlockPageEditor'

export default function PageEditor({ page, siteConfig, saveStatus, onPageChange }) {
  if (!page) {
    return (
      <div className="flex items-center justify-center h-full text-gray-300 text-sm">
        Select a page to edit
      </div>
    )
  }

  return (
    <BlockPageEditor
      page={page}
      siteConfig={siteConfig}
      saveStatus={saveStatus}
      onPageChange={onPageChange}
    />
  )
}
```

- [ ] **Step 2: Delete GalleryPageEditor.js**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
rm components/admin/platform/GalleryPageEditor.js
```

- [ ] **Step 3: Run all tests**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest
```

Expected: all 22 tests pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add components/admin/platform/PageEditor.js
git rm components/admin/platform/GalleryPageEditor.js
git commit -m "feat: simplify PageEditor to always use BlockPageEditor, delete GalleryPageEditor"
```

---

## Task 8: Simplify PlatformSidebar

**Files:**
- Modify: `components/admin/platform/PlatformSidebar.js`

Remove `PAGE_TYPE_ICONS`, `PAGE_TYPE_LABELS`, `addingPage` state, and the type picker UI. "Add Page" now adds a page immediately with an inline rename.

- [ ] **Step 1: Replace the entire file**

```js
// components/admin/platform/PlatformSidebar.js
import { useState, useEffect, useRef } from 'react'

function SaveBadge({ status }) {
  if (status === 'saving') return <span className="text-xs text-gray-400">Saving…</span>
  if (status === 'saved') return <span className="text-xs text-green-500">Saved</span>
  if (status === 'error') return <span className="text-xs text-red-500">Save failed</span>
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

export default function PlatformSidebar({ siteConfig, saveStatus, onConfigChange, onSignOut, selectedPageId, onSelectPage }) {
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [menuOpenId, setMenuOpenId] = useState(null)
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

  if (!siteConfig) return null

  const { pages = [], siteName, publishedAt } = siteConfig

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
    if (!confirm('Delete this page? This cannot be undone.')) return
    onConfigChange(prev => ({
      ...prev,
      pages: prev.pages.filter(p => p.id !== pageId),
    }))
  }

  function handleAddPage() {
    const title = 'New Page'
    const baseId = 'new-page'

    onConfigChange(prev => {
      const existingIds = new Set(prev.pages.map(p => p.id))
      let id = baseId
      let n = 2
      while (existingIds.has(id)) { id = `${baseId}-${n++}` }
      const newPage = { id, title, showInNav: true, thumbnailUrl: '', blocks: [] }
      return { ...prev, pages: [...prev.pages, newPage] }
    })

    const existingIds = new Set(siteConfig.pages.map(p => p.id))
    let id = baseId
    let n = 2
    while (existingIds.has(id)) { id = `${baseId}-${n++}` }
    setRenamingId(id)
    setRenameValue(title)
  }

  function handlePublishToggle() {
    onConfigChange(prev => ({
      ...prev,
      publishedAt: prev.publishedAt ? null : new Date().toISOString(),
    }))
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 select-none">
      {/* Header */}
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
              <div
                onClick={() => onSelectPage?.(page.id)}
                className={`flex items-center px-3 py-1.5 rounded-md text-sm cursor-pointer group ${
                  selectedPageId === page.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="flex-1 truncate">{page.title}</span>
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === page.id ? null : page.id) }}
                  className={`ml-1 opacity-0 group-hover:opacity-100 px-1 ${selectedPageId === page.id ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  ···
                </button>
              </div>
            )}

            {menuOpenId === page.id && (
              <div ref={menuRef} className="absolute right-2 top-7 z-10 bg-white border border-gray-200 rounded-md shadow-md py-1 w-32">
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

        <button
          onClick={handleAddPage}
          className="flex items-center w-full px-3 py-1.5 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md mt-1"
        >
          <span className="mr-2">+</span> Add Page
        </button>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-3 flex-shrink-0 space-y-1">
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
        <div className="flex items-center px-3 py-1.5 text-sm text-gray-400 rounded-md">
          <span className="flex-1">Theme: Minimal Light</span>
        </div>
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

Expected: all 22 tests pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add components/admin/platform/PlatformSidebar.js
git commit -m "feat: simplify sidebar — remove page types, single Add Page action"
```

---

## Self-Review

**Spec coverage:**
- ✅ Page shape — no `type` field: Task 1 (`createDefaultSiteConfig`), Task 8 (sidebar `handleAddPage`)
- ✅ `photos` block type with `layout` field: Task 2 (`defaultBlock`), Task 3 (BlockCard body), Task 5 (Gallery renderer)
- ✅ Legacy `stacked`/`masonry` handled in renderer: Task 5 (kept as explicit cases)
- ✅ `page-gallery` block type: Task 2 (added to menu), Task 3 (checkbox editor), Task 5 (thumbnail grid renderer)
- ✅ `pages` prop threaded: Task 4 (BlockBuilder + GalleryPreview), Task 6 (BlockPageEditor passes it)
- ✅ `thumbnailUrl` preserved in adapters: Task 6 (`pageToGallery` + `galleryToPage` fixes)
- ✅ `PageEditor` always renders `BlockPageEditor`: Task 7
- ✅ `GalleryPageEditor` deleted: Task 7
- ✅ Sidebar simplified — no type picker, no type icons: Task 8
- ✅ Default page is `home` not `cover`: Task 1

**Placeholder scan:** None found. All steps contain complete code.

**Type consistency:** `pages` prop is `{ id, title, thumbnailUrl, showInNav, blocks }[]` — consistent across BlockBuilder (Task 4), GalleryPreview (Task 4), Gallery (Task 5), BlockPageEditor (Task 6), BlockCard (Task 3). `page-gallery` block shape `{ type: "page-gallery", pageIds: string[] }` is consistent across defaultBlock (Task 2), BlockCard (Task 3), Gallery (Task 5).
