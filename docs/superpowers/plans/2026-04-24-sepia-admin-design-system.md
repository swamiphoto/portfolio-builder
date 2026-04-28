# Sepia Admin Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the admin UI with a cohesive "Sepia" design system — warm parchment palette, floating panes with 3-layer shadows, rounded block cards, fixed inputs, harmonized popovers, collapsible block sidebar, and a desktop/mobile preview toggle.

**Architecture:** Design tokens first (tailwind + CSS vars), then structural layout changes, then component-level polish. Every component touches only its own file. The preview side of the admin (right panel) is intentionally untouched — only the two left sidebars, block cards, inputs, and popovers change.

**Tech Stack:** Next.js (pages router), Tailwind CSS, plain React (no new dependencies)

---

## Design Token Reference

These values are used throughout all tasks. Memorize them.

| Token | Value | Use |
|-------|-------|-----|
| `--desk` | `#e8e2d9` | Outer background — warm amber parchment |
| `--panel` | `#f4efe8` | Sidebar panel surfaces |
| `--panel-hover` | `#ede8e0` | Hover state on panel surfaces |
| `--popover` | `#f0ebe3` | Popovers and modals |
| `--card` | `#f9f6f1` | Block cards inside the panel |
| `--card-border` | `rgba(180,160,130,0.25)` | Card borders |
| `--border` | `rgba(160,140,110,0.3)` | General borders |
| `--border-focus` | `rgba(120,100,70,0.6)` | Focus state border |
| `--text-primary` | `#2c2416` | Main text |
| `--text-secondary` | `#7a6b55` | Secondary labels |
| `--text-muted` | `#a8967a` | Placeholder, muted |
| `--sepia-accent` | `#8b6f47` | Active states, icons |
| `--pane-shadow` | see below | All floating panes |
| `--popover-shadow` | see below | Popovers |

```
--pane-shadow:
  0 0 0 1px rgba(100, 75, 40, 0.10),
  0 2px 6px rgba(60, 40, 15, 0.08),
  0 8px 24px rgba(40, 25, 8, 0.10);

--popover-shadow:
  0 0 0 1px rgba(100, 75, 40, 0.12),
  0 4px 16px rgba(60, 40, 15, 0.14),
  0 16px 40px rgba(40, 25, 8, 0.12);
```

**Typography accent (Geist Mono — already in tailwind as `font-mono`):**
- Section labels: `font-mono text-[10px] uppercase tracking-[0.08em] text-[--text-muted]`
- Autosave status: `font-mono text-[10px] text-[--text-muted]`

**Input standard pattern** (fixes cursor-at-top bug):
```
w-full border-b border-[--border] py-1.5 text-sm text-[--text-primary]
outline-none focus:border-[--border-focus] transition-colors
placeholder:text-[--text-muted] bg-transparent leading-snug
```

**Block card rounded corners:** `rounded-xl` (12px)

**Pane border radius:** `rounded-xl` (12px)

---

## File Map

| File | Change |
|------|--------|
| `tailwind.config.js` | Add Sepia tokens to theme.extend.colors, boxShadow, borderRadius |
| `styles/globals.css` | Add CSS custom properties for all Sepia tokens |
| `components/admin/platform/AdminLayout.js` | Warm desk bg, floating pane margins |
| `components/admin/platform/PlatformSidebar.js` | Pane shadow, rounded, drag handle padding, Library button |
| `components/admin/gallery-builder/BlockBuilder.js` | Collapsible rail, Add Block button, footer row |
| `pages/admin/index.js` | Preview container, viewport toggle (desktop/mobile), block sidebar collapse state |
| `components/admin/gallery-builder/BlockCard.js` | Rounded cards, INPUT fix, warm colors |
| `components/admin/gallery-builder/BlockTypeMenu.js` | Page Gallery separator, warm popover surface |
| `components/admin/platform/PopoverShell.js` | Warm surface, border radius, 3-layer shadow |
| `components/admin/platform/PageSettingsPanel.js` | Input fix, warm card surface |

