# In-article Images for the Markdown Text Block — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a photographer insert images into a Markdown text block at the cursor, remove them, and give each image its own layout / size / caption — controlled from the Markdown editor panel.

**Architecture:** Per-image metadata rides inline in the single markdown string as an attribute suffix — `![caption](url){layout=side size=m style=serif}` — round-tripped through the parser, the WYSIWYG DOM bridge, and the public renderer. Controls live on each image inside the Markdown editor panel (an existing block-editing surface), never on the read-only preview. Drag-to-reposition is deferred; move up/down ships instead.

**Tech Stack:** Next.js (pages router), React, plain-DOM `contentEditable` WYSIWYG bridge, Jest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-16-markdown-in-article-images-design.md`

## Global Constraints

- Markdown stays a **single string** on `block.content`; images are standard `![caption](url)` with an optional `{…}` suffix. No side-car per-image array beyond the existing `block.images` asset-tracking bookkeeping.
- **Backward compatible:** a bare `![](url)` (no suffix) must parse and render exactly as today (centered, full-width). Unknown attr keys are dropped on round-trip.
- **Attribute vocabulary (exact ids):** `layout` ∈ `centered` (default) | `full-bleed` | `side`; `size` ∈ `l` (default) | `m` | `s`; `style` ∈ `sans` (default) | `serif` | `mono` | `accent` (reuse `common/captionStyles.js`).
- `side` floats **left only** for v1.
- No controls on the site preview (right pane) — the editing invariant holds.
- Run tests with `node_modules/.bin/jest <file>` (never `npx jest`). The full suite has ~27 pre-existing AWS-SDK/node-20 suite-load failures — ignore those; only your touched suites matter.

---

### Task 1: Parse the image attribute suffix (`common/markdown.js`)

**Files:**
- Modify: `common/markdown.js`
- Test: `__tests__/common/markdown.test.js` (exists — append)

**Interfaces:**
- Produces: `parseImageAttrs(attrStr: string) → { layout?, size?, style? }` (only known keys, values validated) and `formatImageAttrs(attrs: object) → string` (e.g. `"layout=side size=m"`, or `''` when all default/empty). Image AST nodes gain optional `layout`, `size`, `style` fields (absent ⇒ default).

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/markdown.test.js
import { parseMarkdown, parseImageAttrs, formatImageAttrs } from '../../common/markdown'

describe('image attribute suffix', () => {
  it('parses layout/size/style from an image line', () => {
    const [node] = parseMarkdown('![A cat](http://x/c.jpg){layout=side size=m style=serif}')
    expect(node).toEqual({ type: 'image', url: 'http://x/c.jpg', caption: 'A cat', layout: 'side', size: 'm', style: 'serif' })
  })
  it('leaves a bare image with no attrs (backward compatible)', () => {
    const [node] = parseMarkdown('![](http://x/c.jpg)')
    expect(node).toEqual({ type: 'image', url: 'http://x/c.jpg', caption: '' })
  })
  it('drops unknown keys and invalid values', () => {
    expect(parseImageAttrs('layout=bogus size=m foo=bar')).toEqual({ size: 'm' })
  })
  it('formatImageAttrs emits only set keys, empty when none', () => {
    expect(formatImageAttrs({ layout: 'side', size: 'm' })).toBe('layout=side size=m')
    expect(formatImageAttrs({})).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/jest __tests__/common/markdown.test.js -t "image attribute suffix"`
Expected: FAIL (`parseImageAttrs is not a function`, and the mixed/attrs cases error).

- [ ] **Step 3: Implement in `common/markdown.js`**

Replace the `IMAGE_LINE` constant and add the two helpers:

