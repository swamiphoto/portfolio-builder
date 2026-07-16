# Block Design-Popup Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every block's design-popup variants do what they say, add the missing ones, give every block a working popup, and refactor the theme system so variants inherit from a shared base instead of being re-declared per theme.

**Architecture:** A new `common/themes/base.js` owns the canonical variant menus (stable semantic IDs) + a `mergeBlockSpec` helper. Themes become `{ id, name, navStyle, tokens, overrides }` and inherit the base; `getBlockSpec` merges base + override. Block-level, theme-independent fields (`align`, `font`, `buttonStyle`) drive text/contact/cover styling; per-theme layout selection stays in `themeState[themeId].variant`. Renderers switch on the shared IDs; theme tokens supply fonts/colors.

**Tech Stack:** Next.js (pages router), React, Tailwind, Jest + @testing-library/react, react-player.

## Global Constraints

- Dev server runs `next dev` on **port 3000**. NEVER run `next build` / `next export` over the live dev server — it clobbers `.next` and 500s every route. Manual verification = load `http://localhost:3000` in the browser.
- Tests: `npm test` (Jest, jsdom). Test files live in `__tests__/`. Import app modules with the `@/` alias (maps to repo root — see existing tests).
- Store **theme-independent** data on blocks (`block.align`, `block.font`, `block.buttonStyle`); per-theme layout selection stays in `block.themeState[themeId].variant`. Never store theme-dependent (resolved) values.
- Variant IDs are **shared/semantic** across themes. Themes differ only via `overrides` (labels/defaults/hide/add) and `tokens`.
- Hover states: `hover:bg-*` Tailwind classes silently die on elements with an inline `background`. Use JS hover handlers or inline styles where an inline background exists.
- Keep `resolveVariant` non-throwing: every block type used with it must expose a `variants` array (contact/page-gallery keep a single `standard`/`list` variant).

---

## File Structure

**Create:**
- `common/themes/base.js` — `baseBlocks`, `baseCover`, `FONT_SLOTS`, `mergeBlockSpec(base, override)`.
- `common/themes/README.md` — theme contract docs.
- `components/image-displays/gallery/grid-gallery/GridGallery.js` — justified equal-height-rows layout.
- `components/image-displays/gallery/square-gallery/SquareGallery.js` — uniform hard-cropped squares.
- Test files under `__tests__/themes/` and `__tests__/components/`.

**Modify:**
- `common/themes/kyoto.js`, `common/themes/manhattan.js` — tokens + overrides, drop `blocks` re-declaration.
- `common/themes/index.js` — `getBlockSpec` merges base + override.
- `common/themes/variants.js` — alias map, `resolveVariant`, new `resolveFont`, `resolveButtonStyle`.
- `components/admin/gallery-builder/DesignPopover.js` — spec-driven Size/Alignment/Font/Button-style sections.
- `components/image-displays/gallery/Gallery.js` — text font+size, photos grid/square branches, testimonial empty state.
- `components/admin/gallery-builder/BlockCard.js` — layout-aware photos empty states.
- `components/image-displays/gallery/video-block/VideoBlock.js` — thumbnail/poster fix.
- `components/admin/platform/PageDesignPopover.js` — drop ghost, default partial.
- `components/image-displays/page/PageCover.js` — hero unification (full/partial centered content).
- `common/assetRefs.js` — cover default partial, ghost→outline migration, `BUTTON_STYLES`.
- `components/contact/ContactDisplay.js` — title alignment + button style.

---

## Phase 1 — Base Theme Registry (foundation)

### Task 1: Create the base registry + merge helper

**Files:**
- Create: `common/themes/base.js`
- Test: `__tests__/themes/base.test.js`

**Interfaces:**
- Produces:
  - `baseBlocks` — object keyed by block type. Each value: `{ defaultVariant?, variants?: [{id,label}], defaultAlign?, aligns?: string[], defaultFont?, fonts?: [{id,label}], defaultButtonStyle?, buttonStyles?: [{id,label}] }`.
  - `baseCover` — `{ defaultHeight: 'partial', heights: [{id,label}], defaultButtonStyle: 'solid', buttonStyles: [{id,label}] }`.
  - `FONT_SLOTS` — `[{id:'serif',label:'Serif'},{id:'display',label:'Display'},{id:'fraunces',label:'Fraunces'},{id:'sans',label:'Sans'},{id:'mono',label:'Mono'}]`.
  - `mergeBlockSpec(baseSpec, override)` → new spec with override applied. Override keys: `defaultVariant`, `defaultAlign`, `defaultFont`, `defaultButtonStyle`, `labels` (`{id: 'New Label'}` applied to `variants`), `hide` (array of variant ids to drop), `add` (array of `{id,label}` appended to `variants`). Unknown/omitted keys leave the base untouched. Returns `null` if `baseSpec` is null.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/themes/base.test.js
import { baseBlocks, baseCover, FONT_SLOTS, mergeBlockSpec } from '@/common/themes/base'