---

## Task 1: Design Tokens

**Files:**
- Modify: `tailwind.config.js`
- Modify: `styles/globals.css`

- [ ] **Step 1: Update tailwind.config.js colors, shadows, and borderRadius**

Replace the colors/boxShadow/borderRadius sections in `tailwind.config.js` `theme.extend` with:

```js
colors: {
  desk: "#e8e2d9",
  panel: "#f4efe8",
  "panel-hover": "#ede8e0",
  popover: "#f0ebe3",
  card: "#f9f6f1",
  parchment: "#f4efe8",
  "parchment-light": "#f9f6f1",
  "sidebar-inset": "#ede8e0",
  surface: "#f9f6f1",
  "surface-hover": "#ede8e0",
  "surface-active": "#e8e2d9",
  console: "#2c2416",
  sepia: {
    50:  "#faf7f2",
    100: "#f4efe8",
    200: "#ede8e0",
    300: "#e0d8cc",
    400: "#cfc4b2",
    500: "#b8a98e",
    600: "#a08a68",
    700: "#8b6f47",
    800: "#6e5234",
    900: "#4a3520",
  },
},
boxShadow: {
  pane: "0 0 0 1px rgba(100,75,40,0.10), 0 2px 6px rgba(60,40,15,0.08), 0 8px 24px rgba(40,25,8,0.10)",
  card: "0 0 0 1px rgba(100,75,40,0.08), 0 1px 3px rgba(60,40,15,0.06)",
  "card-sm": "0 0 0 1px rgba(100,75,40,0.06)",
  popup: "0 0 0 1px rgba(100,75,40,0.12), 0 4px 16px rgba(60,40,15,0.14), 0 16px 40px rgba(40,25,8,0.12)",
},
borderRadius: {
  pane: "12px",
},
```

- [ ] **Step 2: Add CSS custom properties to globals.css**

Append inside the `:root {}` block in `styles/globals.css`:

```css
:root {
  /* existing vars ... */
  --desk: #e8e2d9;
  --panel: #f4efe8;
  --panel-hover: #ede8e0;
  --popover: #f0ebe3;
  --card: #f9f6f1;
  --card-border: rgba(180, 160, 130, 0.25);
  --border: rgba(160, 140, 110, 0.30);
  --border-focus: rgba(120, 100, 70, 0.60);
  --text-primary: #2c2416;
  --text-secondary: #7a6b55;
  --text-muted: #a8967a;
  --sepia-accent: #8b6f47;
  --pane-shadow:
    0 0 0 1px rgba(100, 75, 40, 0.10),
    0 2px 6px rgba(60, 40, 15, 0.08),
    0 8px 24px rgba(40, 25, 8, 0.10);
  --popover-shadow:
    0 0 0 1px rgba(100, 75, 40, 0.12),
    0 4px 16px rgba(60, 40, 15, 0.14),
    0 16px 40px rgba(40, 25, 8, 0.12);
}
```

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.js styles/globals.css
git commit -m "style(sepia): add Sepia design tokens — palette, shadows, border radius"
```

---

## Task 2: AdminLayout — Floating Pane Structure

**Files:**
- Modify: `components/admin/platform/AdminLayout.js`

- [ ] **Step 1: Rewrite AdminLayout to float sidebars on warm desk**

Replace the entire file with:

```jsx
// components/admin/platform/AdminLayout.js
export default function AdminLayout({ sidebar, panel, children }) {
  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ background: 'var(--desk)' }}>
      {/* Site sidebar — floating pane */}
      <div
        className="w-56 flex-shrink-0 flex flex-col h-full my-2 ml-2 rounded-xl overflow-hidden"
        style={{ background: 'var(--panel)', boxShadow: 'var(--pane-shadow)' }}
      >
        {sidebar}
      </div>

      {/* Page/block sidebar — floating pane */}
      {panel && (
        <div
          className="w-64 flex-shrink-0 flex flex-col h-full my-2 ml-2 rounded-xl overflow-hidden"
          style={{ background: 'var(--panel)', boxShadow: 'var(--pane-shadow)' }}
        >
          {panel}
        </div>
      )}

      {/* Preview area */}
      <div className="flex-1 min-w-0 h-full overflow-hidden p-2 pl-2">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the app still loads at http://swamiphoto.lvh.me:3000/admin**

