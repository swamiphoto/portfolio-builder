# In-article Image Controls Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the in-article image controls onto the image (⋯ menu + brush), make the editor live-render layout/size, and drive the caption from the library (not a typed box).

**Architecture:** The editor image node gets real per-layout/size inline styling so the contentEditable surface previews the arrangement; the control overlay then sits on the (now correctly sized) image. The caption becomes library-driven: dropped from the markdown directive, resolved by URL from `assetsByUrl` in the public renderer and from a `captionByUrl` map in the editor.

**Tech Stack:** React, plain-DOM contentEditable bridge, Jest.

**Spec:** `docs/superpowers/specs/2026-09-18-markdown-image-controls-redesign.md`

## Global Constraints

- Run tests with `node_modules/.bin/jest <file>` (NOT npx). Ignore the ~27 pre-existing AWS-SDK/node-20 suite-load failures — only touched suites matter.
- Layout ids: `centered` (default) | `full-bleed` | `side`. Size ids: `l` (default) | `m` | `s`. Caption style ids from `common/captionStyles.js` (`sans`/`serif`/`mono`/`accent`).
- The markdown directive no longer carries caption text: serialize `![](url){layout=… size=… style=…}` (empty alt). Backward compatible — a bare `![](url)` and a legacy `![typed](url){…}` still parse (the typed alt is ignored for display and dropped on next save).
- `side` floats LEFT only (matches the public renderer). Editor styling uses inline CSS (contentEditable surface, not Tailwind).
- No injection surface: all editor DOM built via `document.createElement`/`createTextNode` (never innerHTML).

---

### Task 1: editor layout/size styling helper (`common/markdownImageOptions.js`)

**Files:**
- Modify: `common/markdownImageOptions.js`
- Test: `__tests__/common/markdownImageOptions.test.js` (create if absent)

**Interfaces:**
- Produces: `imageEditorStyle({ layout, size }) → { display, float, width, margin }` — the inline styles the editor wrapper uses so the contentEditable surface previews layout+size. Invalid values fall back to defaults.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/markdownImageOptions.test.js
import { imageEditorStyle } from '../../common/markdownImageOptions'

describe('imageEditorStyle', () => {
  it('centered: sized, not floated, auto-centered', () => {
    expect(imageEditorStyle({ layout: 'centered', size: 'm' })).toMatchObject({ float: 'none', width: '66%', margin: '0.6em auto' })
    expect(imageEditorStyle({ layout: 'centered', size: 'l' }).width).toBe('100%')
    expect(imageEditorStyle({ layout: 'centered', size: 's' }).width).toBe('40%')
  })
  it('full-bleed: full width, ignores size', () => {
    expect(imageEditorStyle({ layout: 'full-bleed', size: 's' })).toMatchObject({ float: 'none', width: '100%' })
  })
  it('side: floats left at the size width', () => {
    expect(imageEditorStyle({ layout: 'side', size: 'm' })).toMatchObject({ float: 'left', width: '40%' })
  })
  it('defaults to centered/l on invalid input', () => {
    expect(imageEditorStyle({ layout: 'x', size: 'y' })).toMatchObject({ float: 'none', width: '100%' })
  })
})
```

- [ ] **Step 2: Run — verify fail.** `node_modules/.bin/jest __tests__/common/markdownImageOptions.test.js` → FAIL (`imageEditorStyle` undefined).

- [ ] **Step 3: Implement** — append to `common/markdownImageOptions.js`:

```js
const CENTERED_WIDTH = { l: '100%', m: '66%', s: '40%' }
const SIDE_WIDTH = { l: '50%', m: '40%', s: '33%' }