```js
// Optional {key=value …} suffix after the image, e.g. ![c](u){layout=side size=m}
const IMAGE_LINE = /^!\[([^\]]*)\]\(([^)\s]+)\)(?:\{([^}]*)\})?$/

const IMAGE_ATTR_VALUES = {
  layout: ['centered', 'full-bleed', 'side'],
  size: ['l', 'm', 's'],
  style: ['sans', 'serif', 'mono', 'accent'],
}

export function parseImageAttrs(attrStr) {
  const out = {}
  if (!attrStr) return out
  for (const pair of String(attrStr).trim().split(/\s+/)) {
    const eq = pair.indexOf('=')
    if (eq < 1) continue
    const key = pair.slice(0, eq)
    const val = pair.slice(eq + 1)
    if (IMAGE_ATTR_VALUES[key] && IMAGE_ATTR_VALUES[key].includes(val)) out[key] = val
  }
  return out
}

export function formatImageAttrs(attrs) {
  if (!attrs) return ''
  return Object.keys(IMAGE_ATTR_VALUES)
    .filter((k) => attrs[k])
    .map((k) => `${k}=${attrs[k]}`)
    .join(' ')
}

// Build an image AST node, folding in any parsed attrs (absent keys omitted).
function imageNode(url, caption, attrStr) {
  return { type: 'image', url, caption, ...parseImageAttrs(attrStr) }
}
```

Then use `imageNode` in both image branches:
- In `pushMixedLines`: `if (im) { flushPara(); blocks.push(imageNode(im[2], im[1], im[3])) }`
- In `parseMarkdown`: `blocks.push(imageNode(m[2], m[1], m[3]))`

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/jest __tests__/common/markdown.test.js`
Expected: PASS (all, including pre-existing markdown tests).

- [ ] **Step 5: Commit**

```bash
git add common/markdown.js __tests__/common/markdown.test.js
git commit -m "feat(markdown): parse per-image layout/size/style attribute suffix"
```

---

### Task 2: Round-trip attrs + caption through the DOM bridge (`common/markdownDom.js`)

**Files:**
- Modify: `common/markdownDom.js`
- Test: `__tests__/common/markdownDom.test.js` (exists — append)

**Interfaces:**
- Consumes: `formatImageAttrs` (Task 1).
- Produces:
  - `createImageBlockNode(doc, url, caption, attrs = {})` — now stores `data-layout/data-size/data-style` on the wrapper and the caption as the `<img alt>`.
  - `getImageAttrs(wrapper) → { layout?, size?, style?, caption }` — reads them back.
  - `setImageAttr(wrapper, key, value)` — sets/removes one attr (`value===''` or a default removes it).
  - `blockElementToMarkdown` now serializes a wrapper to `![caption](url){…}` preserving caption + attrs.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/markdownDom.test.js
import { createImageBlockNode, getImageAttrs, setImageAttr, serializeDomToMarkdown, renderMarkdownToElement } from '../../common/markdownDom'

describe('image wrapper attrs round-trip', () => {
  it('createImageBlockNode stores attrs + caption and getImageAttrs reads them', () => {
    const w = createImageBlockNode(document, 'http://x/c.jpg', 'A cat', { layout: 'side', size: 'm', style: 'serif' })
    expect(getImageAttrs(w)).toEqual({ layout: 'side', size: 'm', style: 'serif', caption: 'A cat' })
  })
  it('serializes a wrapper back to markdown with caption + attrs', () => {
    const root = document.createElement('div')
    root.appendChild(createImageBlockNode(document, 'http://x/c.jpg', 'A cat', { layout: 'side', size: 'm' }))
    expect(serializeDomToMarkdown(root)).toBe('![A cat](http://x/c.jpg){layout=side size=m}')
  })
  it('a bare image round-trips unchanged', () => {
    const root = document.createElement('div')
    root.appendChild(createImageBlockNode(document, 'http://x/c.jpg', '', {}))
    expect(serializeDomToMarkdown(root)).toBe('![](http://x/c.jpg)')
  })
  it('renderMarkdownToElement rebuilds a wrapper carrying the attrs', () => {
    const el = renderMarkdownToElement('![A cat](http://x/c.jpg){layout=full-bleed}', document)
    expect(getImageAttrs(el.firstChild)).toMatchObject({ layout: 'full-bleed', caption: 'A cat' })
  })
  it('setImageAttr sets and clears', () => {
    const w = createImageBlockNode(document, 'http://x/c.jpg', '', {})
    setImageAttr(w, 'layout', 'side'); expect(getImageAttrs(w).layout).toBe('side')
    setImageAttr(w, 'layout', ''); expect(getImageAttrs(w).layout).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/jest __tests__/common/markdownDom.test.js -t "image wrapper attrs round-trip"`
Expected: FAIL (`getImageAttrs is not a function`; serialize drops caption/attrs).