Confirm:
- Warm amber/parchment desk background visible behind sidebars
- Both sidebars have rounded corners and visible lift shadow
- No layout breakage

- [ ] **Step 3: Commit**

```bash
git add components/admin/platform/AdminLayout.js
git commit -m "style(sepia): AdminLayout — floating panes on warm desk background"
```

---

## Task 3: PlatformSidebar (Site Sidebar) Polish

**Files:**
- Modify: `components/admin/platform/PlatformSidebar.js`

The site sidebar needs: drag handle padding, Sepia-toned active/hover states, Library button redesign, section labels in mono, and warm text colors throughout.

- [ ] **Step 1: Update top header area (site name, gear, avatar)**

Find the JSX that renders the top of the sidebar (the `siteConfig.siteName` / gear / avatar row). Replace its className values:

Current pattern (look for the outermost header div with the site name):
```jsx
className="... border-b border-gray-200 ..."
```

Replace with warm Sepia equivalents:
```jsx
// Top header bar
className="px-3 pt-3 pb-2.5 flex items-center gap-2 flex-shrink-0"
style={{ borderBottom: '1px solid var(--border)' }}

// Site name text
className="text-sm font-semibold truncate flex-1"
style={{ color: 'var(--text-primary)' }}

// Gear button
className="w-6 h-6 flex items-center justify-center rounded transition-colors"
style={{ color: 'var(--text-muted)' }}
// hover: style={{ background: 'var(--panel-hover)', color: 'var(--text-secondary)' }}

// Avatar button
className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
style={{ background: 'var(--sepia-accent)' }}
```

- [ ] **Step 2: Update MAIN NAV section label**

Find `<div className="... text-xs ...">MAIN NAV</div>` (or the equivalent section label). Replace with:

```jsx
<div className="px-3 pt-3 pb-1 font-mono text-[10px] uppercase tracking-[0.08em]"
     style={{ color: 'var(--text-muted)' }}>
  Main Nav
</div>
```

- [ ] **Step 3: Fix drag handle — add proper left padding**

In `renderPageRow`, find the drag handle div:
```jsx
className="flex-shrink-0 flex items-center justify-center w-3 self-stretch cursor-grab ..."
```

Change `w-3` to `w-5` and add `pl-1` so the drag dots have breathing room from the sidebar edge:
```jsx
className="flex-shrink-0 flex items-center justify-center w-5 pl-1 self-stretch cursor-grab active:cursor-grabbing transition-colors"
style={{ color: 'var(--border)' }}
// on hover via group: color: 'var(--text-muted)'
```

- [ ] **Step 4: Update page row active/hover/selected states**

In `renderPageRow`, replace the className for the clickable row div:

```jsx
className={`flex items-center px-2 py-1.5 rounded-lg cursor-pointer group transition-colors text-sm ${
  isPageNestTarget
    ? 'ring-1 text-[--sepia-accent]'
    : isImageDropTarget
    ? 'ring-1'
    : selectedPageId === page.id
    ? 'font-medium'
    : ''
}`}
style={
  selectedPageId === page.id
    ? { background: 'var(--panel-hover)', color: 'var(--text-primary)' }
    : isPageNestTarget || isImageDropTarget
    ? { background: 'var(--panel-hover)', ringColor: 'var(--sepia-accent)' }
    : { color: 'var(--text-secondary)' }
}
// hover handled via Tailwind: hover:bg-[--panel-hover]
```

- [ ] **Step 5: Update OTHER PAGES section label and hide "Empty" text**