// Inline styles for the editor image wrapper so the contentEditable surface
// previews the chosen layout + size. side floats left so following paragraphs
// wrap beside it; full-bleed ignores size.
export function imageEditorStyle({ layout, size } = {}) {
  const lay = LAYOUT_OPTIONS.some((o) => o.id === layout) ? layout : DEFAULT_IMAGE_LAYOUT
  const sz = SIZE_OPTIONS.some((o) => o.id === size) ? size : DEFAULT_IMAGE_SIZE
  if (lay === 'full-bleed') return { display: 'block', float: 'none', width: '100%', margin: '0.6em 0' }
  if (lay === 'side') return { display: 'block', float: 'left', width: SIDE_WIDTH[sz], margin: '0.3em 1em 0.5em 0' }
  return { display: 'block', float: 'none', width: CENTERED_WIDTH[sz], margin: '0.6em auto' }
}
```

- [ ] **Step 4: Run — verify pass.**
- [ ] **Step 5: Commit.** `git add common/markdownImageOptions.js __tests__/common/markdownImageOptions.test.js && git commit -m "feat(markdown): editor layout/size style helper"`

---

### Task 2: image node renders layout/size + library caption; drop typed caption (`common/markdownDom.js`)

**Files:**
- Modify: `common/markdownDom.js`
- Test: `__tests__/common/markdownDom.test.js` (exists — update the image cases)

**Interfaces:**
- Consumes: `imageEditorStyle` (Task 1), `captionStyleCss` (`common/captionStyles.js`), `formatImageAttrs` (existing).
- Produces:
  - `createImageBlockNode(doc, url, attrs = {}, caption = '')` — **new arg order** (caption last, and it's the *library* caption to preview). Applies `imageEditorStyle(attrs)` to the wrapper; renders the caption as a non-editable `<div data-md-caption>` beneath the `<img>` styled with `captionStyleCss(attrs.style)`; stores `data-layout/size/style`. Does NOT set the img `alt`.
  - `getImageAttrs(wrapper) → { layout?, size?, style? }` (no `caption`).
  - `setImageAttr(wrapper, key, value)` — for `layout`/`size`, re-apply `imageEditorStyle`; for `style`, restyle the caption element. No `caption` branch.
  - `renderMarkdownToElement(md, doc, captionByUrl = {})` — passes `captionByUrl[url]` as the caption of each image node.
  - Serialize a wrapper to `![](url){…}` (empty alt).

- [ ] **Step 1: Write the failing test** (replace the image cases in `__tests__/common/markdownDom.test.js`)

```js
import { createImageBlockNode, getImageAttrs, setImageAttr, serializeDomToMarkdown, renderMarkdownToElement } from '../../common/markdownDom'

describe('image wrapper — editor styling + library caption', () => {
  it('applies layout/size inline styles and previews the library caption', () => {
    const w = createImageBlockNode(document, 'http://x/c.jpg', { layout: 'side', size: 'm', style: 'serif' }, 'A cat')
    expect(w.style.float).toBe('left')
    expect(w.style.width).toBe('40%')
    expect(getImageAttrs(w)).toEqual({ layout: 'side', size: 'm', style: 'serif' })
    const cap = w.querySelector('[data-md-caption]')
    expect(cap).toBeTruthy()
    expect(cap.textContent).toBe('A cat')
  })
  it('serializes to ![](url){…} with no caption text', () => {
    const root = document.createElement('div')
    root.appendChild(createImageBlockNode(document, 'http://x/c.jpg', { layout: 'side', size: 'm' }, 'A cat'))
    expect(serializeDomToMarkdown(root)).toBe('![](http://x/c.jpg){layout=side size=m}')
  })
  it('setImageAttr re-applies layout styling', () => {
    const w = createImageBlockNode(document, 'http://x/c.jpg', { layout: 'centered', size: 'l' }, '')
    expect(w.style.float).toBe('none')
    setImageAttr(w, 'layout', 'side')
    expect(w.style.float).toBe('left')
  })
  it('renderMarkdownToElement supplies captions from captionByUrl', () => {
    const el = renderMarkdownToElement('![](http://x/c.jpg){layout=centered}', document, { 'http://x/c.jpg': 'From library' })
    expect(el.querySelector('[data-md-caption]').textContent).toBe('From library')
  })
  it('a bare image still round-trips', () => {
    const root = document.createElement('div')
    root.appendChild(createImageBlockNode(document, 'http://x/c.jpg', {}, ''))
    expect(serializeDomToMarkdown(root)).toBe('![](http://x/c.jpg)')
  })
})
```

- [ ] **Step 2: Run — verify fail.** `node_modules/.bin/jest __tests__/common/markdownDom.test.js` → FAIL.

- [ ] **Step 3: Implement** in `common/markdownDom.js`:
  - Add imports: `import { imageEditorStyle } from './markdownImageOptions'` and `import { captionStyleCss } from './captionStyles'`.
  - Replace `createImageBlockNode`:

```js
export function createImageBlockNode(doc, url, attrs = {}, caption = '') {
  const wrap = doc.createElement('div')
  wrap.setAttribute(IMAGE_WRAPPER_ATTR, '1')
  wrap.setAttribute('contenteditable', 'false')
  Object.assign(wrap.style, imageEditorStyle(attrs))
  for (const k of IMAGE_ATTR_KEYS) if (attrs[k]) wrap.setAttribute(`data-${k}`, attrs[k])
  const img = doc.createElement('img')
  img.setAttribute('src', url || '')
  img.style.display = 'block'
  img.style.width = '100%'
  img.style.height = 'auto'
  img.style.borderRadius = '6px'
  wrap.appendChild(img)
  applyCaption(doc, wrap, caption, attrs.style)
  return wrap
}