describe('base registry', () => {
  it('photos exposes stacked, masonry, grid, square with stacked default', () => {
    expect(baseBlocks.photos.defaultVariant).toBe('stacked')
    expect(baseBlocks.photos.variants.map(v => v.id)).toEqual(['stacked', 'masonry', 'grid', 'square'])
  })

  it('text exposes the shared font slots and center default align', () => {
    expect(baseBlocks.text.fonts.map(f => f.id)).toEqual(['serif', 'display', 'fraunces', 'sans', 'mono'])
    expect(baseBlocks.text.defaultFont).toBe('serif')
    expect(baseBlocks.text.defaultAlign).toBe('center')
  })

  it('video full-bleed label reads "Full bleed"', () => {
    const fb = baseBlocks.video.variants.find(v => v.id === 'full-bleed')
    expect(fb.label).toBe('Full bleed')
  })

  it('contact exposes aligns + solid/outline button styles and a single standard variant', () => {
    expect(baseBlocks.contact.aligns).toEqual(['left', 'center'])
    expect(baseBlocks.contact.buttonStyles.map(b => b.id)).toEqual(['solid', 'outline'])
    expect(baseBlocks.contact.variants.map(v => v.id)).toEqual(['standard'])
  })

  it('cover defaults to partial height and solid/outline only', () => {
    expect(baseCover.defaultHeight).toBe('partial')
    expect(baseCover.buttonStyles.map(b => b.id)).toEqual(['solid', 'outline'])
  })

  it('mergeBlockSpec applies default, labels, hide, and add', () => {
    const merged = mergeBlockSpec(baseBlocks.photo, {
      defaultVariant: 'centered',
      labels: { 'full-bleed': 'Full width', centered: 'Framed' },
    })
    expect(merged.defaultVariant).toBe('centered')
    expect(merged.variants).toEqual([
      { id: 'full-bleed', label: 'Full width' },
      { id: 'centered', label: 'Framed' },
    ])
    // base is not mutated
    expect(baseBlocks.photo.variants[0].label).toBe('Full bleed')

    const hidden = mergeBlockSpec(baseBlocks.video, { hide: ['side-by-side'] })
    expect(hidden.variants.map(v => v.id)).toEqual(['full-bleed', 'centered'])

    const added = mergeBlockSpec(baseBlocks.photos, { add: [{ id: 'carousel', label: 'Carousel' }] })
    expect(added.variants.map(v => v.id)).toContain('carousel')
  })

  it('FONT_SLOTS is exported for popup consumption', () => {
    expect(FONT_SLOTS.map(f => f.id)).toContain('mono')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- base.test.js`
Expected: FAIL — cannot find module `@/common/themes/base`.

- [ ] **Step 3: Write the base registry**

```js
// common/themes/base.js
// The canonical, theme-agnostic block/variant registry. Themes inherit this
// wholesale and diverge only via `overrides` + `tokens`. Variant ids are stable
// and semantic — shared across every theme. Pure data: safe to import anywhere.

export const FONT_SLOTS = [
  { id: 'serif', label: 'Serif' },
  { id: 'display', label: 'Display' },
  { id: 'fraunces', label: 'Fraunces' },
  { id: 'sans', label: 'Sans' },
  { id: 'mono', label: 'Mono' },
]

export const baseBlocks = {
  photo: {
    defaultVariant: 'full-bleed',
    variants: [
      { id: 'full-bleed', label: 'Full bleed' },
      { id: 'centered', label: 'Centered' },
    ],
  },
  photos: {
    defaultVariant: 'stacked',
    variants: [
      { id: 'stacked', label: 'Stacked' },
      { id: 'masonry', label: 'Masonry' },
      { id: 'grid', label: 'Grid' },
      { id: 'square', label: 'Square' },
    ],
  },
  text: {
    defaultVariant: 'heading',
    variants: [
      { id: 'heading', label: 'L' },
      { id: 'subheading', label: 'M' },
      { id: 'body', label: 'S' },
      { id: 'quote', label: 'Quote' },
    ],
    defaultAlign: 'center',
    aligns: ['left', 'center'],
    defaultFont: 'serif',
    fonts: FONT_SLOTS,
  },
  video: {
    defaultVariant: 'full-bleed',
    variants: [
      { id: 'full-bleed', label: 'Full bleed' },
      { id: 'centered', label: 'Centered' },
      { id: 'side-by-side', label: 'Side by side' },
    ],
  },
  testimonial: {
    defaultVariant: 'photo-above',
    variants: [
      { id: 'photo-above', label: 'Photo above' },
      { id: 'quote-above', label: 'Quote above' },
    ],
  },
  contact: {
    defaultVariant: 'standard',
    variants: [{ id: 'standard', label: 'Standard' }],
    defaultAlign: 'left',
    aligns: ['left', 'center'],
    defaultButtonStyle: 'solid',
    buttonStyles: [
      { id: 'solid', label: 'Solid' },
      { id: 'outline', label: 'Outline' },
    ],
  },
  'page-gallery': {
    defaultVariant: 'list',
    variants: [{ id: 'list', label: 'List' }],
  },
}

// Page cover is not a gallery block — consumed by PageDesignPopover + assetRefs.
export const baseCover = {
  defaultHeight: 'partial',
  heights: [
    { id: 'full', label: 'Full' },
    { id: 'partial', label: 'Partial' },
  ],
  defaultButtonStyle: 'solid',
  buttonStyles: [
    { id: 'solid', label: 'Solid' },
    { id: 'outline', label: 'Outline' },
  ],
}

// Apply a theme override to a base block spec. Never mutates the base.
export function mergeBlockSpec(baseSpec, override) {
  if (!baseSpec) return null
  if (!override) return baseSpec
  const labels = override.labels || {}
  const hide = new Set(override.hide || [])
  let variants = (baseSpec.variants || [])
    .filter((v) => !hide.has(v.id))
    .map((v) => (labels[v.id] ? { ...v, label: labels[v.id] } : { ...v }))
  if (override.add) variants = [...variants, ...override.add]
  return {
    ...baseSpec,
    variants,
    ...(override.defaultVariant ? { defaultVariant: override.defaultVariant } : {}),
    ...(override.defaultAlign ? { defaultAlign: override.defaultAlign } : {}),
    ...(override.defaultFont ? { defaultFont: override.defaultFont } : {}),
    ...(override.defaultButtonStyle ? { defaultButtonStyle: override.defaultButtonStyle } : {}),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- base.test.js`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add common/themes/base.js __tests__/themes/base.test.js
git commit -m "feat(themes): add base block/variant registry + mergeBlockSpec"
```

---

### Task 2: Re-point themes at the base (inheritance)

**Files:**
- Modify: `common/themes/index.js`
- Modify: `common/themes/kyoto.js`
- Modify: `common/themes/manhattan.js`
- Test: `__tests__/themes/getBlockSpec.test.js`

**Interfaces:**
- Consumes: `baseBlocks`, `mergeBlockSpec` (Task 1).
- Produces:
  - `getBlockSpec(themeId, blockType)` returns `mergeBlockSpec(baseBlocks[blockType], theme.overrides?.[blockType])` (or `null` if the block type is unknown).
  - Each theme is `{ id, name, navStyle, tokens, overrides }`; `tokens.fonts` maps font slot id → CSS font-family string.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/themes/getBlockSpec.test.js
import { getBlockSpec } from '@/common/themes'

describe('getBlockSpec merges base + theme overrides', () => {
  it('kyoto photos inherits all four base layouts, stacked default', () => {
    const spec = getBlockSpec('kyoto', 'photos')
    expect(spec.variants.map(v => v.id)).toEqual(['stacked', 'masonry', 'grid', 'square'])
    expect(spec.defaultVariant).toBe('stacked')
  })

  it('manhattan photo renames labels but keeps shared ids', () => {
    const spec = getBlockSpec('manhattan', 'photo')
    expect(spec.variants.map(v => v.id)).toEqual(['full-bleed', 'centered'])
    expect(spec.variants.find(v => v.id === 'full-bleed').label).toBe('Full width')
    expect(spec.variants.find(v => v.id === 'centered').label).toBe('Framed')
  })

  it('manhattan photos defaults to grid via override', () => {
    expect(getBlockSpec('manhattan', 'photos').defaultVariant).toBe('grid')
  })

  it('kyoto exposes font-family tokens for every slot', () => {
    const { kyoto } = require('@/common/themes')
    expect(kyoto.tokens.fonts.serif).toMatch(/Cormorant/)
    expect(kyoto.tokens.fonts.display).toBe('Muse')
    expect(kyoto.tokens.fonts.mono).toMatch(/Geist Mono/)
  })

  it('returns null for an unknown block type', () => {
    expect(getBlockSpec('kyoto', 'nope')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- getBlockSpec.test.js`
Expected: FAIL — kyoto photos has only stacked/masonry (old re-declared blocks); `tokens.fonts` undefined.

- [ ] **Step 3: Rewrite `kyoto.js`**

```js
// common/themes/kyoto.js
// Kyoto — the reference theme: warm, serif, single-column editorial scroll.
// Inherits the full base variant menu; supplies only palette + fonts.
export const kyoto = {
  id: 'kyoto',
  name: 'Kyoto',
  navStyle: 'cover-embedded',
  tokens: {
    '--theme-bg': '#ffffff',
    '--theme-text': '#2c2416',
    '--theme-text-muted': '#7a6b55',
    fonts: {
      serif: '"Cormorant Garamond", Georgia, serif',
      display: 'Muse',
      fraunces: '"Fraunces", Georgia, serif',
      sans: 'Inter, -apple-system, system-ui, sans-serif',
      mono: '"Geist Mono", monospace',
    },
  },
  overrides: {},
}
```

- [ ] **Step 4: Rewrite `manhattan.js`**

```js
// common/themes/manhattan.js
// Manhattan — fixed left rail + gallery-wall grid. Inherits the base menu and
// expresses its personality purely through label/default overrides + tokens.
export const manhattan = {
  id: 'manhattan',
  name: 'Manhattan',
  navStyle: 'left-rail',
  tokens: {
    '--theme-bg': '#fafafa',
    '--theme-text': '#141414',
    '--theme-text-muted': '#6b6b6b',
    '--theme-rail-width': '260px',
    fonts: {
      serif: '"Cormorant Garamond", Georgia, serif',
      display: 'Muse',
      fraunces: '"Fraunces", Georgia, serif',
      sans: 'Inter, -apple-system, system-ui, sans-serif',
      mono: '"Geist Mono", monospace',
    },
  },
  overrides: {
    photo: { labels: { 'full-bleed': 'Full width', centered: 'Framed' } },
    photos: { defaultVariant: 'grid' },
    video: { labels: { 'full-bleed': 'Full width', centered: 'Framed' }, hide: ['side-by-side'] },
    text: { defaultAlign: 'left' },
  },
}
```

- [ ] **Step 5: Update `index.js`**

```js
// common/themes/index.js
// The theme registry. In-repo for now; the marketplace later merges
// validated external themes into THEMES without touching consumers.
import { kyoto } from './kyoto'
import { manhattan } from './manhattan'
import { baseBlocks, mergeBlockSpec } from './base'

export const THEMES = { kyoto, manhattan }
export const THEME_LIST = [kyoto, manhattan]
export const DEFAULT_THEME_ID = 'kyoto'

export function getTheme(id) {
  return THEMES[id] || THEMES[DEFAULT_THEME_ID]
}

export function getBlockSpec(themeId, blockType) {
  const base = baseBlocks[blockType]
  if (!base) return null
  const theme = getTheme(themeId)
  return mergeBlockSpec(base, theme.overrides?.[blockType])
}

export { kyoto, manhattan }
export { baseBlocks, baseCover, FONT_SLOTS, mergeBlockSpec } from './base'
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- getBlockSpec.test.js base.test.js`
Expected: PASS.

- [ ] **Step 7: Guard against regressions in existing theme tests**

Run: `npm test`
Expected: PASS. If `SiteNavLogoFont` or others reference theme internals, confirm still green (they read `getTheme`/nav, not `blocks`).

- [ ] **Step 8: Commit**

```bash
git add common/themes/index.js common/themes/kyoto.js common/themes/manhattan.js __tests__/themes/getBlockSpec.test.js
git commit -m "refactor(themes): inherit variant menus from base via overrides"
```

---

### Task 3: Variant resolution — aliases + font/button-style helpers

**Files:**
- Modify: `common/themes/variants.js`
- Test: `__tests__/themes/variantsResolve.test.js`

**Interfaces:**
- Consumes: `getBlockSpec`, `getTheme` (index), `baseCover` (base).
- Produces:
  - `resolveVariant(block, themeId)` — order: saved themeState id → alias(saved) → legacy(block) → defaultVariant; first valid for the resolved spec.
  - `resolveAlign(block, themeId)` — unchanged behavior (`block.align` else spec.defaultAlign else 'center').
  - `resolveFont(block, themeId)` → CSS font-family string. Reads `block.font` (slot id) → `getTheme(themeId).tokens.fonts[slot]`; falls back to spec.defaultFont's family, then serif.
  - `resolveButtonStyle(block, themeId)` → `block.buttonStyle` if valid for spec.buttonStyles, else spec.defaultButtonStyle, else 'solid'.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/themes/variantsResolve.test.js
import { resolveVariant, resolveFont, resolveButtonStyle } from '@/common/themes/variants'

describe('resolveVariant with shared ids + aliases', () => {
  it('accepts a saved shared id', () => {
    const b = { type: 'photos', themeState: { kyoto: { variant: 'grid' } } }
    expect(resolveVariant(b, 'kyoto')).toBe('grid')
  })
  it('aliases legacy manhattan photo ids to shared ids', () => {
    const b = { type: 'photo', themeState: { manhattan: { variant: 'framed' } } }
    expect(resolveVariant(b, 'manhattan')).toBe('centered')
  })
  it('falls back to default when nothing valid', () => {
    expect(resolveVariant({ type: 'photos' }, 'kyoto')).toBe('stacked')
  })
})

describe('resolveFont', () => {
  it('maps the block font slot to the theme family', () => {
    const b = { type: 'text', font: 'mono' }
    expect(resolveFont(b, 'kyoto')).toMatch(/Geist Mono/)
  })
  it('defaults to serif family when no font set', () => {
    expect(resolveFont({ type: 'text' }, 'kyoto')).toMatch(/Cormorant/)
  })
})

describe('resolveButtonStyle', () => {
  it('accepts a valid style', () => {
    expect(resolveButtonStyle({ type: 'contact', buttonStyle: 'outline' }, 'kyoto')).toBe('outline')
  })
  it('falls back to solid default', () => {
    expect(resolveButtonStyle({ type: 'contact' }, 'kyoto')).toBe('solid')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- variantsResolve.test.js`
Expected: FAIL — `resolveFont`/`resolveButtonStyle` not exported; `framed` alias not mapped.

- [ ] **Step 3: Update `variants.js`**

```js
// common/themes/variants.js
import { getBlockSpec, getTheme } from './index'

// Legacy → shared id mapping for pre-themeState configs (old numeric variants).
const LEGACY = {
  photo: (b) => (b.layout === 'Centered' || b.variant === 2 ? 'centered' : 'full-bleed'),
  photos: (b) => (b.layout === 'masonry' ? 'masonry' : 'stacked'),
  text: (b) => ({ 1: 'heading', 2: 'subheading', 3: 'body', 4: 'quote' }[b.variant || 1] || 'heading'),
  video: (b) => (b.layout === 'Centered' ? 'centered' : { 1: 'full-bleed', 2: 'centered', 3: 'side-by-side' }[b.variant || 1] || 'full-bleed'),
  testimonial: (b) => (b.variant === 2 ? 'quote-above' : 'photo-above'),
}

// Old theme-local ids (Manhattan) → shared base ids, for saved themeState values.
const ALIASES = {
  photo: { 'full-width': 'full-bleed', framed: 'centered' },
  video: { 'full-width': 'full-bleed', framed: 'centered' },
}

export function resolveVariant(block, themeId) {
  const spec = getBlockSpec(themeId, block.type)
  if (!spec) return undefined
  const validIds = spec.variants.map((v) => v.id)

  const saved = block.themeState?.[themeId]?.variant
  if (saved && validIds.includes(saved)) return saved

  const aliased = saved && ALIASES[block.type]?.[saved]
  if (aliased && validIds.includes(aliased)) return aliased

  const legacy = LEGACY[block.type]?.(block)
  if (legacy && validIds.includes(legacy)) return legacy

  return spec.defaultVariant
}

export function setVariant(block, themeId, variantId) {
  return {
    ...block,
    themeState: {
      ...(block.themeState || {}),
      [themeId]: { ...(block.themeState?.[themeId] || {}), variant: variantId },
    },
  }
}

export function resolveAlign(block, themeId) {
  if (block.align) return block.align
  const spec = getBlockSpec(themeId, block.type)
  return spec?.defaultAlign || 'center'
}

export function resolveFont(block, themeId) {
  const fonts = getTheme(themeId).tokens?.fonts || {}
  const spec = getBlockSpec(themeId, block.type)
  const slot = block.font || spec?.defaultFont || 'serif'
  return fonts[slot] || fonts.serif || '"Cormorant Garamond", Georgia, serif'
}

export function resolveButtonStyle(block, themeId) {
  const spec = getBlockSpec(themeId, block.type)
  const valid = (spec?.buttonStyles || []).map((b) => b.id)
  if (block.buttonStyle && valid.includes(block.buttonStyle)) return block.buttonStyle
  return spec?.defaultButtonStyle || 'solid'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- variantsResolve.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/themes/variants.js __tests__/themes/variantsResolve.test.js
git commit -m "feat(themes): alias legacy ids + add resolveFont/resolveButtonStyle"
```

---

### Task 4: Theme contract docs

**Files:**
- Create: `common/themes/README.md`

- [ ] **Step 1: Write the docs**

```markdown
# Themes

A theme is **data, not code**. The base registry (`base.js`) owns every variant
menu, layout renderer, empty state, alignment, font slot, and button style. A
theme supplies a palette + fonts + a few taste choices, and inherits the rest.

## Shape

```js
export const santorini = {
  id: 'santorini',          // unique, url-safe
  name: 'Santorini',
  navStyle: 'left-rail',    // 'cover-embedded' | 'left-rail' | ...
  tokens: {
    '--theme-bg': '#fff',
    '--theme-text': '#111',
    '--theme-text-muted': '#666',
    fonts: {                // font slot id -> CSS font-family
      serif: '"Cormorant Garamond", Georgia, serif',
      display: 'Muse',
      fraunces: '"Fraunces", Georgia, serif',
      sans: 'Inter, system-ui, sans-serif',
      mono: '"Geist Mono", monospace',
    },
  },
  overrides: {},            // optional; omit and everything still works
}
```

Register it in `index.js` (`THEMES` + `THEME_LIST`). That's it — the theme now
has photo/photos (stacked/masonry/grid/square)/text/video/testimonial/contact
popups, cover full/partial, and solid/outline buttons, all inherited.

## Override grammar (all optional, per block type)

| Key | Effect |
|-----|--------|
| `defaultVariant` | change the default layout/size |
| `defaultAlign` / `defaultFont` / `defaultButtonStyle` | change other defaults |
| `labels: { id: 'New Label' }` | rename a variant's label (id stays shared) |
| `hide: [ids]` | remove variants from this theme's menu |
| `add: [{ id, label }]` | append a theme-only variant (needs render support) |

**Never** re-declare the variant menu in a theme. Change the base to add a
variant everywhere; use overrides to diverge locally. Selections are stored per
theme in `block.themeState[themeId].variant`, so switching themes is lossless.

**Out of scope today:** dynamic loading of third-party theme packages. This
contract is exactly what such a loader would consume later.
```

- [ ] **Step 2: Commit**

```bash
git add common/themes/README.md
git commit -m "docs(themes): document the theme contract + override grammar"
```

---

## Phase 2 — Design Popup Generalization

### Task 5: Spec-driven DesignPopover (Size + Alignment + Font + Button style)

**Files:**
- Modify: `components/admin/gallery-builder/DesignPopover.js`
- Test: `__tests__/components/DesignPopover.test.js`

**Interfaces:**
- Consumes: `getBlockSpec`, `resolveVariant`, `setVariant`, `resolveAlign`, `resolveButtonStyle`.
- Note: the Font control operates on the **slot id** (`block.font`), NOT the resolved family — so it reads `block.font || spec.defaultFont` directly and does not call `resolveFont` (that helper returns a font-family string, used only by the renderer).
- Produces: a popup that renders sections only when the spec provides them: **Size/Layout** (when `variants.length > 1`), **Font** (when `spec.fonts`), **Alignment** (when `spec.aligns`), **Button style** (when `spec.buttonStyles`). Updates `block.themeState` (variant), `block.font`, `block.align`, `block.buttonStyle` respectively.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/components/DesignPopover.test.js
import { render, screen } from '@testing-library/react'
import DesignPopover from '@/components/admin/gallery-builder/DesignPopover'

// PopoverShell renders into the DOM; anchorEl can be null for the test.
function setup(block, onUpdate = () => {}) {
  return render(<DesignPopover block={block} themeId="kyoto" onUpdate={onUpdate} onClose={() => {}} anchorEl={null} />)
}

describe('DesignPopover sections are spec-driven', () => {
  it('text shows Size, Font, and Alignment', () => {
    setup({ type: 'text', content: 'hi' })
    expect(screen.getByText('Size')).toBeInTheDocument()
    expect(screen.getByText('Font')).toBeInTheDocument()
    expect(screen.getByText('Alignment')).toBeInTheDocument()
  })

  it('contact shows Alignment + Button style but no Size', () => {
    setup({ type: 'contact' })
    expect(screen.queryByText('Size')).not.toBeInTheDocument()
    expect(screen.getByText('Alignment')).toBeInTheDocument()
    expect(screen.getByText('Button style')).toBeInTheDocument()
  })

  it('photos shows a Layout section with four options', () => {
    setup({ type: 'photos' })
    expect(screen.getByText('Layout')).toBeInTheDocument()
    expect(screen.getByText('Grid')).toBeInTheDocument()
    expect(screen.getByText('Square')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- DesignPopover.test.js`
Expected: FAIL — no Font/Button style sections; contact popup returns null.

- [ ] **Step 3: Rewrite `DesignPopover.js`**

```js
// components/admin/gallery-builder/DesignPopover.js
import PopoverShell from '../platform/PopoverShell'
import { DesignSection, PillToggle } from '../platform/designControls'
import { getBlockSpec } from '../../../common/themes'
import { setVariant, resolveVariant, resolveAlign, resolveButtonStyle } from '../../../common/themes/variants'

const IconAlignLeft = () => (
  <svg width="14" height="10" viewBox="0 0 14 10" fill="none" style={{ display: 'block', margin: '0 auto' }}>
    <rect x="0" y="0" width="14" height="2" rx="1" fill="currentColor"/>
    <rect x="0" y="4" width="9" height="2" rx="1" fill="currentColor"/>
    <rect x="0" y="8" width="11" height="2" rx="1" fill="currentColor"/>
  </svg>
)
const IconAlignCenter = () => (
  <svg width="14" height="10" viewBox="0 0 14 10" fill="none" style={{ display: 'block', margin: '0 auto' }}>
    <rect x="0" y="0" width="14" height="2" rx="1" fill="currentColor"/>
    <rect x="2.5" y="4" width="9" height="2" rx="1" fill="currentColor"/>
    <rect x="1" y="8" width="12" height="2" rx="1" fill="currentColor"/>
  </svg>
)
const ALIGN_LABELS = { left: <IconAlignLeft />, center: <IconAlignCenter /> }

export default function DesignPopover({ block, themeId = 'kyoto', onUpdate, onClose, anchorEl }) {
  const spec = getBlockSpec(themeId, block.type)
  if (!spec) return null

  const variants = (spec.variants || []).map(v => ({ value: v.id, label: v.label }))
  const fonts = spec.fonts ? spec.fonts.map(f => ({ value: f.id, label: f.label })) : null
  const aligns = spec.aligns ? spec.aligns.map(a => ({ value: a, label: ALIGN_LABELS[a] || a })) : null
  const buttonStyles = spec.buttonStyles ? spec.buttonStyles.map(b => ({ value: b.id, label: b.label })) : null

  const hasSize = variants.length > 1
  if (!hasSize && !fonts && !aligns && !buttonStyles) return null

  const currentFont = block.font || spec.defaultFont

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width="max-content" maxWidth="calc(100vw - 24px)" title="Design">
      {hasSize && (
        <DesignSection label={block.type === 'text' ? 'Size' : 'Layout'}>
          <PillToggle value={resolveVariant(block, themeId)} onChange={(v) => onUpdate(setVariant(block, themeId, v))} options={variants} />
        </DesignSection>
      )}
      {fonts && (
        <DesignSection label="Font">
          <PillToggle value={currentFont} onChange={(v) => onUpdate({ ...block, font: v })} options={fonts} />
        </DesignSection>
      )}
      {aligns && (
        <DesignSection label="Alignment">
          <PillToggle value={resolveAlign(block, themeId)} onChange={(v) => onUpdate({ ...block, align: v })} options={aligns} />
        </DesignSection>
      )}
      {buttonStyles && (
        <DesignSection label="Button style">
          <PillToggle value={resolveButtonStyle(block, themeId)} onChange={(v) => onUpdate({ ...block, buttonStyle: v })} options={buttonStyles} />
        </DesignSection>
      )}
    </PopoverShell>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- DesignPopover.test.js`
Expected: PASS.

- [ ] **Step 5: Manual check**

Run the dev server (already on port 3000). In the editor, open a **text** block's design brush → confirm Size + Font + Alignment; open a **contact** block → confirm Alignment + Button style. Confirm no console errors.

- [ ] **Step 6: Commit**

```bash
git add components/admin/gallery-builder/DesignPopover.js __tests__/components/DesignPopover.test.js
git commit -m "feat(design-popup): spec-driven Size/Font/Alignment/Button-style sections"
```

---

## Phase 3 — Hero (Page Cover)

### Task 6: Cover normalization — partial default, drop ghost

**Files:**
- Modify: `common/assetRefs.js` (cover block, ~lines 234-256; `BUTTON_STYLES` constant)
- Test: `__tests__/themes/coverNormalize.test.js` (adjust path/import to the exported normalizer)

**Interfaces:**
- Consumes: `baseCover` (base).
- Produces: normalized `cover.height` defaults to `'partial'`; `cover.buttonStyle` restricted to `['solid','outline']` with `'ghost'` migrated to `'outline'`; default `'solid'`.

- [ ] **Step 1: Locate the normalizer + BUTTON_STYLES**

Run: `grep -n "BUTTON_STYLES\|export function\|export const" common/assetRefs.js | head -30`
Confirm the exported function that returns the normalized page/cover (the block around line 250 that builds `cover = { imageUrl, height, ... }`). Note its export name for the test import.

- [ ] **Step 2: Write the failing test**

```js
// __tests__/themes/coverNormalize.test.js
// Import the actual exported page/cover normalizer from assetRefs (name found in Step 1).
import { normalizePageAssets } from '@/common/assetRefs' // <-- replace with the real export name

describe('cover normalization', () => {
  it('defaults height to partial', () => {
    const out = normalizePageAssets({ cover: { imageUrl: 'x.jpg' } })
    expect(out.cover.height).toBe('partial')
  })
  it('migrates ghost button style to outline', () => {
    const out = normalizePageAssets({ cover: { imageUrl: 'x.jpg', buttonStyle: 'ghost' } })
    expect(out.cover.buttonStyle).toBe('outline')
  })
  it('keeps solid/outline as-is and defaults unknown to solid', () => {
    expect(normalizePageAssets({ cover: { imageUrl: 'x.jpg', buttonStyle: 'outline' } }).cover.buttonStyle).toBe('outline')
    expect(normalizePageAssets({ cover: { imageUrl: 'x.jpg', buttonStyle: 'weird' } }).cover.buttonStyle).toBe('solid')
  })
})
```

If the exported shape differs (e.g. the normalizer is named differently or takes a full config), adapt the test call to match what Step 1 found — but keep the three assertions.

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- coverNormalize.test.js`
Expected: FAIL — height defaults to `full`; `ghost` passes through.

- [ ] **Step 4: Edit `common/assetRefs.js`**

Change the `BUTTON_STYLES` constant to `['solid', 'outline']`. In the cover normalization block, replace the height + buttonStyle lines:

```js
// height: default to 'partial' now (was 'full')
height: cover.height === 'full' ? 'full' : 'partial',
```

```js
// buttonStyle: migrate ghost -> outline, restrict to solid/outline
const rawStyle = cover.buttonStyle === 'ghost' ? 'outline' : cover.buttonStyle
const buttonStyle = BUTTON_STYLES.includes(rawStyle) ? rawStyle : 'solid'
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- coverNormalize.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add common/assetRefs.js __tests__/themes/coverNormalize.test.js
git commit -m "feat(cover): default height partial, migrate ghost button to outline"
```

---

### Task 7: Page design popup — drop ghost, default partial

**Files:**
- Modify: `components/admin/platform/PageDesignPopover.js`

- [ ] **Step 1: Edit the popup**

Change the default cover object `height: 'full'` → `height: 'partial'`. In the Button style `PillToggle`, remove the `ghost` option so only `solid` + `outline` remain:

```js
const cover = page.cover || { imageUrl: '', height: 'partial', overlayText: '', variant: 'showcase', buttonStyle: 'solid' }
```

```js
options={[
  { value: 'solid',   label: 'Solid'   },
  { value: 'outline', label: 'Outline' },
]}
```

And default the toggle read to partial: `value={cover.height || 'partial'}`.

- [ ] **Step 2: Manual check**

On port 3000, open a page's design popup → Cover height defaults to Partial; Button style shows only Solid/Outline. No console errors.

- [ ] **Step 3: Commit**

```bash
git add components/admin/platform/PageDesignPopover.js
git commit -m "feat(page-design): partial default, solid/outline only"
```

---

### Task 8: Hero unification — Full vs Partial actually differ

**Files:**
- Modify: `components/image-displays/page/PageCover.js`
- Read for context: `components/image-displays/gallery/gallery-cover/GalleryCover.js`, `components/admin/platform/PagePreview.js`, `pages/sites/[username]/[slug].js`, `pages/sites/[username]/index.js`

**Goal:** In **Full**, the hero fills the viewport (100vh) with title, description, nav links, and the music-show (slideshow) button vertically + horizontally centered, **action buttons centered**. In **Partial**, the same content in a shorter band (~60vh). Both must be identical in the editor preview and the published page. Today the height toggle only stretches the background image because the hero *content* is rendered by `GalleryCover` below the image (`PageCover` renders content only in `variant === 'cover'`).

**Decision (from spec §3.1):** make `PageCover` own the centered hero content when a cover image exists, driven by `cover.height`, and pass through nav links + slideshow. The Gallery's `GalleryCover` continues to handle the no-cover-image (header-dropdown) case unchanged.

- [ ] **Step 1: Confirm the content sources**

Run: `grep -n "GalleryCover\|childPages\|slideshow\|View Music Show\|onSlideshowClick" components/image-displays/gallery/gallery-cover/GalleryCover.js`
Note the props GalleryCover uses for nav links (`childPages`) and the music-show action label/handler, so PageCover renders the same affordances.

- [ ] **Step 2: Rewrite `PageCover.js` to center content at the chosen height**

```js
// components/image-displays/page/PageCover.js
import { getSizedUrl } from '../../../common/imageUtils'

const BUTTON_STYLE_MAP = {
  solid: 'bg-white text-stone-900 hover:bg-stone-100',
  outline: 'border border-white text-white hover:bg-white/10',
}

function CtaButton({ label, href, style }) {
  if (!label) return null
  const isExternal = href?.startsWith('http')
  return (
    <a
      href={href || '#'}
      className={`inline-flex items-center px-5 py-2.5 text-sm font-medium transition-colors ${BUTTON_STYLE_MAP[style] || BUTTON_STYLE_MAP.solid}`}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {label}
    </a>
  )
}

export default function PageCover({ cover, title, description, slideshowHref, clientFeaturesEnabled, primaryButton, navLinks = [] }) {
  if (!cover || !cover.imageUrl) return null
  const isFull = cover.height !== 'partial'          // partial is the new default
  const heightClass = isFull ? 'h-screen' : 'h-[60vh]'
  const buttonStyle = cover.buttonStyle === 'outline' ? 'outline' : 'solid'

  const buttons = []
  if (primaryButton?.label) buttons.push(primaryButton)
  if (slideshowHref) buttons.push({ label: 'View Music Show', href: slideshowHref })
  if (clientFeaturesEnabled) buttons.push({ label: 'Client Login', href: '#client-login' })

  return (
    <section className={`relative w-full ${heightClass} overflow-hidden`}>
      <img
        src={getSizedUrl(cover.imageUrl, 'large') || cover.imageUrl}
        alt={cover.overlayText || title || ''}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white px-6">
        {title && <h2 className="text-4xl md:text-6xl font-light tracking-tight mb-3">{title}</h2>}
        {description && <p className="text-base md:text-lg text-white/80 max-w-xl mb-6">{description}</p>}
        {navLinks.length > 0 && (
          <nav className="flex flex-wrap items-center justify-center gap-6 mb-8">
            {navLinks.map((l, i) => (
              <a key={i} href={l.href} className="text-sm text-white/90 hover:text-white transition-colors">{l.label}</a>
            ))}
          </nav>
        )}
        {buttons.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {buttons.map((btn, i) => <CtaButton key={i} label={btn.label} href={btn.href} style={buttonStyle} />)}
          </div>
        )}
      </div>
    </section>
  )
}
```

Note: this drops the old `variant === 'cover'`-gated rendering — the cover now always shows centered content over the image. If a caller relies on `variant: 'showcase'` to hide all overlay text, confirm during Step 3 whether any page intends an image-only hero; if so, gate the inner content `div` on `cover.variant !== 'showcase'` but keep the height driven by `cover.height` regardless.

- [ ] **Step 3: Pass `navLinks` from the page routes (if available)**

In `pages/sites/[username]/[slug].js` and `pages/sites/[username]/index.js` where `<PageCover .../>` is rendered, pass the sub-nav pages as `navLinks` (map `subNavPages`/`childPages` already in scope to `{ label, href }`). If no such list exists in scope, omit — `navLinks` defaults to `[]`. Do the same in `PagePreview.js` so the editor preview matches. Only wire what's already available; do not fetch new data.

- [ ] **Step 4: Prevent duplicate hero content**

Since `PageCover` now renders title/description when a cover image exists, confirm `GalleryCover` (rendered by `Gallery` just below) does not also render the same title/description on cover-image pages, causing duplication. Read `Gallery.js:126` — `GalleryCover` receives `showChildNav` and renders name/description. If duplication occurs on a cover-image page, pass a flag from the route (e.g. `hasCover`) so `Gallery`/`GalleryCover` suppresses its name/description when `PageCover` is present. Verify visually in Step 5.

- [ ] **Step 5: Manual verification (port 3000)**

Load a page with a cover image in the editor preview and on the published route. Toggle Full vs Partial:
- Full = viewport-height hero, content vertically centered, buttons centered.
- Partial = ~60vh band, same centered content.
- Outline button renders as bordered/transparent; Solid as white.
- No duplicate title/description below the hero.

- [ ] **Step 6: Commit**

```bash
git add components/image-displays/page/PageCover.js pages/sites/[username]/[slug].js pages/sites/[username]/index.js components/admin/platform/PagePreview.js
git commit -m "feat(hero): full/partial cover with centered content, links, music-show; outline buttons"
```

---

## Phase 4 — Photos: grid + square + layout-aware empty states

### Task 9: Grid layout (justified equal-height rows)

**Files:**
- Create: `components/image-displays/gallery/grid-gallery/GridGallery.js`
- Modify: `components/image-displays/gallery/Gallery.js` (photos + stacked/masonry dispatch, ~lines 136-179)
- Test: `__tests__/components/GridGallery.test.js`

**Interfaces:**
- Consumes: image refs array (same shape passed to `MasonryGallery`/`StackedGallery`: each has a URL + optional width/height/aspect). `resolveVariant` returns `'grid'`.
- Produces: `GridGallery({ images, onImageClick })` — renders rows where every image in a row shares one height; row width fills the container; per-image flex-basis is proportional to aspect ratio so verticals take less width.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/components/GridGallery.test.js
import { render } from '@testing-library/react'
import GridGallery from '@/components/image-displays/gallery/grid-gallery/GridGallery'

const imgs = [
  { url: 'a.jpg', width: 1600, height: 1067 },
  { url: 'b.jpg', width: 1067, height: 1600 },
  { url: 'c.jpg', width: 1600, height: 1067 },
]

describe('GridGallery', () => {
  it('renders one img per image', () => {
    const { container } = render(<GridGallery images={imgs} onImageClick={() => {}} />)
    expect(container.querySelectorAll('img').length).toBe(3)
  })
  it('gives the portrait image a smaller flex-grow than a landscape one', () => {
    const { container } = render(<GridGallery images={imgs} onImageClick={() => {}} />)
    const items = container.querySelectorAll('[data-grid-item]')
    const grow = (el) => parseFloat(el.style.flexGrow || '0')
    expect(grow(items[0])).toBeGreaterThan(grow(items[1])) // landscape > portrait
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- GridGallery.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `GridGallery.js`**

```js
// components/image-displays/gallery/grid-gallery/GridGallery.js
// Justified rows: flexbox rows where each item's flex-grow is its aspect ratio,
// so a row of items settles to a common height and portraits take less width.
import { getImageRefUrl } from '../../../../common/assetRefs'
import { getSizedUrl } from '../../../../common/imageUtils'

function aspect(img) {
  const w = img.width || img.w
  const h = img.height || img.h
  if (w && h) return w / h
  return 1.5 // sensible landscape default when dimensions are unknown
}

export default function GridGallery({ images = [], onImageClick }) {
  return (
    <div className="flex flex-wrap gap-3">
      {images.map((img, i) => {
        const ar = aspect(img)
        const url = getImageRefUrl(img) || img.url
        return (
          <div
            key={i}
            data-grid-item
            style={{ flexGrow: ar, flexBasis: `${ar * 220}px`, height: 0 }}
            className="relative"
          >
            <div style={{ paddingBottom: `${100 / ar}%` }} />
            <img
              src={getSizedUrl(url, 'medium') || url}
              alt=""
              onClick={() => onImageClick?.(i)}
              className="absolute inset-0 w-full h-full object-cover rounded-2xl shadow cursor-pointer"
            />
          </div>
        )
      })}
    </div>
  )
}
```

Note on `getImageRefUrl` import: confirm the exact export path from `common/assetRefs` (used already in `Gallery.js`). If image refs are already URL-resolved before reaching the component, drop the helper and use `img.url` directly.

- [ ] **Step 4: Wire it into `Gallery.js` photos dispatch**

In the `photos`/`stacked`/`masonry` case (~line 137), add a `grid` branch before the masonry/stacked choice:

```js
const variantId = resolveVariant(block, themeId)
if (variantId === 'grid') {
  return (
    <div key={`block-${index}`} className="photos-grid-block" data-block-index={index} {...hoverProps}>
      <GridGallery images={imageRefs} onImageClick={makeClickHandler(index)} />
    </div>
  )
}
```

Add the import at the top of `Gallery.js`: `import GridGallery from "./grid-gallery/GridGallery";`. Remove the now-redundant special-case `themeId === 'manhattan' && ... === 'grid'` block (line ~141) so grid is theme-agnostic.

- [ ] **Step 5: Run tests + manual check**

Run: `npm test -- GridGallery.test.js`
Expected: PASS. Then on port 3000, set a photos block to **Grid** and confirm justified rows with portraits narrower than landscapes.

- [ ] **Step 6: Commit**

```bash
git add components/image-displays/gallery/grid-gallery/GridGallery.js components/image-displays/gallery/Gallery.js __tests__/components/GridGallery.test.js
git commit -m "feat(photos): add justified grid layout"
```

---

### Task 10: Square layout (uniform hard-cropped squares)

**Files:**
- Create: `components/image-displays/gallery/square-gallery/SquareGallery.js`
- Modify: `components/image-displays/gallery/Gallery.js` (photos dispatch)
- Test: `__tests__/components/SquareGallery.test.js`

**Interfaces:**
- Consumes: same image refs. `resolveVariant` returns `'square'`.
- Produces: `SquareGallery({ images, onImageClick })` — responsive square grid (`aspect-square`, `object-cover` centered).

- [ ] **Step 1: Write the failing test**

```js
// __tests__/components/SquareGallery.test.js
import { render } from '@testing-library/react'
import SquareGallery from '@/components/image-displays/gallery/square-gallery/SquareGallery'

const imgs = [{ url: 'a.jpg' }, { url: 'b.jpg' }, { url: 'c.jpg' }, { url: 'd.jpg' }]

describe('SquareGallery', () => {
  it('renders every image cropped to a square', () => {
    const { container } = render(<SquareGallery images={imgs} onImageClick={() => {}} />)
    const cells = container.querySelectorAll('[data-square-item]')
    expect(cells.length).toBe(4)
    cells.forEach((c) => expect(c.className).toMatch(/aspect-square/))
    container.querySelectorAll('img').forEach((im) => expect(im.className).toMatch(/object-cover/))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- SquareGallery.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `SquareGallery.js`**

```js
// components/image-displays/gallery/square-gallery/SquareGallery.js
import { getImageRefUrl } from '../../../../common/assetRefs'
import { getSizedUrl } from '../../../../common/imageUtils'

export default function SquareGallery({ images = [], onImageClick }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {images.map((img, i) => {
        const url = getImageRefUrl(img) || img.url
        return (
          <div key={i} data-square-item className="relative aspect-square">
            <img
              src={getSizedUrl(url, 'medium') || url}
              alt=""
              onClick={() => onImageClick?.(i)}
              className="absolute inset-0 w-full h-full object-cover object-center rounded-2xl shadow cursor-pointer"
            />
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Wire into `Gallery.js`**

Add import `import SquareGallery from "./square-gallery/SquareGallery";` and a branch alongside grid:

```js
if (variantId === 'square') {
  return (
    <div key={`block-${index}`} className="photos-square-block" data-block-index={index} {...hoverProps}>
      <SquareGallery images={imageRefs} onImageClick={makeClickHandler(index)} />
    </div>
  )
}
```

- [ ] **Step 5: Run tests + manual check**

Run: `npm test -- SquareGallery.test.js`
Expected: PASS. On port 3000, set a photos block to **Square** → uniform squares, verticals center-cropped.

- [ ] **Step 6: Commit**

```bash
git add components/image-displays/gallery/square-gallery/SquareGallery.js components/image-displays/gallery/Gallery.js __tests__/components/SquareGallery.test.js
git commit -m "feat(photos): add square (hard-cropped uniform) layout"
```

---

### Task 11: Layout-aware photos empty states (editor)

**Files:**
- Modify: `components/admin/gallery-builder/BlockCard.js` (empty photos placeholder, ~lines 789-922)
- Read for context: how BlockCard resolves the current variant (`resolveVariant`, `themeId` prop)

**Goal:** When a photos block is empty, the placeholder boxes preview the *selected* layout and update live when the design option changes:
- `stacked` → one centered horizontal box, then two vertical boxes side-by-side beneath.
- `masonry` → six mixed-aspect masonry boxes.
- `grid` → equal-height row(s) with varied widths.
- `square` → uniform square boxes.

- [ ] **Step 1: Read the current empty-state block**

Run: `sed -n '780,925p' components/admin/gallery-builder/BlockCard.js`
Identify the empty photos placeholder JSX and confirm `resolveVariant(block, themeId)` is available in scope (import if needed from `../../../common/themes/variants`).

- [ ] **Step 2: Add a variant-driven placeholder renderer**

Replace the single fixed 3×3 placeholder with a switch on the resolved variant. Use the existing sepia palette (`#e8dfcd` container, tile colors like `#c4a987`/`#a08a68`). Example structure (adapt class names/colors to the surrounding code):

```jsx
const layout = resolveVariant(block, themeId) // 'stacked' | 'masonry' | 'grid' | 'square'
const Tile = ({ style }) => (
  <div style={{ background: '#d8c6a8', borderRadius: 6, ...style }} />
)

function PhotosPlaceholder() {
  if (layout === 'stacked') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#e8dfcd', padding: 12, borderRadius: 8 }}>
        <Tile style={{ height: 120 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <Tile style={{ flex: 1, height: 160 }} />
          <Tile style={{ flex: 1, height: 160 }} />
        </div>
      </div>
    )
  }
  if (layout === 'square') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, background: '#e8dfcd', padding: 12, borderRadius: 8 }}>
        {Array.from({ length: 6 }).map((_, i) => <Tile key={i} style={{ aspectRatio: '1 / 1' }} />)}
      </div>
    )
  }
  if (layout === 'grid') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, background: '#e8dfcd', padding: 12, borderRadius: 8 }}>
        {[1.6, 0.7, 1.2, 1.0, 1.5, 0.8].map((ar, i) => (
          <Tile key={i} style={{ flexGrow: ar, flexBasis: `${ar * 90}px`, height: 110 }} />
        ))}
      </div>
    )
  }
  // masonry (also the new-block default look)
  return (
    <div style={{ columnCount: 3, columnGap: 10, background: '#e8dfcd', padding: 12, borderRadius: 8 }}>
      {[110, 150, 90, 140, 100, 130].map((h, i) => (
        <Tile key={i} style={{ height: h, marginBottom: 10, breakInside: 'avoid' }} />
      ))}
    </div>
  )
}
```

Render `<PhotosPlaceholder />` where the old fixed grid was. Keep any existing hover/opacity affordances.

- [ ] **Step 3: Manual verification (port 3000)**

Add a new empty photos block. Open its design brush and switch Stacked → Masonry → Grid → Square; the placeholder must redraw to match each layout live. Confirm no console errors.

- [ ] **Step 4: Commit**

```bash
git add components/admin/gallery-builder/BlockCard.js
git commit -m "feat(editor): photos empty state previews the selected layout"
```

---

## Phase 5 — Text

### Task 12: Text font application + resized Large

**Files:**
- Modify: `components/image-displays/gallery/Gallery.js` (text case, ~lines 182-203)
- Test: `__tests__/components/GalleryText.test.js`

**Interfaces:**
- Consumes: `resolveFont(block, themeId)` (Task 3).
- Produces: text block renders with `style={{ fontFamily: resolveFont(...) }}`; Large (`heading`) size reduced with looser line-height.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/components/GalleryText.test.js
import { render } from '@testing-library/react'
import Gallery from '@/components/image-displays/gallery/Gallery'

function renderText(block) {
  const { container } = render(<Gallery name="" description="" blocks={[block]} pages={[]} themeId="kyoto" />)
  return container.querySelector('.text-block')
}

describe('text block font', () => {
  it('applies the mono family when font=mono', () => {
    const el = renderText({ type: 'text', content: 'Hello', font: 'mono', themeState: { kyoto: { variant: 'body' } } })
    expect(el.style.fontFamily).toMatch(/Geist Mono/)
  })
  it('defaults to the serif family', () => {
    const el = renderText({ type: 'text', content: 'Hello', themeState: { kyoto: { variant: 'body' } } })
    expect(el.style.fontFamily).toMatch(/Cormorant/)
  })
})
```

If `Gallery` requires extra props to render (e.g. it throws without `siteConfig`), pass minimal stubs so a lone text block renders — mirror how `GalleryPreviewReposition.test.js` sets Gallery up.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- GalleryText.test.js`
Expected: FAIL — no inline fontFamily on `.text-block`.

- [ ] **Step 3: Edit the text case in `Gallery.js`**

Import `resolveFont` (extend the existing `import { resolveVariant, resolveAlign } from "..."` to include `resolveFont`). Reduce the Large (variant 1) size + line-height and apply the font family inline. Replace the `variantClass` for `v===1` and add the style:

```js
const fontFamily = resolveFont(block, themeId)
const variantClass =
  v === 4 ? `text-lg md:text-xl italic text-stone-600 leading-relaxed ${alignClass} max-w-2xl mx-auto px-8 py-6 border-l-2 border-stone-300`
  : v === 3 ? `text-base md:text-lg text-stone-700 leading-relaxed ${alignClass} max-w-2xl mx-auto px-8 py-4`
  : v === 2 ? `text-xl md:text-2xl font-medium text-stone-700 ${alignClass} max-w-2xl mx-auto py-6`
  : `text-3xl md:text-4xl font-light leading-snug text-stone-800 ${alignClass} max-w-3xl mx-auto py-10`; // Large: smaller + looser
```

```jsx
<div
  key={`block-${index}`}
  className={`text-block ${variantClass}`}
  style={{ fontFamily }}
  data-block-index={index}
  {...hoverProps}
>
  {block.content}
</div>
```

Note: `font-serif` classes are removed from the variant strings because the inline `fontFamily` now controls the face (default slot `serif` = Cormorant, so the default look is unchanged).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- GalleryText.test.js`
Expected: PASS.

- [ ] **Step 5: Manual verification (port 3000)**

Add a text block; switch Font across Serif/Display/Fraunces/Sans/Mono and confirm the face changes; confirm Large is visibly smaller with more breathing room than before.

- [ ] **Step 6: Commit**

```bash
git add components/image-displays/gallery/Gallery.js __tests__/components/GalleryText.test.js
git commit -m "feat(text): font option + resized large heading"
```

---

## Phase 6 — Video

### Task 13: Video thumbnail/poster fix + confirm "Full bleed" label

**Files:**
- Modify: `components/image-displays/gallery/video-block/VideoBlock.js`
- Read for context: installed `react-player` version (`node -p "require('react-player/package.json').version"`)

**Goal:** A poster/thumbnail frame must appear before playback (both editor preview and published), while preserving muted scroll-autoplay. Follow systematic-debugging: reproduce → root cause → fix.

- [ ] **Step 1: Reproduce**

On port 3000, add a video block with a known YouTube URL (e.g. `https://www.youtube.com/watch?v=dQw4w9WgXcQ`). Observe: before the block scrolls into view (or in a small preview), is the area blank/black instead of showing a thumbnail? Note behavior in editor vs published.

- [ ] **Step 2: Root-cause**

Check the `react-player` version and whether the iframe renders at all before `playing` becomes true. Common causes: (a) player only mounts/shows a frame once `playing`; (b) container has `pb-[56.25%]` with an absolutely-positioned player that has no poster; (c) version API differences. Confirm which applies before editing.

- [ ] **Step 3: Apply the fix — poster fallback that preserves autoplay**

Add a lightweight poster derived from the video URL (YouTube/Vimeo thumbnail) shown until the player is visible, so something always displays. Add a helper + overlay:

```js
function posterUrl(url) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/)
  if (yt) return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`
  return null
}
```

In render, inside the video wrapper (before/behind `<ReactPlayer>`), when not yet visible show the poster:

```jsx
{!isVisible && posterUrl(cleanUrl) && (
  <img src={posterUrl(cleanUrl)} alt="" className="absolute top-0 left-0 w-full h-full object-cover" />
)}
```

If Step 2 shows the real root cause is different (e.g. the player never mounts), fix that instead and keep the poster as a graceful fallback for non-YouTube URLs. Do not set react-player `light` mode (it breaks muted scroll-autoplay).

- [ ] **Step 4: Confirm the "Full bleed" label**

The label change lives in `base.js` (Task 1: video `full-bleed` → "Full bleed"). Open a video block's design popup on port 3000 and confirm the first option reads **Full bleed** (not "Edge to edge"). No code change here if Task 1 landed.

- [ ] **Step 5: Verify**

Reload the video block: a thumbnail shows before play; scrolling into view still autoplays muted; caption unaffected.

- [ ] **Step 6: Commit**

```bash
git add components/image-displays/gallery/video-block/VideoBlock.js
git commit -m "fix(video): show poster thumbnail before playback"
```

---

## Phase 7 — Testimonial

### Task 14: Variant-aware testimonial empty state

**Files:**
- Modify: `components/image-displays/gallery/Gallery.js` (testimonial case + placeholder, ~lines 298-356)
- Test: `__tests__/components/GalleryTestimonial.test.js`

**Goal:** The empty-state placeholder mirrors the selected variant: `photo-above` → avatar circle above the text bars; `quote-above` → avatar circle below the text bars.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/components/GalleryTestimonial.test.js
import { render } from '@testing-library/react'
import Gallery from '@/components/image-displays/gallery/Gallery'

function renderT(block) {
  const { container } = render(<Gallery name="" description="" blocks={[block]} pages={[]} themeId="kyoto" />)
  return container.querySelector('[data-testimonial-placeholder]')
}

describe('testimonial empty state mirrors variant', () => {
  it('photo-above puts the avatar first', () => {
    const el = renderT({ type: 'testimonial', themeState: { kyoto: { variant: 'photo-above' } } })
    expect(el.getAttribute('data-order')).toBe('photo-first')
  })
  it('quote-above puts the avatar last', () => {
    const el = renderT({ type: 'testimonial', themeState: { kyoto: { variant: 'quote-above' } } })
    expect(el.getAttribute('data-order')).toBe('photo-last')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- GalleryTestimonial.test.js`
Expected: FAIL — placeholder has no variant-aware ordering / data attributes.

- [ ] **Step 3: Edit the testimonial placeholder in `Gallery.js`**

In the testimonial empty-state branch (the placeholder with the avatar circle + text bars, ~lines 304-319), read the variant and order the avatar vs. text bars accordingly. Add the `data-*` hooks:

```jsx
const isQuoteAbove = resolveVariant(block, themeId) === 'quote-above'
const Avatar = <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#ede7dc,#d9cebd)' }} />
const Bars = (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
    {['88%', '72%', '56%'].map((w, i) => <div key={i} style={{ width: w, maxWidth: '20rem', height: 10, borderRadius: 4, background: '#e8e0d0' }} />)}
    <div style={{ width: '6rem', height: 10, borderRadius: 4, background: '#e8e0d0', marginTop: 4 }} />
  </div>
)
return (
  <div
    key={`block-${index}`}
    data-testimonial-placeholder
    data-order={isQuoteAbove ? 'photo-last' : 'photo-first'}
    style={{ maxWidth: '36rem', margin: '0 auto', padding: '3rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}
    {...hoverProps}
  >
    {isQuoteAbove ? <>{Bars}{Avatar}</> : <>{Avatar}{Bars}</>}
  </div>
)
```

Match the exact empty-state condition already in the code (when `name`/`text` unset). Keep the real (non-empty) testimonial render untouched.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- GalleryTestimonial.test.js`
Expected: PASS.

- [ ] **Step 5: Manual verification (port 3000)**

Add an empty testimonial block; toggle Photo above / Quote above; the circle moves above/below the bars live.

- [ ] **Step 6: Commit**

```bash
git add components/image-displays/gallery/Gallery.js __tests__/components/GalleryTestimonial.test.js
git commit -m "feat(testimonial): empty state mirrors photo-above/quote-above"
```

---

## Phase 8 — Contact

### Task 15: Contact title alignment + button style

**Files:**
- Modify: `components/contact/ContactDisplay.js`
- Read for context: how `ContactDisplay` is rendered from a block (find where `align`/`buttonStyle`/block props flow in — likely `Gallery.js` contact case, and the published contact route)
- Test: `__tests__/components/ContactDisplay.test.js`

**Interfaces:**
- Consumes: `align` (`'left'|'center'`) and `buttonStyle` (`'solid'|'outline'`) props on `ContactDisplay`, sourced from `block.align` / `block.buttonStyle` (resolved via `resolveAlign`/`resolveButtonStyle` at the call site).
- Produces: heading/subheading alignment follows `align`; submit button renders solid or outline.

- [ ] **Step 1: Find the call site + write the failing test**

Run: `grep -rn "ContactDisplay" components pages --include="*.js"`
Confirm where the contact block renders and that it can pass `align`/`buttonStyle`.

```js
// __tests__/components/ContactDisplay.test.js
import { render, screen } from '@testing-library/react'
import ContactDisplay from '@/components/contact/ContactDisplay'

describe('ContactDisplay design options', () => {
  it('centers the heading when align=center', () => {
    const { container } = render(<ContactDisplay heading="Get in touch" subheading="hi" buttonText="Send" align="center" buttonStyle="solid" />)
    const wrap = container.querySelector('[data-contact-wrap]')
    expect(wrap.style.textAlign).toBe('center')
  })
  it('renders an outline submit button when buttonStyle=outline', () => {
    render(<ContactDisplay heading="H" subheading="s" buttonText="Send" align="left" buttonStyle="outline" />)
    const btn = screen.getByRole('button', { name: /send/i })
    expect(btn.getAttribute('data-btn-style')).toBe('outline')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ContactDisplay.test.js`
Expected: FAIL — no `align`/`buttonStyle` handling.

- [ ] **Step 3: Edit `ContactDisplay.js`**

Accept the new props and apply them. Add `align = 'left'` and `buttonStyle = 'solid'` to the signature. Wrap the content container with `data-contact-wrap` + `textAlign: align`. For the submit button, switch styling on `buttonStyle` and tag it with `data-btn-style`:

```js
export default function ContactDisplay({ heading, subheading, buttonText, toEmail, align = 'left', buttonStyle = 'solid' }) {
```

On the outer container `div` (the `maxWidth:'32rem'` wrapper), add `data-contact-wrap` and `textAlign: align`. For inputs that must stay left-aligned regardless, keep their own `textAlign: 'left'`.

Submit button styles (replace the current inline dark-button style):

```js
const solidBtn = { background: '#2c2416', color: '#f6f3ec', border: '1px solid #2c2416' }
const outlineBtn = { background: 'transparent', color: '#2c2416', border: '1px solid #2c2416' }
const btnStyle = buttonStyle === 'outline' ? outlineBtn : solidBtn
```

```jsx
<button
  type="submit"
  data-btn-style={buttonStyle}
  disabled={status === 'sending'}
  style={{ padding: '10px 24px', borderRadius: 4, fontSize: 13, cursor: 'pointer', ...btnStyle, opacity: status === 'sending' ? 0.5 : 1 }}
>
  {status === 'sending' ? 'Sending…' : (buttonText || 'Send message')}
</button>
```

- [ ] **Step 4: Pass the props at the call site**

Where the contact block renders (from Step 1 — `Gallery.js` contact case and/or the published contact section), pass `align={resolveAlign(block, themeId)}` and `buttonStyle={resolveButtonStyle(block, themeId)}`. Import `resolveButtonStyle` if not present.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- ContactDisplay.test.js`
Expected: PASS.

- [ ] **Step 6: Manual verification (port 3000)**

Open a contact block's design brush → Alignment (Left/Center) shifts the heading/subheading; Button style (Solid/Outline) changes the submit button. No console errors.

- [ ] **Step 7: Commit**

```bash
git add components/contact/ContactDisplay.js components/image-displays/gallery/Gallery.js __tests__/components/ContactDisplay.test.js
git commit -m "feat(contact): title alignment + solid/outline button style"
```

---

## Final Verification

- [ ] **Full test suite:** `npm test` → all green.
- [ ] **Regression sweep (port 3000):** For Kyoto, open each block's design popup and confirm the intended options; switch a variant, switch theme to Manhattan and back, confirm each theme keeps its own selection (lossless). Load an old config (with Manhattan `framed`/`full-width` or a `ghost` cover button) and confirm no console errors and sensible rendering (aliases resolve).
- [ ] **Per-feature spot-check:** hero Full vs Partial; photos grid + square; text font + resized Large; video thumbnail; testimonial + photos empty states redraw on option change; contact popup alignment + button style.
- [ ] **Do NOT run `next build`.** Verify only against the running dev server.

---

## Self-Review Notes (coverage vs spec)

- Spec §2 (base registry + contract) → Tasks 1–4. §2.5 aliases → Task 3. §2.6 docs → Task 4.
- §3.1 hero → Tasks 6–8 (normalize default+ghost, popup, PageCover unification). §3.3 photos grid/square + empty states → Tasks 9–11. §3.4 text font + Large → Tasks 5 (popup) + 12 (render). §3.5 video → Task 13 (thumbnail) + Task 1 (label). §3.6 testimonial → Task 14. §3.7 contact → Tasks 5 (popup) + 15 (render).
- §4 empty-states-mirror-design → Tasks 11 + 14.
- §6 out of scope (contact email, quote block, third-party infra) → not implemented, by design.