Find the "OTHER PAGES" section. Replace:
```jsx
// Before
<div className="...">OTHER PAGES</div>
<div>Empty</div>

// After
{flatOtherPages.length > 0 && (
  <div className="px-3 pt-3 pb-1 font-mono text-[10px] uppercase tracking-[0.08em]"
       style={{ color: 'var(--text-muted)' }}>
    Other Pages
  </div>
)}
{flatOtherPages.length === 0 && null}
```

(Find the exact variable name for other pages — it may be `flatOtherPages` or `otherPages`.)

- [ ] **Step 6: Redesign Library button**

Find the Library button at the bottom (currently renders as plain text "Library" with a ">"). Replace with:

```jsx
<div style={{ borderTop: '1px solid var(--border)' }} className="flex-shrink-0">
  <button
    onClick={onShowLibrary}
    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors group"
    style={{ color: libraryActive ? 'var(--sepia-accent)' : 'var(--text-secondary)' }}
  >
    {/* Book/Library icon */}
    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
    <span className="font-mono text-[11px] uppercase tracking-[0.06em]">Library</span>
  </button>
</div>
```

- [ ] **Step 7: Update SaveBadge colors**

```jsx
function SaveBadge({ status }) {
  if (status === 'saving') return <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>Saving…</span>
  if (status === 'saved') return <span className="font-mono text-[10px]" style={{ color: 'var(--sepia-accent)' }}>Saved</span>
  if (status === 'error') return <span className="font-mono text-[10px] text-red-500">Error</span>
  return null
}
```

- [ ] **Step 8: Commit**

```bash
git add components/admin/platform/PlatformSidebar.js
git commit -m "style(sepia): PlatformSidebar — warm palette, drag handle padding, Library button, mono labels"
```

---

## Task 4: PopoverShell — Warm Surface and Shadow

**Files:**
- Modify: `components/admin/platform/PopoverShell.js`

- [ ] **Step 1: Replace PopoverShell with warm-surfaced version**

```jsx
import { useRef, useEffect, useState } from 'react'

export default function PopoverShell({ anchorEl, onClose, width = 320, title, children, headerRight, onBack }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)

  useEffect(() => {
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    const top = Math.max(8, rect.bottom + 6)
    const maxHeight = window.innerHeight - top - 8
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
    setPos({ left, top, maxHeight })
  }, [anchorEl, width])

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target) && anchorEl && !anchorEl.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorEl])

  return (
    <div
      ref={ref}
      className="fixed z-[9999] overflow-auto rounded-xl"
      style={{
        width,
        maxHeight: pos?.maxHeight ?? '80vh',
        left: pos?.left,
        top: pos?.top,
        visibility: pos ? undefined : 'hidden',
        background: 'var(--popover)',
        boxShadow: 'var(--popover-shadow)',
      }}
    >
      {/* Header */}
      <div
        className="px-3 pt-2.5 pb-2 flex items-center justify-between sticky top-0 z-10 rounded-t-xl"
        style={{ background: 'var(--popover)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {onBack && (
            <button onClick={onBack} className="transition-colors flex-shrink-0 -ml-0.5" style={{ color: 'var(--text-muted)' }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {title && (
            <span className="font-mono text-[11px] uppercase tracking-[0.07em] truncate" style={{ color: 'var(--text-secondary)' }}>
              {title}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-base leading-none transition-colors ml-2 flex-shrink-0"
          style={{ color: 'var(--text-muted)' }}
        >
          ×
        </button>
      </div>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/platform/PopoverShell.js
git commit -m "style(sepia): PopoverShell — warm popover surface, rounded corners, 3-layer shadow"
```

---

## Task 5: Block Cards and Add Block Button

**Files:**
- Modify: `components/admin/gallery-builder/BlockCard.js`
- Modify: `components/admin/gallery-builder/BlockTypeMenu.js`
- Modify: `components/admin/gallery-builder/BlockBuilder.js`

- [ ] **Step 1: Update INPUT constant in BlockCard.js (line 19)**