// Render/refresh the library-caption preview beneath the image (non-editable).
function applyCaption(doc, wrap, caption, style) {
  let cap = wrap.querySelector('[data-md-caption]')
  if (!caption) { if (cap) cap.remove(); return }
  if (!cap) {
    cap = doc.createElement('div')
    cap.setAttribute('data-md-caption', '1')
    cap.setAttribute('contenteditable', 'false')
    wrap.appendChild(cap)
  }
  cap.textContent = caption
  Object.assign(cap.style, { marginTop: '6px', fontSize: '13px', opacity: '0.6' }, captionStyleCss(style))
}
```

  - `getImageAttrs`: drop the caption line — return only the data-attr keys:

```js
export function getImageAttrs(wrapper) {
  const out = {}
  for (const k of IMAGE_ATTR_KEYS) { const v = wrapper.getAttribute(`data-${k}`); if (v) out[k] = v }
  return out
}
```

  - `setImageAttr`: no caption branch; re-apply styling:

```js
export function setImageAttr(wrapper, key, value) {
  if (value) wrapper.setAttribute(`data-${key}`, value)
  else wrapper.removeAttribute(`data-${key}`)
  if (key === 'layout' || key === 'size') Object.assign(wrapper.style, imageEditorStyle(getImageAttrs(wrapper)))
  if (key === 'style') {
    const cap = wrapper.querySelector('[data-md-caption]')
    if (cap) Object.assign(cap.style, captionStyleCss(value))
  }
}
```

  - `blockElementToMarkdown` wrapper branch → empty alt:

```js
  if (el.hasAttribute(IMAGE_WRAPPER_ATTR)) {
    const attrs = getImageAttrs(el)
    const img = el.querySelector('img')
    const suffix = formatImageAttrs(attrs)
    return `![](${img ? img.getAttribute('src') || '' : ''})${suffix ? `{${suffix}}` : ''}`
  }
```

  - `renderMarkdownToElement(md, doc, captionByUrl = {})` image case:

```js
      case 'image':
        container.appendChild(createImageBlockNode(d, block.url, { layout: block.layout, size: block.size, style: block.style }, captionByUrl[block.url] || ''))
        break
```
    (add `captionByUrl = {}` to the function signature).

- [ ] **Step 4: Run — verify pass.** (Fix any other pre-existing markdownDom test that asserted the old caption-in-alt behavior — update them to the new no-typed-caption shape.)
- [ ] **Step 5: Commit.** `git add common/markdownDom.js __tests__/common/markdownDom.test.js && git commit -m "feat(markdown): editor image node previews layout/size + library caption; drop typed caption"`

---

### Task 3: public renderer resolves caption from the library (`components/image-displays/MarkdownText.js`)

**Files:**
- Modify: `components/image-displays/MarkdownText.js`
- Modify: the markdown-block call sites — find them: `grep -rn "MarkdownText" components/` (Gallery.js and the theme columns `FlorenceColumn.js`, `AmsterdamColumn.js`, plus `PageCover.js` uses `InlineMarkdown`, ignore that) — pass `assetsByUrl`.
- Test: `__tests__/components/MarkdownText.test.js` (exists — update)

**Interfaces:**
- Consumes: `assetsByUrl` (a `{ url: { caption } }` map, already built in `Gallery.js` for photo blocks).
- Produces: `MarkdownText({ content, variantClasses, assetsByUrl })` — image caption comes from `assetsByUrl[url]?.caption`, not the markdown alt.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/components/MarkdownText.test.js — image cases
import { render } from '@testing-library/react'
import MarkdownText from '../../components/image-displays/MarkdownText'

it('renders the library caption for an image (from assetsByUrl)', () => {
  const { container } = render(<MarkdownText content={'![](http://x/c.jpg){style=serif}'} assetsByUrl={{ 'http://x/c.jpg': { caption: 'Library cap' } }} />)
  const cap = container.querySelector('figcaption')
  expect(cap).toHaveTextContent('Library cap')
})
it('renders no caption when the asset has none', () => {
  const { container } = render(<MarkdownText content={'![](http://x/c.jpg)'} assetsByUrl={{}} />)
  expect(container.querySelector('figcaption')).toBeNull()
})
it('side layout still floats (unchanged)', () => {
  const { container } = render(<MarkdownText content={'![](http://x/c.jpg){layout=side size=m}'} assetsByUrl={{}} />)
  expect(container.querySelector('figure').className).toMatch(/float-left/)
})
```
  (Keep the existing heading/quote/security tests intact — only the image cases change.)