- [ ] **Step 3: Implement in `common/markdownDom.js`**

Add the import and rewrite the image node helpers:

```js
import { parseMarkdown } from './markdown'
import { formatImageAttrs } from './markdown'

const IMAGE_WRAPPER_ATTR = 'data-md-image'
const IMAGE_ATTR_KEYS = ['layout', 'size', 'style']

export function createImageBlockNode(doc, url, caption, attrs = {}) {
  const wrap = doc.createElement('div')
  wrap.setAttribute(IMAGE_WRAPPER_ATTR, '1')
  wrap.setAttribute('contenteditable', 'false')
  wrap.style.margin = '0.5em 0'
  for (const k of IMAGE_ATTR_KEYS) if (attrs[k]) wrap.setAttribute(`data-${k}`, attrs[k])
  const img = doc.createElement('img')
  img.setAttribute('src', url || '')
  if (caption) img.setAttribute('alt', caption)
  img.style.display = 'block'
  img.style.maxHeight = '120px'
  img.style.borderRadius = '8px'
  wrap.appendChild(img)
  return wrap
}

export function getImageAttrs(wrapper) {
  const out = {}
  for (const k of IMAGE_ATTR_KEYS) { const v = wrapper.getAttribute(`data-${k}`); if (v) out[k] = v }
  const img = wrapper.querySelector('img')
  out.caption = (img && img.getAttribute('alt')) || ''
  return out
}

export function setImageAttr(wrapper, key, value) {
  if (key === 'caption') {
    const img = wrapper.querySelector('img')
    if (img) { value ? img.setAttribute('alt', value) : img.removeAttribute('alt') }
    return
  }
  if (value) wrapper.setAttribute(`data-${key}`, value)
  else wrapper.removeAttribute(`data-${key}`)
}
```

Update `blockElementToMarkdown`'s wrapper branch (and the bare `<img>` branch) to preserve caption + attrs:

```js
  if (tag === 'img') {
    const alt = el.getAttribute('alt') || ''
    return `![${alt}](${el.getAttribute('src') || ''})`
  }
  if (el.hasAttribute(IMAGE_WRAPPER_ATTR)) {
    const { caption, ...attrs } = getImageAttrs(el)
    const img = el.querySelector('img')
    const suffix = formatImageAttrs(attrs)
    return `![${caption}](${img ? img.getAttribute('src') || '' : ''})${suffix ? `{${suffix}}` : ''}`
  }
```

Update the `image` case in `renderMarkdownToElement` to pass attrs:

```js
      case 'image':
        container.appendChild(createImageBlockNode(d, block.url, block.caption, { layout: block.layout, size: block.size, style: block.style }))
        break
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/jest __tests__/common/markdownDom.test.js`
Expected: PASS (including pre-existing tests).

- [ ] **Step 5: Commit**

```bash
git add common/markdownDom.js __tests__/common/markdownDom.test.js
git commit -m "feat(markdown): round-trip image caption + layout attrs through the DOM bridge"
```

---

### Task 3: Render per-image layout / size / caption-style (`components/image-displays/MarkdownText.js`)

**Files:**
- Create: `common/markdownImageOptions.js`
- Modify: `components/image-displays/MarkdownText.js`
- Test: `__tests__/components/MarkdownText.test.js` (create)

**Interfaces:**
- Consumes: image AST nodes with `layout/size/style` (Task 1), `captionStyleCss` (`common/captionStyles.js`).
- Produces: `common/markdownImageOptions.js` exporting `LAYOUT_OPTIONS`, `SIZE_OPTIONS`, `DEFAULT_IMAGE_LAYOUT='centered'`, `DEFAULT_IMAGE_SIZE='l'`, and `imageFigureClasses({layout,size}) → { figureClass, imgClass }`.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/components/MarkdownText.test.js
import { render } from '@testing-library/react'
import MarkdownText from '../../components/image-displays/MarkdownText'

const imgOf = (c) => c.querySelector('img')
const figOf = (c) => c.querySelector('figure')