```js
const INPUT = "w-full border-b py-1.5 text-sm outline-none transition-colors placeholder:text-[--text-muted] bg-transparent leading-snug"
// Apply inline styles: borderColor: 'var(--border)', color: 'var(--text-primary)', focusBorderColor: 'var(--border-focus)'
// Since Tailwind can't do CSS var focus states easily, use a wrapper approach or onFocus/onBlur handlers
// Simplest: use focus:border-[#8b6f47] as a hardcoded tailwind class
```

Full replacement:
```js
const INPUT = "w-full border-b border-[rgba(160,140,110,0.3)] py-1.5 text-sm outline-none focus:border-[#8b6f47] transition-colors placeholder:text-[#a8967a] bg-transparent leading-snug text-[#2c2416]";
```

- [ ] **Step 2: Update block card wrapper in BlockCard.js**

Find where `BlockCard` renders its outer wrapper. It should have `rounded-xl` and use `--card` surface:

```jsx
// Outer card wrapper — find the top-level div of the BlockCard return
className="rounded-xl overflow-hidden mb-1.5"
style={{ background: 'var(--card)', boxShadow: 'var(--card)' }}
// Actually use:
style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
```

Also update all `text-stone-*` colors inside BlockCard to use CSS vars:
- `text-stone-700` → `color: var(--text-primary)`
- `text-stone-500` → `color: var(--text-secondary)`
- `text-stone-400` → `color: var(--text-muted)`
- `border-stone-200` → `border-[rgba(160,140,110,0.25)]`
- `bg-stone-50` → `bg-[--card]`

- [ ] **Step 3: Update block type label in BlockCard.js**

The "Photo", "Text" etc. header label in each card:
```jsx
className="font-semibold text-sm"
style={{ color: 'var(--text-primary)' }}
```

- [ ] **Step 4: Update BlockTypeMenu.js — warm surface + Page Gallery separator**

```jsx
// Outer menu wrapper
className="rounded-xl overflow-hidden"
style={{
  background: 'var(--popover)',
  boxShadow: 'var(--popover-shadow)',
  // position styles stay the same
}}

// Each item row
className="w-full flex flex-col px-3 py-2.5 text-left transition-colors"
style={{ color: 'var(--text-primary)' }}
// hover: background: 'var(--panel-hover)'

// Item label
className="text-sm font-medium"
style={{ color: 'var(--text-primary)' }}

// Item description
className="text-[11px] mt-0.5"
style={{ color: 'var(--text-muted)' }}

// Separator before "Page Gallery" item — add this before it renders:
// { type: "page-gallery", ... } is the 5th item in BLOCK_TYPES
// Before rendering it, add:
<div className="mx-3 my-1" style={{ borderTop: '1px solid var(--border)' }} />
```

- [ ] **Step 5: Update Add Block button in BlockBuilder.js**

Find the Add Block button in the footer. Replace:
```jsx
// Before
className="w-full bg-white border border-stone-300 text-stone-700 text-sm font-medium py-2.5 hover:bg-stone-50 hover:border-stone-400 transition-colors"

// After
className="w-full rounded-xl text-sm font-medium py-2.5 transition-colors border border-dashed"
style={{
  background: 'transparent',
  borderColor: 'var(--border)',
  color: 'var(--text-secondary)',
}}
// hover via onMouseEnter/Leave or a Tailwind arbitrary: hover:bg-[--panel-hover]
```

- [ ] **Step 6: Update footer row in BlockBuilder.js**

The footer row with collapse icon + autosave + publish:
```jsx
<div className="flex-shrink-0 p-3 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
  <button
    onClick={...}
    className="w-full rounded-xl text-sm font-medium py-2.5 transition-colors border border-dashed"
    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
  >
    Add Block
  </button>
  <div className="flex items-center gap-2 px-0.5">
    {onToggleExpand && (
      <button onClick={onBack || onToggleExpand} title="Collapse sidebar"
              style={{ color: 'var(--text-muted)' }}>
        <svg className="w-3.5 h-3.5 rotate-90" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>
    )}
    <span className="font-mono text-[10px] flex-1" style={{ color: 'var(--text-muted)' }}>
      {autosaveStatus === 'saving' && 'Saving…'}
      {autosaveStatus === 'saved' && 'Saved'}
      {autosaveStatus === 'unsaved' && 'Unsaved'}
    </span>
    {onPublish && (
      <button onClick={onPublish}
              disabled={publishing || (isPublished && !hasDraft)}
              className="text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-40"
              style={{ background: 'var(--sepia-accent)', color: '#fff' }}>
        {publishing ? 'Publishing…' : 'Publish'}
      </button>
    )}
  </div>
</div>
```