- [ ] **Step 2: Run — verify fail.**

- [ ] **Step 3: Implement** — in `MarkdownText.js`, add `assetsByUrl` to the props and the image branch:

```js
export default function MarkdownText({ content, variantClasses, assetsByUrl }) {
  // ...
        if (b.type === 'image') {
          const { figureClass, imgClass } = imageFigureClasses(b)
          const caption = assetsByUrl?.[b.url]?.caption || ''
          return (
            <figure key={i} className={figureClass}>
              <img src={b.url} alt={caption} className={imgClass} loading="lazy" />
              {caption ? <figcaption className="mt-2 text-sm opacity-60" style={captionStyleCss(b.style)}>{caption}</figcaption> : null}
            </figure>
          )
        }
```

  Then update the call sites to pass `assetsByUrl`. In `Gallery.js` find the `<MarkdownText` render for `block.format === 'markdown'` and add `assetsByUrl={assetsByUrl}` (it's in scope there). Do the same in `FlorenceColumn.js`/`AmsterdamColumn.js` if they have `assetsByUrl` in scope; if not, leave them (caption just won't show) and note it in the report.

- [ ] **Step 4: Run — verify pass.**
- [ ] **Step 5: Commit.** `git add components/image-displays/MarkdownText.js components/image-displays/gallery/Gallery.js __tests__/components/MarkdownText.test.js && git commit -m "feat(markdown): resolve in-article image caption from the library"`

---

### Task 4: controls = ⋯ menu + brush, no caption input (`components/admin/gallery-builder/MarkdownImageControls.js`)

**Files:**
- Modify: `components/admin/gallery-builder/MarkdownImageControls.js`
- Test: `__tests__/components/MarkdownImageControls.test.js` (exists — update)

**Interfaces:**
- Consumes: `LAYOUT_OPTIONS`/`SIZE_OPTIONS`/`CAPTION_STYLE_OPTIONS`, `PillToggle`/`DesignSection`.
- Produces: `MarkdownImageControls({ attrs, onAttr, onRemove, onMove })` — **`onCaption` prop removed**. Renders a top-right cluster: a **⋯** button opening a small menu (Move up / Move down / Remove) and a **brush** button opening the Layout/Size/Caption-style popover. No caption input.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/components/MarkdownImageControls.test.js
import { render, screen, fireEvent } from '@testing-library/react'
import MarkdownImageControls from '../../components/admin/gallery-builder/MarkdownImageControls'
const base = { attrs: { layout: 'centered', size: 'l', style: 'sans' } }