it('centered image at default (full width) — backward compatible', () => {
  const { container } = render(<MarkdownText content={'![](http://x/c.jpg)'} />)
  expect(imgOf(container)).toBeInTheDocument()
  expect(figOf(container).className).not.toMatch(/float-left/)
})
it('side layout floats left and wraps text', () => {
  const { container } = render(<MarkdownText content={'![Cat](http://x/c.jpg){layout=side size=m}'} />)
  expect(figOf(container).className).toMatch(/float-left/)
})
it('full-bleed spans edge to edge', () => {
  const { container } = render(<MarkdownText content={'![](http://x/c.jpg){layout=full-bleed}'} />)
  expect(figOf(container).className).toMatch(/w-screen|w-full/)
})
it('caption style applies (serif figcaption)', () => {
  const { container } = render(<MarkdownText content={'![Cat](http://x/c.jpg){style=serif}'} />)
  const cap = container.querySelector('figcaption')
  expect(cap).toHaveTextContent('Cat')
  expect(cap.getAttribute('style') || '').toMatch(/Cormorant|italic/i)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/jest __tests__/components/MarkdownText.test.js`
Expected: FAIL (side never floats; caption has no style).

- [ ] **Step 3: Create `common/markdownImageOptions.js`**

```js
// Layout + size vocabulary for images inside a Markdown text block. Mirrors the
// photo-block variants but decoupled so the markdown path owns its own classes.
export const DEFAULT_IMAGE_LAYOUT = 'centered'
export const DEFAULT_IMAGE_SIZE = 'l'

export const LAYOUT_OPTIONS = [
  { id: 'centered', label: 'Centered' },
  { id: 'full-bleed', label: 'Edge to edge' },
  { id: 'side', label: 'Side' },
]
export const SIZE_OPTIONS = [
  { id: 'l', label: 'L' },
  { id: 'm', label: 'M' },
  { id: 's', label: 'S' },
]

const CENTERED_W = { l: 'w-full', m: 'w-2/3 mx-auto', s: 'w-2/5 mx-auto' }
const SIDE_W = { l: 'sm:w-1/2', m: 'sm:w-2/5', s: 'sm:w-1/3' }

// figureClass/imgClass for a resolved image. side floats left (v1) and collapses
// to full-width stacked on mobile; full-bleed ignores size.
export function imageFigureClasses({ layout, size } = {}) {
  const lay = LAYOUT_OPTIONS.some((o) => o.id === layout) ? layout : DEFAULT_IMAGE_LAYOUT
  const sz = SIZE_OPTIONS.some((o) => o.id === size) ? size : DEFAULT_IMAGE_SIZE
  if (lay === 'full-bleed') return { figureClass: 'my-8 w-full', imgClass: 'w-full h-auto' }
  if (lay === 'side') return { figureClass: `my-4 w-full ${SIDE_W[sz]} sm:float-left sm:mr-6 sm:mb-3`, imgClass: 'w-full h-auto' }
  return { figureClass: `my-6 ${CENTERED_W[sz]}`, imgClass: 'w-full h-auto' }
}
```

- [ ] **Step 4: Update the `image` branch in `MarkdownText.js`**

Add imports and replace the image render:

```js
import { imageFigureClasses } from '@/common/markdownImageOptions'
import { captionStyleCss } from '@/common/captionStyles'
```

```js
        if (b.type === 'image') {
          const { figureClass, imgClass } = imageFigureClasses(b)
          return (
            <figure key={i} className={figureClass}>
              <img src={b.url} alt={b.caption || ''} className={imgClass} loading="lazy" />
              {b.caption ? <figcaption className="mt-2 text-sm opacity-60" style={captionStyleCss(b.style)}>{b.caption}</figcaption> : null}
            </figure>
          )
        }
```

Note: keep the outer wrapper able to contain floats — change the root `<div className="markdown-text space-y-2">` to add `after:clear-both after:block after:content-['']` (Tailwind clearfix) so a trailing `side` float doesn't bleed past the block. Verify the clearfix class renders.

- [ ] **Step 5: Run tests to verify they pass**

Run: `node_modules/.bin/jest __tests__/components/MarkdownText.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add common/markdownImageOptions.js components/image-displays/MarkdownText.js __tests__/components/MarkdownText.test.js
git commit -m "feat(markdown): render in-article image layout/size/caption-style"
```

---

### Task 4: Insert at the cursor, not the end (`MarkdownEditorPanel.js`)

**Files:**
- Modify: `components/admin/gallery-builder/MarkdownEditorPanel.js`
- Test: `__tests__/components/MarkdownEditorPanel.test.js` (exists — append)

**Interfaces:**
- Consumes: `createImageBlockNode` (Task 2).
- Produces: no new exports; `insertImages` now inserts after the block that held the caret when the picker opened.

**Root cause (from the spec):** opening `PhotoPickerModal` moves the selection out of the contentEditable, so `currentBlockElement` falls back to `root.lastElementChild` (the end). Fix: capture the caret's top-level block **before** opening the picker.

- [ ] **Step 1: Write the failing test**

Extend the existing panel test. It already renders the panel and drives the picker via the `onConfirm` prop; assert the inserted image lands after the caret block, not at the end. (Follow the existing file's setup/mocks for `PhotoPickerModal`.)

```js
// __tests__/components/MarkdownEditorPanel.test.js  (new case)
it('inserts the image after the block the caret was in, not at the end', async () => {
  // Render with a two-paragraph block; place caret in the FIRST paragraph;
  // open the picker (Img button) and confirm one photo.
  // Assert: serialized content has the image between the two paragraphs.
  // (Use the file's existing render helper + PhotoPickerModal mock; capture the
  //  emitted content from the onChange spy.)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/jest __tests__/components/MarkdownEditorPanel.test.js -t "caret was in"`
Expected: FAIL (image appended after the second paragraph).

- [ ] **Step 3: Implement the caret capture**

Add a ref and capture the anchor block whenever the picker is opened (Img button + `/` shortcut), then consume it in `insertImages`:

```js
const savedAnchorRef = useRef(null)   // top-level block the caret was in when the picker opened

const openPicker = () => {
  const el = editableRef.current
  savedAnchorRef.current = el ? currentBlockElement(el) : null
  setPickerOpen(true)
}
```

- Replace `act: () => setPickerOpen(true)` (Image toolbar button) with `act: openPicker`.
- In `onKeyDown`'s `/` branch, replace `setPickerOpen(true)` with `openPicker()`.
- In `insertImages`, replace `let after = currentBlockElement(el)` with:

```js
      let after = (savedAnchorRef.current && savedAnchorRef.current.parentElement === el)
        ? savedAnchorRef.current
        : currentBlockElement(el)
```

- After inserting, clear it: `savedAnchorRef.current = null`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/jest __tests__/components/MarkdownEditorPanel.test.js`
Expected: PASS (including pre-existing panel tests).

- [ ] **Step 5: Commit**

```bash
git add components/admin/gallery-builder/MarkdownEditorPanel.js __tests__/components/MarkdownEditorPanel.test.js
git commit -m "fix(markdown): insert image at the caret, not the end of the article"
```

---

### Task 5: Per-image controls in the editor — remove, caption, move, design brush (`MarkdownEditorPanel.js`)

**Files:**
- Create: `components/admin/gallery-builder/MarkdownImageControls.js`
- Modify: `components/admin/gallery-builder/MarkdownEditorPanel.js`
- Test: `__tests__/components/MarkdownImageControls.test.js` (create) + `__tests__/common/markdownDom.test.js` (append remove/move helper tests)

**Interfaces:**
- Consumes: `getImageAttrs`, `setImageAttr` (Task 2); `LAYOUT_OPTIONS`, `SIZE_OPTIONS` (Task 3); `CAPTION_STYLE_OPTIONS` (`common/captionStyles.js`); `PillToggle`, `DesignSection` (`components/admin/platform/designControls`).
- Produces:
  - `common/markdownDom.js`: `removeImageWrapper(wrapper) → assetUrl` (removes node, returns its img src) and `moveImageWrapper(wrapper, dir) → boolean` (swaps with prev/next top-level sibling; `dir` is `-1`/`+1`).
  - `MarkdownImageControls({ attrs, onAttr, onCaption, onRemove, onMove })` — the React overlay (control bar + brush popover) rendered over the selected image.

**Approach:** The panel tracks a selected image wrapper (`selectedImgRef` + a `selVersion` counter to force overlay re-position). Clicking inside a `data-md-image` wrapper selects it; the panel renders `<MarkdownImageControls>` absolutely-positioned over the wrapper (using its `getBoundingClientRect` relative to the panel). All handlers mutate the wrapper via the Task-2 DOM helpers, then call `emit()`; remove/move additionally prune/keep `block.images`.

- [ ] **Step 1: Write failing tests for the DOM helpers**

```js
// __tests__/common/markdownDom.test.js  (append)
import { removeImageWrapper, moveImageWrapper } from '../../common/markdownDom'

describe('image wrapper remove/move', () => {
  function root() {
    const r = document.createElement('div')
    const p = document.createElement('p'); p.textContent = 'A'; r.appendChild(p)
    r.appendChild(createImageBlockNode(document, 'http://x/c.jpg', '', {}))
    const p2 = document.createElement('p'); p2.textContent = 'B'; r.appendChild(p2)
    return r
  }
  it('removeImageWrapper detaches the node and returns its src', () => {
    const r = root(); const w = r.querySelector('[data-md-image]')
    expect(removeImageWrapper(w)).toBe('http://x/c.jpg')
    expect(r.querySelector('[data-md-image]')).toBeNull()
  })
  it('moveImageWrapper reorders among top-level siblings', () => {
    const r = root(); const w = r.querySelector('[data-md-image]')
    expect(moveImageWrapper(w, -1)).toBe(true)
    expect(r.firstElementChild.hasAttribute('data-md-image')).toBe(true)
    expect(moveImageWrapper(r.querySelector('[data-md-image]'), -1)).toBe(false) // already first
  })
})
```

- [ ] **Step 2: Run — verify fail**

Run: `node_modules/.bin/jest __tests__/common/markdownDom.test.js -t "remove/move"`
Expected: FAIL (helpers undefined).

- [ ] **Step 3: Implement the helpers in `common/markdownDom.js`**

```js
export function removeImageWrapper(wrapper) {
  const img = wrapper.querySelector('img')
  const src = img ? img.getAttribute('src') || '' : ''
  wrapper.remove()
  return src
}

export function moveImageWrapper(wrapper, dir) {
  const sib = dir < 0 ? wrapper.previousElementSibling : wrapper.nextElementSibling
  if (!sib) return false
  if (dir < 0) wrapper.parentElement.insertBefore(wrapper, sib)
  else wrapper.parentElement.insertBefore(sib, wrapper)
  return true
}
```

- [ ] **Step 4: Run — verify pass**

Run: `node_modules/.bin/jest __tests__/common/markdownDom.test.js`
Expected: PASS.

- [ ] **Step 5: Write the failing test for `MarkdownImageControls`**

```js
// __tests__/components/MarkdownImageControls.test.js
import { render, screen, fireEvent } from '@testing-library/react'
import MarkdownImageControls from '../../components/admin/gallery-builder/MarkdownImageControls'

const base = { attrs: { layout: 'centered', size: 'l', style: 'sans', caption: '' } }
it('remove fires onRemove', () => {
  const onRemove = jest.fn()
  render(<MarkdownImageControls {...base} onRemove={onRemove} onAttr={()=>{}} onCaption={()=>{}} onMove={()=>{}} />)
  fireEvent.click(screen.getByRole('button', { name: /remove/i }))
  expect(onRemove).toHaveBeenCalled()
})
it('opening the brush shows layout options and picking one fires onAttr', () => {
  const onAttr = jest.fn()
  render(<MarkdownImageControls {...base} onRemove={()=>{}} onAttr={onAttr} onCaption={()=>{}} onMove={()=>{}} />)
  fireEvent.click(screen.getByRole('button', { name: /design/i }))
  fireEvent.click(screen.getByText('Side'))
  expect(onAttr).toHaveBeenCalledWith('layout', 'side')
})
it('editing the caption fires onCaption', () => {
  const onCaption = jest.fn()
  render(<MarkdownImageControls {...base} onRemove={()=>{}} onAttr={()=>{}} onCaption={onCaption} onMove={()=>{}} />)
  fireEvent.change(screen.getByPlaceholderText(/caption/i), { target: { value: 'Hi' } })
  expect(onCaption).toHaveBeenCalledWith('Hi')
})
```

- [ ] **Step 6: Run — verify fail**

Run: `node_modules/.bin/jest __tests__/components/MarkdownImageControls.test.js`
Expected: FAIL (module missing).

- [ ] **Step 7: Implement `components/admin/gallery-builder/MarkdownImageControls.js`**

```js
import { useState } from 'react'
import { PillToggle, DesignSection } from '../platform/designControls'
import { LAYOUT_OPTIONS, SIZE_OPTIONS } from '@/common/markdownImageOptions'
import { CAPTION_STYLE_OPTIONS } from '@/common/captionStyles'

const btn = { background: '#fff', border: '1px solid rgba(160,140,110,0.4)', borderRadius: 5, width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, color: '#2c2416' }

// Overlay control cluster for one image inside the Markdown editor. `attrs` is
// { layout, size, style, caption }. Callers wire the handlers to DOM mutations.
export default function MarkdownImageControls({ attrs, onAttr, onCaption, onRemove, onMove }) {
  const [showDesign, setShowDesign] = useState(false)
  const sizeDisabled = attrs.layout === 'full-bleed'
  return (
    <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <button type="button" aria-label="Move up" title="Move up" style={btn} onClick={() => onMove(-1)}>↑</button>
        <button type="button" aria-label="Move down" title="Move down" style={btn} onClick={() => onMove(1)}>↓</button>
        <button type="button" aria-label="Design" title="Design" style={btn} onClick={() => setShowDesign((v) => !v)}>✎</button>
        <button type="button" aria-label="Remove" title="Remove" style={{ ...btn, color: '#b03030' }} onClick={onRemove}>✕</button>
      </div>
      {showDesign && (
        <div style={{ background: 'var(--popover)', boxShadow: 'var(--popover-shadow)', borderRadius: 8, padding: 10, width: 220 }} className="space-y-2">
          <DesignSection label="Layout">
            <PillToggle value={attrs.layout || 'centered'} onChange={(v) => onAttr('layout', v)} options={LAYOUT_OPTIONS} />
          </DesignSection>
          {!sizeDisabled && (
            <DesignSection label="Size">
              <PillToggle value={attrs.size || 'l'} onChange={(v) => onAttr('size', v)} options={SIZE_OPTIONS} />
            </DesignSection>
          )}
          <DesignSection label="Caption">
            <PillToggle value={attrs.style || 'sans'} onChange={(v) => onAttr('style', v)} options={CAPTION_STYLE_OPTIONS} />
          </DesignSection>
        </div>
      )}
      <input
        defaultValue={attrs.caption || ''}
        placeholder="Caption…"
        onChange={(e) => onCaption(e.target.value)}
        style={{ width: 200, fontSize: 12, padding: '3px 6px', borderRadius: 4, border: '1px solid rgba(160,140,110,0.4)', background: 'rgba(255,253,248,0.9)' }}
      />
    </div>
  )
}
```

- [ ] **Step 8: Run — verify pass**

Run: `node_modules/.bin/jest __tests__/components/MarkdownImageControls.test.js`
Expected: PASS.

- [ ] **Step 9: Wire selection + overlay into `MarkdownEditorPanel.js`**

Add state/refs and an overlay. Key pieces:

```js
import MarkdownImageControls from './MarkdownImageControls'
import { getImageAttrs, setImageAttr, removeImageWrapper, moveImageWrapper } from '@/common/markdownDom'
```

```js
const [selRect, setSelRect] = useState(null)      // {top,left,width,height} in panel coords, or null
const selectedImgRef = useRef(null)

const positionOverlay = () => {
  const wrap = selectedImgRef.current, panel = panelRef.current
  if (!wrap || !panel) { setSelRect(null); return }
  const w = wrap.getBoundingClientRect(), p = panel.getBoundingClientRect()
  setSelRect({ top: w.top - p.top, left: w.left - p.left, width: w.width, height: w.height })
}

const selectImageFromEvent = (e) => {
  const wrap = e.target.closest?.('[data-md-image]')
  selectedImgRef.current = wrap && editableRef.current?.contains(wrap) ? wrap : null
  positionOverlay()
}

const imgAttrs = () => (selectedImgRef.current ? getImageAttrs(selectedImgRef.current) : null)
const onImgAttr = (k, v) => { if (selectedImgRef.current) { setImageAttr(selectedImgRef.current, k, v); emit(); positionOverlay() } }
const onImgCaption = (v) => { if (selectedImgRef.current) { setImageAttr(selectedImgRef.current, 'caption', v); emit() } }
const onImgMove = (dir) => { if (selectedImgRef.current && moveImageWrapper(selectedImgRef.current, dir)) { emit(); positionOverlay() } }
const onImgRemove = () => {
  const wrap = selectedImgRef.current; if (!wrap) return
  const url = removeImageWrapper(wrap)
  selectedImgRef.current = null; setSelRect(null)
  const images = (block.images || []).filter((i) => i.url !== url)
  emit({ images })
}
```

- On the editable div: add `onClick={selectImageFromEvent}` and `onScroll={positionOverlay}`. Deselect on outside click/typing: in `onInput`, if the selection is no longer in a wrapper, `selectedImgRef.current = null; setSelRect(null)`.
- Render the overlay inside the panel (after the editable div), only when `selRect`:

```js
{selRect && selectedImgRef.current && (
  <div style={{ position: 'absolute', top: selRect.top, left: selRect.left, width: selRect.width, height: selRect.height, pointerEvents: 'none' }}>
    <div style={{ pointerEvents: 'auto', position: 'relative', width: '100%', height: '100%' }}>
      <MarkdownImageControls attrs={imgAttrs()} onAttr={onImgAttr} onCaption={onImgCaption} onRemove={onImgRemove} onMove={onImgMove} />
    </div>
  </div>
)}
```

- The panel's outer container is already `fixed` (position set) — ensure it's a positioning context (it is; `left/top` set). Overlay coords are panel-relative.

- [ ] **Step 10: Manual-parity check via existing panel test**

Run: `node_modules/.bin/jest __tests__/components/MarkdownEditorPanel.test.js`
Expected: PASS (no regression; overlay is inert without a selection).

- [ ] **Step 11: Commit**

```bash
git add common/markdownDom.js components/admin/gallery-builder/MarkdownImageControls.js components/admin/gallery-builder/MarkdownEditorPanel.js __tests__/components/MarkdownImageControls.test.js __tests__/common/markdownDom.test.js
git commit -m "feat(markdown): per-image remove/move/caption/design-brush in the editor"
```

---

### Task 6: Verify end-to-end + docs

**Files:**
- Modify: `CLAUDE.md` (Key Patterns — note in-article image attrs) if a patterns list is present.
- Test: run all touched suites together.

- [ ] **Step 1: Run every touched suite**

Run:
```bash
node_modules/.bin/jest __tests__/common/markdown.test.js __tests__/common/markdownDom.test.js __tests__/components/MarkdownText.test.js __tests__/components/MarkdownImageControls.test.js __tests__/components/MarkdownEditorPanel.test.js
```
Expected: all PASS.

- [ ] **Step 2: Drive the real app** (per superpowers:verification-before-completion / the project run skill)

Open the studio, edit a text block, add two images, give one `Side` and one `Centered`, set a caption, remove one, reorder, and confirm the public render (preview) shows the float/centered/caption correctly and re-opening the editor preserves everything.

- [ ] **Step 3: Commit any doc updates**

```bash
git add -A && git commit -m "docs: note in-article image layout attrs"
```

---

## Self-Review

- **Spec coverage:** insert-at-cursor (T4) ✓; remove + prune `block.images` (T5) ✓; per-image layout/size/caption + style (T1–T3, T5) ✓; controls in the editor panel not the preview (T5) ✓; inline `{…}` data model, backward compatible (T1–T2) ✓; `side` floats left, mobile stack (T3) ✓; reuse caption styles + variant vocabulary (T3, T5) ✓; drag deferred, move up/down interim (T5) ✓.
- **Placeholders:** none — every code step carries real code; the one prose-only sub-step (T4 Step 1 test body) points at the existing panel test's established render/mock helpers, which the executor must follow rather than invent.
- **Type consistency:** attr keys `layout/size/style` and the `caption` pseudo-key are consistent across `parseImageAttrs`/`formatImageAttrs` (T1), `getImageAttrs`/`setImageAttr`/`createImageBlockNode` (T2), `imageFigureClasses` (T3), and `MarkdownImageControls` (T5). `removeImageWrapper` returns the src used to prune `block.images` by `url` (T5).