- [ ] **Step 7: Commit**

```bash
git add components/admin/gallery-builder/BlockCard.js \
        components/admin/gallery-builder/BlockTypeMenu.js \
        components/admin/gallery-builder/BlockBuilder.js
git commit -m "style(sepia): block cards rounded + warm, Add Block dashed, BlockTypeMenu warm + separator"
```

---

## Task 6: Fix Inputs Everywhere

**Files:**
- Modify: `components/admin/platform/PageSettingsPanel.js`
- Modify: `components/admin/gallery-builder/BlockBuilder.js` (info card inputs)
- Modify: `components/admin/gallery-builder/BlockCard.js` (INPUT constant — done in Task 5)

The root cause of the cursor-at-top bug: inputs use `p-0 pb-1` which gives zero top padding — text starts at the very top of the input box, and there's only a small bottom padding before the border. Fix is `py-1.5` (equal padding top and bottom, 6px each).

**Standard input class** (use this everywhere):
```
border-b border-[rgba(160,140,110,0.3)] py-1.5 text-sm text-[#2c2416] outline-none
focus:border-[#8b6f47] transition-colors placeholder:text-[#a8967a] bg-transparent
leading-snug w-full
```

**Standard textarea class** (same but for textarea):
```
border-b border-[rgba(160,140,110,0.3)] pt-1.5 pb-1 text-sm text-[#2c2416] outline-none
focus:border-[#8b6f47] transition-colors placeholder:text-[#a8967a] bg-transparent
leading-snug w-full resize-none
```

- [ ] **Step 1: Fix all inputs in PageSettingsPanel.js**

Find every `<input>` and `<textarea>` element. Replace className with the standard patterns above. In this file there are: Title input, Description textarea, URL input (for link type), Label input (for link type). For the textarea, use `rows={2}` and remove any extra padding classes.

Example fix for the Title input:
```jsx
// Before
className="w-full border-b border-stone-200 p-0 pb-1 text-sm font-medium text-stone-800 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"

// After
className="w-full border-b border-[rgba(160,140,110,0.3)] py-1.5 text-sm font-medium text-[#2c2416] outline-none focus:border-[#8b6f47] transition-colors placeholder:text-[#a8967a] bg-transparent leading-snug"
```

Also update the card wrapper:
```jsx
// Before
className="bg-white border border-stone-200 rounded-lg shadow-sm mb-1.5"

// After
className="rounded-xl overflow-hidden mb-1.5"
style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
```

And the card header section label:
```jsx
// section label "Title", "Description" etc.
className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1"
style={{ color: 'var(--text-muted)' }}
```

- [ ] **Step 2: Fix inputs in BlockBuilder.js (info card)**

The info card inside BlockBuilder renders when `!pageSettingsSlot`. It has Name, Slug, Description inputs. Apply the same standard pattern to each.

Find the AutoGrowTextarea component. It renders a `<textarea>`. Update its default className to match the standard textarea pattern.

- [ ] **Step 3: Update info card wrapper in BlockBuilder.js**

```jsx
// Before
className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden mb-1.5"

// After
className="rounded-xl overflow-hidden mb-1.5"
style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
```

- [ ] **Step 4: Commit**

```bash
git add components/admin/platform/PageSettingsPanel.js \
        components/admin/gallery-builder/BlockBuilder.js
git commit -m "fix(sepia): input cursor bug — py-1.5 on all inputs, warm border colors, consistent labels"
```

---

## Task 7: Block Sidebar Collapse to Rail