it('no caption input exists', () => {
  render(<MarkdownImageControls {...base} onAttr={()=>{}} onRemove={()=>{}} onMove={()=>{}} />)
  expect(screen.queryByPlaceholderText(/caption/i)).toBeNull()
})
it('the ⋯ menu fires move and remove', () => {
  const onMove = jest.fn(), onRemove = jest.fn()
  render(<MarkdownImageControls {...base} onAttr={()=>{}} onRemove={onRemove} onMove={onMove} />)
  fireEvent.click(screen.getByRole('button', { name: /more|menu|options/i }))
  fireEvent.click(screen.getByRole('button', { name: /move up/i })); expect(onMove).toHaveBeenCalledWith(-1)
  fireEvent.click(screen.getByRole('button', { name: /remove/i })); expect(onRemove).toHaveBeenCalled()
})
it('the brush opens layout options and picking Side fires onAttr', () => {
  const onAttr = jest.fn()
  render(<MarkdownImageControls {...base} onAttr={onAttr} onRemove={()=>{}} onMove={()=>{}} />)
  fireEvent.click(screen.getByRole('button', { name: /design|brush/i }))
  fireEvent.click(screen.getByText('Side'))
  expect(onAttr).toHaveBeenCalledWith('layout', 'side')
})
```

- [ ] **Step 2: Run — verify fail.**

- [ ] **Step 3: Implement** — rewrite `MarkdownImageControls.js`: two buttons (⋯ and a brush icon) in a top-right cluster; the ⋯ toggles a small menu with Move up / Move down / Remove; the brush toggles the existing Layout/Size/Caption-style popover (reuse `layoutPillOptions`/`sizePillOptions`/`captionStylePillOptions` and the `DesignSection`/`PillToggle`). Give the brush button an accessible name `Design` and a clean brush glyph. Remove the `<input>` and the `onCaption` prop. Keep `sizeDisabled = attrs.layout === 'full-bleed'`.

- [ ] **Step 4: Run — verify pass.**
- [ ] **Step 5: Commit.** `git add components/admin/gallery-builder/MarkdownImageControls.js __tests__/components/MarkdownImageControls.test.js && git commit -m "feat(markdown): image controls as a ⋯ menu + brush, no caption box"`

---

### Task 5: wire the editor panel (`components/admin/gallery-builder/MarkdownEditorPanel.js`)

**Files:**
- Modify: `components/admin/gallery-builder/MarkdownEditorPanel.js`
- Test: `__tests__/components/MarkdownEditorPanel.test.js` (exists — keep green)

**Interfaces:**
- Consumes: the new `createImageBlockNode(doc, url, attrs, caption)` and `renderMarkdownToElement(md, doc, captionByUrl)` (Task 2); `MarkdownImageControls` without `onCaption` (Task 4).

Read the file first, then make these changes:
- **captionByUrl:** build a `{ url: caption }` map from `libraryConfig`/`libraryImages` (each library asset has `publicUrl`/`url` + `caption`). Use it in the seed effect — `renderMarkdownToElement(seedMd, document, captionByUrl)` — and when inserting a picked photo — `createImageBlockNode(document, r.url, {}, captionByUrl[r.url] || '')` (note the new arg order: attrs then caption).
- **Overlay position:** the wrapper is now the sized image box, so keep positioning the control group at the wrapper's top-right (the existing `positionOverlay` using the wrapper's `getBoundingClientRect` already does this — it will now sit on the image instead of far right). Reposition on layout/size change (already triggered via `positionOverlay()` in `onImgAttr`).
- **Remove caption wiring:** delete the `onImgCaption` handler and stop passing `onCaption` to `<MarkdownImageControls>`.
- **On layout/size change** (`onImgAttr`): `setImageAttr` now re-applies the wrapper styling, so just keep calling `emit()` + `positionOverlay()`.
- Keep the `selGen`/`key` remount behavior.

- [ ] **Step 1:** Update the `createImageBlockNode`/`renderMarkdownToElement` calls to the new signatures + build `captionByUrl`; drop `onImgCaption`/`onCaption`.
- [ ] **Step 2: Run** `node_modules/.bin/jest __tests__/components/MarkdownEditorPanel.test.js` — all pass (fix any call that broke from the signature change).
- [ ] **Step 3: Commit.** `git add components/admin/gallery-builder/MarkdownEditorPanel.js __tests__/components/MarkdownEditorPanel.test.js && git commit -m "feat(markdown): wire editor panel — library captions, on-image controls, no caption box"`

---

### Task 6: Verify

- [ ] **Step 1:** Run every touched suite:
```bash
node_modules/.bin/jest __tests__/common/markdownImageOptions.test.js __tests__/common/markdownDom.test.js __tests__/components/MarkdownText.test.js __tests__/components/MarkdownImageControls.test.js __tests__/components/MarkdownEditorPanel.test.js __tests__/common/markdown.test.js
```
Expected: all PASS.
- [ ] **Step 2 (manual, post-merge):** in the studio, add an image to a text block; change Layout (centered/edge-to-edge/side) and Size (L/M/S) and confirm the editor preview changes and text wraps beside a "side" image; confirm the caption shows the photo's library caption styled per the brush; use ⋯ to move/remove.

---

## Self-Review

- **Spec coverage:** controls ⋯+brush on the image (T4, T5) ✓; editor live-renders layout/size (T1, T2, T5) ✓; caption library-driven in editor (T2, T5) and public (T3) ✓; directive drops caption text (T2) ✓; side floats left (T1, T3) ✓.
- **Placeholders:** the softest steps are T3/T5 call-site edits (implementer greps + reads Gallery.js/the panel) and the T5 test-body ("keep green") — pointing at existing files rather than pasting them, as in prior plans. T3 says report-and-defer if a theme column lacks `assetsByUrl`. No "TODO/handle edge cases" left.
- **Type consistency:** `createImageBlockNode(doc, url, attrs, caption)` arg order is consistent across T2 (def), T5 (calls), and `renderMarkdownToElement(md, doc, captionByUrl)`; `getImageAttrs` returns `{layout,size,style}` (no caption) consistently in T2 (serialize, setImageAttr); `MarkdownText` gains `assetsByUrl` (T3) consumed by the call sites; `MarkdownImageControls` drops `onCaption` (T4) and the panel stops passing it (T5).