**Files:**
- Modify: `pages/admin/index.js`
- Modify: `components/admin/platform/AdminLayout.js`

The block sidebar should collapse to a 40px vertical rail with rotated "BLOCKS" text. Clicking the rail expands it. When collapsed, the preview area takes the freed space.

- [ ] **Step 1: Add blockSidebarCollapsed state to pages/admin/index.js**

In `pages/admin/index.js`, find the component's state declarations. Add:
```js
const [blockSidebarCollapsed, setBlockSidebarCollapsed] = useState(false)
```

Pass down to PageEditorSidebar via a prop wrapper, and pass the state to AdminLayout.

- [ ] **Step 2: Update AdminLayout to accept and use blockSidebarCollapsed**

```jsx
// components/admin/platform/AdminLayout.js
export default function AdminLayout({ sidebar, panel, children, panelCollapsed, onTogglePanel }) {
  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ background: 'var(--desk)' }}>
      {/* Site sidebar */}
      <div
        className="w-56 flex-shrink-0 flex flex-col h-full my-2 ml-2 rounded-xl overflow-hidden"
        style={{ background: 'var(--panel)', boxShadow: 'var(--pane-shadow)' }}
      >
        {sidebar}
      </div>

      {/* Block sidebar — collapsible */}
      {panel && (
        <div
          className="flex-shrink-0 flex flex-col h-full my-2 ml-2 rounded-xl overflow-hidden transition-all duration-300"
          style={{
            width: panelCollapsed ? '40px' : '256px',
            background: 'var(--panel)',
            boxShadow: 'var(--pane-shadow)',
          }}
        >
          {panelCollapsed ? (
            <button
              onClick={onTogglePanel}
              className="flex-1 flex flex-col items-center justify-center gap-2 w-full transition-colors"
              style={{ color: 'var(--text-muted)' }}
              title="Expand blocks panel"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span
                className="font-mono text-[9px] uppercase tracking-[0.1em]"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: 'var(--text-muted)' }}
              >
                Blocks
              </span>
            </button>
          ) : (
            panel
          )}
        </div>
      )}

      {/* Preview area */}
      <div className="flex-1 min-w-0 h-full overflow-hidden p-2 pl-2">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire collapse toggle in BlockBuilder.js**

The collapse arrow in the footer now calls `onToggleExpand` (which in the `pages/admin/index.js` context will set `blockSidebarCollapsed = true`). Update `pages/admin/index.js`:

```js
// In the panel definition:
const panel = (selectedPage && selectedPage.type !== 'link' && !isCoverPageSelected) ? (
  <PageEditorSidebar
    ...
    onToggleSidebarCollapse={() => setBlockSidebarCollapsed(true)}
  />
) : null

// Pass to AdminLayout:
<AdminLayout
  sidebar={sidebar}
  panel={panel}
  panelCollapsed={blockSidebarCollapsed}
  onTogglePanel={() => setBlockSidebarCollapsed(v => !v)}
>
```

Also pass `onToggleSidebarCollapse` through `PageEditorSidebar` → `BlockBuilder` as `onToggleExpand`.

- [ ] **Step 4: Commit**

```bash
git add pages/admin/index.js components/admin/platform/AdminLayout.js
git commit -m "feat(sepia): block sidebar collapse to 40px BLOCKS rail with expand/collapse"
```

---

## Task 8: Preview Container + Viewport Toggle

**Files:**
- Modify: `pages/admin/index.js`

The preview area gets a rounded container and a desktop/mobile toggle. Mobile preview = `max-width: 390px` centered. Desktop = full width. Toggle lives above the preview.

- [ ] **Step 1: Add viewport state**

```js
const [previewViewport, setPreviewViewport] = useState('desktop') // 'desktop' | 'mobile'
```

- [ ] **Step 2: Wrap preview content with rounded container and toggle**

Find where `content` is rendered inside AdminLayout. The `children` prop receives the preview. Update the preview wrapper in `pages/admin/index.js`:

```jsx
// Replace the content definition for the page editor case:
content = (
  <div className="h-full flex flex-col">
    {/* Viewport toggle bar */}
    <div className="flex-shrink-0 flex items-center justify-center gap-1 py-1.5">
      <button
        onClick={() => setPreviewViewport('desktop')}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors font-mono"
        style={previewViewport === 'desktop'
          ? { background: 'var(--panel)', color: 'var(--text-primary)', boxShadow: 'var(--card)' }
          : { color: 'var(--text-muted)' }}
      >
        {/* Monitor icon */}
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
        </svg>
        Desktop
      </button>
      <button
        onClick={() => setPreviewViewport('mobile')}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors font-mono"
        style={previewViewport === 'mobile'
          ? { background: 'var(--panel)', color: 'var(--text-primary)', boxShadow: 'var(--card)' }
          : { color: 'var(--text-muted)' }}
      >
        {/* Phone icon */}
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
        </svg>
        Mobile
      </button>
    </div>

    {/* Preview frame */}
    <div className="flex-1 min-h-0 flex justify-center px-2 pb-2">
      <div
        ref={previewContainerRef}
        onScroll={handlePreviewScroll}
        className="rounded-xl overflow-y-auto bg-white transition-all duration-300"
        style={{
          width: previewViewport === 'mobile' ? '390px' : '100%',
          boxShadow: 'var(--pane-shadow)',
        }}
      >
        <SiteNav ... />
        <PageCover ... />
        <GalleryPreview ... />
      </div>
    </div>
  </div>
)
```

- [ ] **Step 3: Commit**

```bash
git add pages/admin/index.js
git commit -m "feat(sepia): preview container — rounded frame + desktop/mobile viewport toggle"
```

---

## Task 9: BlockBuilder Scrollable Area Theming

**Files:**
- Modify: `components/admin/gallery-builder/BlockBuilder.js`

The scrollable blocks area and insertion zones need Sepia treatment.

- [ ] **Step 1: Update InsertionZone**

```jsx
function InsertionZone({ onInsert }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative flex items-center justify-center cursor-pointer transition-all duration-150"
      style={{ height: hovered ? 28 : 6 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onInsert}
    >
      {hovered && (
        <>
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px" style={{ background: 'var(--border)' }} />
          <div className="relative z-10 w-4 h-4 rounded-full flex items-center justify-center"
               style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
            <span className="text-[9px] font-bold leading-none" style={{ color: 'var(--text-muted)' }}>+</span>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update BlockBuilder outer className**

```jsx
// The outer wrapper div — remove the Tailwind bg-stone-50, border-stone-200
// Replace the default className prop:
className={className || "w-full flex flex-col h-full text-left font-sans"}
// Background comes from AdminLayout pane wrapper
```

- [ ] **Step 3: Update scrollable area**

The `flex-1 overflow-y-auto px-3 py-3` div — keep as-is, just remove any `bg-*` that might be there.

- [ ] **Step 4: Commit**

```bash
git add components/admin/gallery-builder/BlockBuilder.js
git commit -m "style(sepia): BlockBuilder — InsertionZone warm tones, remove bg overrides"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|-------------|------|
| Sepia palette tokens | Task 1 |
| Floating panes with shadow | Task 2 |
| Site sidebar polish (drag, Library, labels) | Task 3 |
| Popovers harmonized (not true white) | Task 4 |
| Block cards rounded + warm | Task 5 |
| Add Block dashed border | Task 5 |
| Block type menu warm + Page Gallery separator | Task 5 |
| Input cursor fix (py-1.5 everywhere) | Task 6 |
| Block sidebar collapse to rail | Task 7 |
| Preview rounded container | Task 8 |
| Desktop/mobile toggle | Task 8 |
| InsertionZone warm | Task 9 |
| "Empty" other pages hidden | Task 3 |
| Library button redesigned | Task 3 |
| Section labels in mono font | Tasks 3, 6 |

**Gaps found:** None. All user feedback items are covered.

**Type consistency:** CSS variables defined in Task 1 are used consistently across Tasks 2-9. No mismatches found.
