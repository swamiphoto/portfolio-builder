# Multi-Theme System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an extensible multi-theme system with two shipping themes — **Kyoto** (the current look, renamed) and **Manhattan** (fixed left nav rail + gallery-wall grid) — where switching themes is lossless because each theme remembers its own per-block variant state.

**Architecture:** A theme is a self-contained module `{ id, name, navStyle, tokens, blocks }` in an in-repo registry. Block content stays flat and shared; presentation forks per theme via a `themeState[themeId] = { variant }` map on each block. Rendering resolves `variant = block.themeState[theme]?.variant ?? theme.blocks[type].defaultVariant`, falling back to legacy `variant`/`layout` fields for un-migrated data. Kyoto reuses the existing render path unchanged (lowest risk, guarantees pixel-equivalence); Manhattan adds a left-rail shell plus grid/framed photo renderers and `[data-theme="manhattan"]`-scoped styling. The theme interface is the future marketplace contract.

**Tech Stack:** Next.js (pages router), React, Tailwind, Jest + jest-environment-jsdom + @testing-library/react. Tests live in `__tests__/**/*.test.js`, import via `@/` alias.

## Global Constraints

- Test runner: `npx jest <path>`; tests match `__tests__/**/*.test.js`; `@/` maps to repo root.
- Never run `next build` — this workspace runs `next dev` on port 3000; building clobbers `.next`.
- No em-dashes in any user-facing copy (labels, tooltips). Use commas/periods.
- Kyoto must render pixel-identically to today's "minimal-light" after migration.
- Variant IDs are theme-local strings (e.g. Kyoto `'full-bleed'`, Manhattan `'framed'`); do not assume they align across themes.
- Content fields (imageUrl, caption, content, url, name, text, images) stay flat on the block and are shared across themes. Only presentation (variant) is per-theme.
- Legacy safety: resolution must fall back to existing `block.variant` / `block.layout` when `themeState` is absent, so un-migrated/older configs never break.

---

### Task 1: Theme registry and per-theme block specs

**Files:**
- Create: `common/themes/kyoto.js`
- Create: `common/themes/manhattan.js`
- Create: `common/themes/index.js`
- Test: `__tests__/themes/registry.test.js`

**Interfaces:**
- Produces:
  - `kyoto`, `manhattan`: theme objects `{ id, name, navStyle, tokens, blocks }` where
    `blocks[type] = { defaultVariant: string, variants: Array<{id,label}>, defaultAlign?: string }`.
  - `THEMES: Record<string, Theme>`, `THEME_LIST: Theme[]`, `getTheme(id): Theme` (falls back to kyoto), `getBlockSpec(themeId, blockType): spec|null`.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/themes/registry.test.js
import { THEMES, THEME_LIST, getTheme, getBlockSpec } from '@/common/themes'
import { kyoto } from '@/common/themes/kyoto'
import { manhattan } from '@/common/themes/manhattan'

const BLOCK_TYPES = ['photo', 'photos', 'text', 'video', 'testimonial', 'page-gallery', 'contact']

describe('theme registry', () => {
  it('registers kyoto and manhattan', () => {
    expect(Object.keys(THEMES).sort()).toEqual(['kyoto', 'manhattan'])
    expect(THEME_LIST.map(t => t.id).sort()).toEqual(['kyoto', 'manhattan'])
  })

  it('getTheme falls back to kyoto for unknown ids', () => {
    expect(getTheme('kyoto')).toBe(kyoto)
    expect(getTheme('manhattan')).toBe(manhattan)
    expect(getTheme('nope')).toBe(kyoto)
    expect(getTheme(undefined)).toBe(kyoto)
  })

  it('every theme defines every block type with a default that exists in its variants', () => {
    for (const theme of THEME_LIST) {
      for (const type of BLOCK_TYPES) {
        const spec = theme.blocks[type]
        expect(spec).toBeDefined()
        const ids = spec.variants.map(v => v.id)
        expect(ids).toContain(spec.defaultVariant)
      }
    }
  })

  it('getBlockSpec returns the spec or null', () => {
    expect(getBlockSpec('manhattan', 'photo').defaultVariant).toBe('full-width')
    expect(getBlockSpec('kyoto', 'photo').defaultVariant).toBe('full-bleed')
    expect(getBlockSpec('kyoto', 'bogus')).toBeNull()
  })

  it('manhattan uses the left-rail nav style, kyoto uses cover-embedded', () => {
    expect(manhattan.navStyle).toBe('left-rail')
    expect(kyoto.navStyle).toBe('cover-embedded')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/themes/registry.test.js`
Expected: FAIL — cannot find module `@/common/themes`.

- [ ] **Step 3: Create the theme modules**

```js
// common/themes/kyoto.js
// Kyoto — the original "minimal light" look: warm, serif, single-column,
// top-to-bottom editorial scroll. Variant ids mirror the legacy render paths.
export const kyoto = {
  id: 'kyoto',
  name: 'Kyoto',
  navStyle: 'cover-embedded',
  tokens: {
    '--theme-bg': '#ffffff',
    '--theme-text': '#2c2416',
    '--theme-text-muted': '#7a6b55',
  },
  blocks: {
    photo: {
      defaultVariant: 'full-bleed',
      variants: [
        { id: 'full-bleed', label: 'Full Bleed' },
        { id: 'centered', label: 'Centered' },
      ],
    },
    photos: {
      defaultVariant: 'stacked',
      variants: [
        { id: 'stacked', label: 'Stacked' },
        { id: 'masonry', label: 'Masonry' },
      ],
    },
    text: {
      defaultVariant: 'heading',
      defaultAlign: 'center',
      variants: [
        { id: 'heading', label: 'L' },
        { id: 'subheading', label: 'M' },
        { id: 'body', label: 'S' },
        { id: 'quote', label: 'Quote' },
      ],
    },
    video: {
      defaultVariant: 'full-bleed',
      variants: [
        { id: 'full-bleed', label: 'Edge to edge' },
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
    'page-gallery': {
      defaultVariant: 'list',
      variants: [{ id: 'list', label: 'List' }],
    },
    contact: {
      defaultVariant: 'standard',
      variants: [{ id: 'standard', label: 'Standard' }],
    },
  },
}
```

```js
// common/themes/manhattan.js
// Manhattan — fixed left nav rail + gallery-wall grid on the right.
// Gallery-white, cool neutral, tight uppercase sans. Variant ids are
// theme-local and intentionally differ from Kyoto's.
export const manhattan = {
  id: 'manhattan',
  name: 'Manhattan',
  navStyle: 'left-rail',
  tokens: {
    '--theme-bg': '#fafafa',
    '--theme-text': '#141414',
    '--theme-text-muted': '#6b6b6b',
    '--theme-rail-width': '260px',
  },
  blocks: {
    photo: {
      defaultVariant: 'full-width',
      variants: [
        { id: 'full-width', label: 'Full width' },
        { id: 'framed', label: 'Framed' },
      ],
    },
    photos: {
      defaultVariant: 'grid',
      variants: [
        { id: 'grid', label: 'Grid' },
        { id: 'masonry', label: 'Masonry' },
      ],
    },
    text: {
      defaultVariant: 'heading',
      defaultAlign: 'left',
      variants: [
        { id: 'heading', label: 'L' },
        { id: 'subheading', label: 'M' },
        { id: 'body', label: 'S' },
        { id: 'quote', label: 'Quote' },
      ],
    },
    video: {
      defaultVariant: 'full-width',
      variants: [
        { id: 'full-width', label: 'Full width' },
        { id: 'framed', label: 'Framed' },
      ],
    },
    testimonial: {
      defaultVariant: 'photo-above',
      variants: [
        { id: 'photo-above', label: 'Photo above' },
        { id: 'quote-above', label: 'Quote above' },
      ],
    },
    'page-gallery': {
      defaultVariant: 'grid',
      variants: [{ id: 'grid', label: 'Grid' }],
    },
    contact: {
      defaultVariant: 'standard',
      variants: [{ id: 'standard', label: 'Standard' }],
    },
  },
}
```

```js
// common/themes/index.js
// The theme registry. In-repo for now; the marketplace later merges
// validated external themes into THEMES without touching consumers.
import { kyoto } from './kyoto'
import { manhattan } from './manhattan'

export const THEMES = { kyoto, manhattan }
export const THEME_LIST = [kyoto, manhattan]
export const DEFAULT_THEME_ID = 'kyoto'

export function getTheme(id) {
  return THEMES[id] || THEMES[DEFAULT_THEME_ID]
}

export function getBlockSpec(themeId, blockType) {
  const theme = getTheme(themeId)
  return theme.blocks[blockType] || null
}

export { kyoto, manhattan }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/themes/registry.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add common/themes/ __tests__/themes/registry.test.js
git commit -m "feat(themes): theme registry + per-theme block specs (Kyoto, Manhattan)"
```

---

### Task 2: Variant resolution and write helpers

**Files:**
- Create: `common/themes/variants.js`
- Test: `__tests__/themes/variants.test.js`

**Interfaces:**
- Consumes: `getBlockSpec` from `common/themes`.
- Produces:
  - `resolveVariant(block, themeId): string` — returns `block.themeState[themeId].variant` if present and valid for the theme; else legacy fallback (see mapping); else the theme's `defaultVariant`.
  - `setVariant(block, themeId, variantId): block` — returns a new block with `themeState[themeId].variant` set, never mutating other theme keys or content.
  - `resolveAlign(block, themeId): string` — `block.align` if set, else spec `defaultAlign` or `'center'`.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/themes/variants.test.js
import { resolveVariant, setVariant, resolveAlign } from '@/common/themes/variants'

describe('resolveVariant', () => {
  it('uses saved themeState when valid for the theme', () => {
    const block = { type: 'photo', themeState: { kyoto: { variant: 'centered' } } }
    expect(resolveVariant(block, 'kyoto')).toBe('centered')
  })

  it('falls back to the theme default when no state exists', () => {
    expect(resolveVariant({ type: 'photo' }, 'kyoto')).toBe('full-bleed')
    expect(resolveVariant({ type: 'photo' }, 'manhattan')).toBe('full-width')
  })

  it('falls back to the theme default when saved variant is invalid for that theme', () => {
    const block = { type: 'photo', themeState: { manhattan: { variant: 'full-bleed' } } }
    // 'full-bleed' is a Kyoto id, not a Manhattan id
    expect(resolveVariant(block, 'manhattan')).toBe('full-width')
  })

  it('does not cross theme keys', () => {
    const block = { type: 'photo', themeState: { kyoto: { variant: 'centered' } } }
    expect(resolveVariant(block, 'manhattan')).toBe('full-width')
  })

  it('reads legacy photo variant/layout when themeState is absent', () => {
    expect(resolveVariant({ type: 'photo', variant: 2 }, 'kyoto')).toBe('centered')
    expect(resolveVariant({ type: 'photo', layout: 'Centered' }, 'kyoto')).toBe('centered')
    expect(resolveVariant({ type: 'photo', variant: 1 }, 'kyoto')).toBe('full-bleed')
  })

  it('reads legacy text variant numbers', () => {
    expect(resolveVariant({ type: 'text', variant: 1 }, 'kyoto')).toBe('heading')
    expect(resolveVariant({ type: 'text', variant: 2 }, 'kyoto')).toBe('subheading')
    expect(resolveVariant({ type: 'text', variant: 3 }, 'kyoto')).toBe('body')
    expect(resolveVariant({ type: 'text', variant: 4 }, 'kyoto')).toBe('quote')
  })
})

describe('setVariant', () => {
  it('writes only the target theme key and keeps content + other themes', () => {
    const block = { type: 'photo', imageUrl: 'x', themeState: { kyoto: { variant: 'centered' } } }
    const next = setVariant(block, 'manhattan', 'framed')
    expect(next).not.toBe(block)
    expect(next.imageUrl).toBe('x')
    expect(next.themeState.kyoto.variant).toBe('centered')
    expect(next.themeState.manhattan.variant).toBe('framed')
  })

  it('creates themeState when missing', () => {
    const next = setVariant({ type: 'photo' }, 'kyoto', 'centered')
    expect(next.themeState.kyoto.variant).toBe('centered')
  })
})

describe('resolveAlign', () => {
  it('prefers block.align, else theme default', () => {
    expect(resolveAlign({ type: 'text', align: 'left' }, 'kyoto')).toBe('left')
    expect(resolveAlign({ type: 'text' }, 'kyoto')).toBe('center')
    expect(resolveAlign({ type: 'text' }, 'manhattan')).toBe('left')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/themes/variants.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```js
// common/themes/variants.js
import { getBlockSpec, getTheme } from './index'

// Legacy → theme-local variant id mapping, used only when a block has no
// themeState entry (older configs). Keyed by block type.
const LEGACY = {
  photo: (b) => (b.layout === 'Centered' || b.variant === 2 ? 'centered' : 'full-bleed'),
  photos: (b) => (b.layout === 'masonry' || b.type === 'masonry' ? 'masonry' : 'stacked'),
  text: (b) => ({ 1: 'heading', 2: 'subheading', 3: 'body', 4: 'quote' }[b.variant || 1] || 'heading'),
  video: (b) => (b.layout === 'Centered' ? 'centered' : { 1: 'full-bleed', 2: 'centered', 3: 'side-by-side' }[b.variant || 1] || 'full-bleed'),
  testimonial: (b) => (b.variant === 2 ? 'quote-above' : 'photo-above'),
}

export function resolveVariant(block, themeId) {
  const spec = getBlockSpec(themeId, block.type)
  if (!spec) return undefined
  const validIds = spec.variants.map((v) => v.id)

  const saved = block.themeState?.[themeId]?.variant
  if (saved && validIds.includes(saved)) return saved

  // Legacy fallback: map old fields into a theme-local id, but only accept it
  // if it's valid for this theme (cross-theme legacy values fall through).
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/themes/variants.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/themes/variants.js __tests__/themes/variants.test.js
git commit -m "feat(themes): lossless per-theme variant resolve/set helpers with legacy fallback"
```

---

### Task 3: Migrate legacy config on read + rename default theme

**Files:**
- Create: `common/themes/migrate.js`
- Test: `__tests__/themes/migrate.test.js`
- Modify: `common/siteConfig.js` (import + apply in `readSiteConfig`; set default theme `'kyoto'` in `createDefaultSiteConfig`)

**Interfaces:**
- Consumes: `resolveVariant` from `common/themes/variants`.
- Produces:
  - `migrateThemeId(id): string` — maps `minimal-light`/`minimal-dark`/`editorial` → `'kyoto'`; passes through known ids; unknown → `'kyoto'`.
  - `migrateBlock(block): block` — ensures `block.themeState.kyoto.variant` is populated from legacy fields (idempotent; leaves already-migrated blocks untouched; non-variant blocks like contact/page-gallery pass through).
  - `migrateSiteConfigThemes(config): config` — maps `design.theme` and migrates every block on every page.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/themes/migrate.test.js
import { migrateThemeId, migrateBlock, migrateSiteConfigThemes } from '@/common/themes/migrate'

describe('migrateThemeId', () => {
  it('folds legacy themes into kyoto and passes known ids', () => {
    expect(migrateThemeId('minimal-light')).toBe('kyoto')
    expect(migrateThemeId('minimal-dark')).toBe('kyoto')
    expect(migrateThemeId('editorial')).toBe('kyoto')
    expect(migrateThemeId('manhattan')).toBe('manhattan')
    expect(migrateThemeId('kyoto')).toBe('kyoto')
    expect(migrateThemeId(undefined)).toBe('kyoto')
  })
})

describe('migrateBlock', () => {
  it('populates themeState.kyoto from legacy photo layout', () => {
    expect(migrateBlock({ type: 'photo', variant: 2 }).themeState.kyoto.variant).toBe('centered')
    expect(migrateBlock({ type: 'photo', layout: 'Centered' }).themeState.kyoto.variant).toBe('centered')
  })

  it('populates themeState.kyoto from legacy text variant', () => {
    expect(migrateBlock({ type: 'text', variant: 3 }).themeState.kyoto.variant).toBe('body')
  })

  it('is idempotent and preserves existing themeState', () => {
    const already = { type: 'photo', themeState: { kyoto: { variant: 'centered' }, manhattan: { variant: 'framed' } } }
    const out = migrateBlock(already)
    expect(out.themeState.kyoto.variant).toBe('centered')
    expect(out.themeState.manhattan.variant).toBe('framed')
  })

  it('passes through blocks with no variant concept', () => {
    const c = { type: 'contact', heading: 'Hi' }
    expect(migrateBlock(c).themeState.kyoto.variant).toBe('standard')
  })
})

describe('migrateSiteConfigThemes', () => {
  it('maps design.theme and migrates every block', () => {
    const config = {
      design: { theme: 'minimal-light' },
      pages: [{ id: 'home', blocks: [{ type: 'photo', variant: 2 }, { type: 'text', variant: 1 }] }],
    }
    const out = migrateSiteConfigThemes(config)
    expect(out.design.theme).toBe('kyoto')
    expect(out.pages[0].blocks[0].themeState.kyoto.variant).toBe('centered')
    expect(out.pages[0].blocks[1].themeState.kyoto.variant).toBe('heading')
  })

  it('tolerates missing design/pages', () => {
    expect(migrateSiteConfigThemes({}).design.theme).toBe('kyoto')
    expect(migrateSiteConfigThemes({}).pages).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/themes/migrate.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `common/themes/migrate.js`**

```js
// common/themes/migrate.js
import { resolveVariant } from './variants'

const LEGACY_THEME_IDS = {
  'minimal-light': 'kyoto',
  'minimal-dark': 'kyoto',
  'editorial': 'kyoto',
}

export function migrateThemeId(id) {
  if (!id) return 'kyoto'
  if (LEGACY_THEME_IDS[id]) return LEGACY_THEME_IDS[id]
  return id // already a valid new id (kyoto, manhattan, ...)
}

export function migrateBlock(block) {
  if (!block || typeof block !== 'object') return block
  const existing = block.themeState?.kyoto?.variant
  if (existing) return block // already migrated for kyoto
  const variant = resolveVariant(block, 'kyoto') // derives from legacy fields or default
  return {
    ...block,
    themeState: {
      ...(block.themeState || {}),
      kyoto: { ...(block.themeState?.kyoto || {}), variant },
    },
  }
}

export function migrateSiteConfigThemes(config = {}) {
  const design = { ...(config.design || {}), theme: migrateThemeId(config.design?.theme) }
  const pages = (config.pages || []).map((page) => ({
    ...page,
    blocks: (page.blocks || []).map(migrateBlock),
  }))
  return { ...config, design, pages }
}
```

- [ ] **Step 4: Wire into `readSiteConfig` and default config**

In `common/siteConfig.js`, add the import near the top (after existing imports):

```js
import { migrateSiteConfigThemes } from './themes/migrate'
```

Change the `createDefaultSiteConfig` design block theme from `'minimal-light'` to `'kyoto'`:

```js
    design: {
      theme: 'kyoto',
      navStyle: 'minimal',
      subNavStyle: 'dropdown',
      footerLayout: 'standard',
    },
```

Wrap the return of `readSiteConfig` so migration runs on read (compose with the existing `normalizePrintStore`):

```js
  try {
    const config = await downloadJSON(getUserSiteConfigPath(userId))
    return migrateSiteConfigThemes(normalizePrintStore({
      ...config,
      pages: (config.pages || []).map((page) => normalizePageEntity(page)),
    }))
  } catch (err) {
```

- [ ] **Step 5: Run tests**

Run: `npx jest __tests__/themes/migrate.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add common/themes/migrate.js __tests__/themes/migrate.test.js common/siteConfig.js
git commit -m "feat(themes): migrate legacy variants into themeState.kyoto on read; default theme kyoto"
```

---

### Task 4: DesignPopover reads the active theme's variant spec and writes themeState

**Files:**
- Modify: `components/admin/gallery-builder/DesignPopover.js`
- Test: `__tests__/components/DesignPopover.test.js`

**Context:** The popover currently hardcodes `LAYOUTS`/`VARIANTS`. It must instead read the active theme's block spec and, on change, write `themeState[activeTheme].variant` via `setVariant`. It needs the active theme id — passed as a new `themeId` prop (caller passes `siteConfig.design.theme`). Photos block: the current code changes `block.type` between `stacked`/`masonry`; under the new model the multi-photo block keeps a stable type and its layout becomes a variant. To stay backward compatible with `Gallery.js` (Task 7 keeps reading `block.type`/`block.layout` for Kyoto), ALSO mirror the chosen photos variant onto `block.layout` and `block.type` when the variant maps to a legacy layout.

**Interfaces:**
- Consumes: `getBlockSpec` from `common/themes`, `setVariant` from `common/themes/variants`.
- Produces: `DesignPopover({ block, themeId, onUpdate, onClose, anchorEl })`.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/components/DesignPopover.test.js
import { render, screen, fireEvent } from '@testing-library/react'
import DesignPopover from '@/components/admin/gallery-builder/DesignPopover'

function open(block, themeId = 'kyoto') {
  const onUpdate = jest.fn()
  render(<DesignPopover block={block} themeId={themeId} onUpdate={onUpdate} onClose={() => {}} anchorEl={null} />)
  return onUpdate
}

describe('DesignPopover theme-driven variants', () => {
  it('shows Kyoto photo variants and writes themeState.kyoto', () => {
    const onUpdate = open({ type: 'photo', imageUrl: 'x' }, 'kyoto')
    fireEvent.click(screen.getByText('Centered'))
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      themeState: expect.objectContaining({ kyoto: { variant: 'centered' } }),
    }))
  })

  it('shows Manhattan photo variants (Framed) and writes themeState.manhattan', () => {
    const onUpdate = open({ type: 'photo', imageUrl: 'x' }, 'manhattan')
    expect(screen.getByText('Framed')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Framed'))
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      themeState: expect.objectContaining({ manhattan: { variant: 'framed' } }),
    }))
  })

  it('returns null when a block type has a single variant and no alignment (contact)', () => {
    const { container } = render(
      <DesignPopover block={{ type: 'contact' }} themeId="kyoto" onUpdate={() => {}} onClose={() => {}} anchorEl={null} />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/DesignPopover.test.js`
Expected: FAIL.

- [ ] **Step 3: Rewrite `DesignPopover.js`**

```js
import PopoverShell from '../platform/PopoverShell'
import { DesignSection, PillToggle } from '../platform/designControls'
import { getBlockSpec } from '../../../common/themes'
import { setVariant } from '../../../common/themes/variants'

const IconAlignLeft = () => (
  <svg width="14" height="10" viewBox="0 0 14 10" fill="none" style={{ display: 'block', margin: '0 auto' }}>
    <rect x="0" y="0"   width="14" height="2" rx="1" fill="currentColor"/>
    <rect x="0" y="4"   width="9"  height="2" rx="1" fill="currentColor"/>
    <rect x="0" y="8"   width="11" height="2" rx="1" fill="currentColor"/>
  </svg>
)
const IconAlignCenter = () => (
  <svg width="14" height="10" viewBox="0 0 14 10" fill="none" style={{ display: 'block', margin: '0 auto' }}>
    <rect x="0" y="0"   width="14" height="2" rx="1" fill="currentColor"/>
    <rect x="2.5" y="4" width="9"  height="2" rx="1" fill="currentColor"/>
    <rect x="1" y="8"   width="12" height="2" rx="1" fill="currentColor"/>
  </svg>
)

const ALIGN_OPTIONS = [
  { value: 'left',   label: <IconAlignLeft /> },
  { value: 'center', label: <IconAlignCenter /> },
]

// Photos-block variant ids that map back to a legacy block.type/layout so the
// existing Kyoto render path in Gallery.js keeps working unchanged.
const PHOTOS_LEGACY = { stacked: { type: 'stacked', layout: 'stacked' }, masonry: { type: 'masonry', layout: 'masonry' } }

import { resolveVariant, resolveAlign } from '../../../common/themes/variants'

export default function DesignPopover({ block, themeId = 'kyoto', onUpdate, onClose, anchorEl }) {
  const spec = getBlockSpec(themeId, block.type)
  const variants = spec ? spec.variants.map(v => ({ value: v.id, label: v.label })) : []
  const isPhotos = block.type === 'photos' || block.type === 'stacked' || block.type === 'masonry'
  const showAlignment = block.type === 'text'

  const current = resolveVariant(block, themeId)

  function handleVariantChange(variantId) {
    let next = setVariant(block, themeId, variantId)
    if (isPhotos && PHOTOS_LEGACY[variantId]) {
      next = { ...next, ...PHOTOS_LEGACY[variantId] }
    }
    onUpdate(next)
  }

  // Single-variant, non-alignment blocks (contact, page-gallery) have nothing to show.
  if (variants.length <= 1 && !showAlignment) return null

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={220} title="Design">
      {variants.length > 1 && (
        <DesignSection label={block.type === 'text' ? 'Size' : 'Layout'}>
          <PillToggle value={current} onChange={handleVariantChange} options={variants} />
        </DesignSection>
      )}
      {showAlignment && (
        <DesignSection label="Alignment">
          <PillToggle
            value={resolveAlign(block, themeId)}
            onChange={(v) => onUpdate({ ...block, align: v })}
            options={ALIGN_OPTIONS}
          />
        </DesignSection>
      )}
    </PopoverShell>
  )
}
```

- [ ] **Step 4: Pass `themeId` from the caller**

Find where `DesignPopover` is rendered (grep: `DesignPopover` under `components/admin/`). Add `themeId={siteConfig?.design?.theme || 'kyoto'}` to that JSX. If the caller lacks `siteConfig`, thread it from the nearest parent that has it. Note the file:line in the commit body.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest __tests__/components/DesignPopover.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/admin/gallery-builder/DesignPopover.js __tests__/components/DesignPopover.test.js
git commit -m "feat(themes): DesignPopover reads active theme spec, writes per-theme themeState"
```

---

### Task 5: Theme switcher in Site Settings driven by the registry

**Files:**
- Modify: `components/admin/platform/SiteSettingsPopover.js` (the design `<DesignSelect>` around lines 749-757)
- Test: `__tests__/components/ThemeSwitcher.test.js`

**Context:** Replace the hardcoded `<option>` list (`minimal-light`/`minimal-dark`/`editorial`) with options generated from `THEME_LIST`. Selecting an option sets `design.theme` to the theme id.

- [ ] **Step 1: Write the failing test**

Extract the option list into a tiny exported pure helper so it is unit-testable without rendering the whole heavy popover. In `SiteSettingsPopover.js` add and export:

```js
import { THEME_LIST } from '../../../common/themes'
export const themeOptions = () => THEME_LIST.map(t => ({ value: t.id, label: t.name }))
```

```js
// __tests__/components/ThemeSwitcher.test.js
import { themeOptions } from '@/components/admin/platform/SiteSettingsPopover'

describe('themeOptions', () => {
  it('lists registry themes as {value,label}', () => {
    expect(themeOptions()).toEqual([
      { value: 'kyoto', label: 'Kyoto' },
      { value: 'manhattan', label: 'Manhattan' },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/ThemeSwitcher.test.js`
Expected: FAIL — `themeOptions` not exported.

- [ ] **Step 3: Implement**

Add the import + `themeOptions` export (Step 1). Replace the hardcoded select body:

```jsx
                <DesignSelect
                  value={config.design?.theme || 'kyoto'}
                  onChange={(e) => update({ design: { ...(config.design || {}), theme: e.target.value } })}
                >
                  {themeOptions().map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </DesignSelect>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/ThemeSwitcher.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/admin/platform/SiteSettingsPopover.js __tests__/components/ThemeSwitcher.test.js
git commit -m "feat(themes): registry-driven theme switcher in site settings"
```

---

### Task 6: ThemeProvider — inject tokens + expose theme via context

**Files:**
- Create: `components/image-displays/ThemeProvider.js`
- Test: `__tests__/components/ThemeProvider.test.js`

**Interfaces:**
- Consumes: `getTheme` from `common/themes`.
- Produces:
  - default export `ThemeProvider({ themeId, children })` — renders a wrapper `<div data-theme={id} style={cssVars}>` where `cssVars` is the theme's `tokens`, and provides theme via context.
  - `useTheme(): Theme` — returns the current theme (defaults to kyoto outside a provider).

- [ ] **Step 1: Write the failing test**

```js
// __tests__/components/ThemeProvider.test.js
import { render, screen } from '@testing-library/react'
import ThemeProvider, { useTheme } from '@/components/image-displays/ThemeProvider'

function Probe() {
  const theme = useTheme()
  return <span data-testid="probe">{theme.id}:{theme.navStyle}</span>
}

describe('ThemeProvider', () => {
  it('sets data-theme and exposes the theme via context', () => {
    const { container } = render(
      <ThemeProvider themeId="manhattan"><Probe /></ThemeProvider>
    )
    expect(container.querySelector('[data-theme="manhattan"]')).toBeInTheDocument()
    expect(screen.getByTestId('probe').textContent).toBe('manhattan:left-rail')
  })

  it('injects theme tokens as inline CSS custom properties', () => {
    const { container } = render(<ThemeProvider themeId="manhattan"><i/></ThemeProvider>)
    const wrapper = container.querySelector('[data-theme="manhattan"]')
    expect(wrapper.style.getPropertyValue('--theme-rail-width')).toBe('260px')
  })

  it('defaults to kyoto for unknown theme ids', () => {
    render(<ThemeProvider themeId="bogus"><Probe /></ThemeProvider>)
    expect(screen.getByTestId('probe').textContent).toBe('kyoto:cover-embedded')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/ThemeProvider.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement**

```js
// components/image-displays/ThemeProvider.js
import { createContext, useContext } from 'react'
import { getTheme, kyoto } from '../../common/themes'

const ThemeContext = createContext(kyoto)

export function useTheme() {
  return useContext(ThemeContext)
}

export default function ThemeProvider({ themeId, children }) {
  const theme = getTheme(themeId)
  return (
    <ThemeContext.Provider value={theme}>
      <div data-theme={theme.id} style={theme.tokens}>{children}</div>
    </ThemeContext.Provider>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/ThemeProvider.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/image-displays/ThemeProvider.js __tests__/components/ThemeProvider.test.js
git commit -m "feat(themes): ThemeProvider injects tokens + exposes theme context"
```

---

### Task 7: Gallery resolves variants per active theme (Kyoto path preserved)

**Files:**
- Modify: `components/image-displays/gallery/Gallery.js`
- Test: `__tests__/components/GalleryThemeVariants.test.js`

**Context:** `Gallery` gains a `themeId` prop (defaults `'kyoto'`). Every place that currently reads `block.variant`/`block.layout` derives the variant through `resolveVariant(block, themeId)` and maps the theme-local id back to the existing render logic. This keeps Kyoto pixel-identical while letting Manhattan reuse the same shared renderers for text/video/testimonial/contact/page-gallery. Photo and photos grid/framed rendering for Manhattan is handled in Task 9 by branching on `themeId === 'manhattan'`.

Concretely, replace the per-case variant derivations:

- `text` case: replace `const v = block.variant || 1` with:
  ```js
  const variantId = resolveVariant(block, themeId)
  const v = { heading: 1, subheading: 2, body: 3, quote: 4 }[variantId] || 1
  const align = resolveAlign(block, themeId)
  ```
  (remove the old `const defaultAlign`/`block.align` lines; keep the rest using `v` and `align`.)

- `photo` case: replace `const photoVariant = block.layout === "Centered" ? 2 : (block.variant || 1)` with:
  ```js
  const variantId = resolveVariant(block, themeId)
  const photoVariant = variantId === 'centered' ? 2 : 1
  ```

- `video` case: replace `const videoVariant = ...` with:
  ```js
  const variantId = resolveVariant(block, themeId)
  const videoVariant = { 'full-bleed': 1, centered: 2, 'side-by-side': 3 }[variantId] || 1
  ```

- `testimonial` case: replace `const v = block.variant || 1` with:
  ```js
  const v = resolveVariant(block, themeId) === 'quote-above' ? 2 : 1
  ```

- `photos` case: replace `const usemasonry = block.layout === "masonry" || isSmallScreen` with:
  ```js
  const variantId = resolveVariant(block, themeId)
  const usemasonry = variantId === 'masonry' || isSmallScreen
  ```
  Leave `stacked`/`masonry` legacy cases as-is (they resolve via the same helper if reached, but keep the existing bodies).

Add the import at the top:
```js
import { resolveVariant, resolveAlign } from "../../../common/themes/variants";
```
And add `themeId = 'kyoto'` to the destructured props of `Gallery`.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/components/GalleryThemeVariants.test.js
import { render } from '@testing-library/react'
import Gallery from '@/components/image-displays/gallery/Gallery'

// Router + responsive hooks used by Gallery need light mocks.
jest.mock('next/router', () => ({ useRouter: () => ({ query: {}, push: jest.fn(), asPath: '/' }) }))
jest.mock('react-responsive', () => ({ useMediaQuery: () => false }))

function renderGallery(blocks, themeId) {
  return render(<Gallery blocks={blocks} themeId={themeId} siteConfig={{}} />)
}

describe('Gallery variant resolution', () => {
  it('renders a text block using themeState variant for the active theme', () => {
    const block = { type: 'text', content: 'Hello world', themeState: { kyoto: { variant: 'body' } } }
    const { container } = renderGallery([block], 'kyoto')
    const el = container.querySelector('.text-block')
    // body variant => text-base class present, not the 3xl heading
    expect(el.className).toMatch(/text-base/)
    expect(el.className).not.toMatch(/text-3xl/)
  })

  it('falls back to theme default when no state for the active theme', () => {
    const block = { type: 'text', content: 'Hi', themeState: { manhattan: { variant: 'body' } } }
    const { container } = renderGallery([block], 'kyoto') // kyoto default = heading
    expect(container.querySelector('.text-block').className).toMatch(/text-3xl/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/GalleryThemeVariants.test.js`
Expected: FAIL — `themeId`/resolver not wired; default still reads `block.variant`.

- [ ] **Step 3: Apply the edits described above.**

- [ ] **Step 4: Run tests (targeted + full suite for regressions)**

Run: `npx jest __tests__/components/GalleryThemeVariants.test.js`
Expected: PASS.
Run: `npx jest`
Expected: All prior tests still PASS.

- [ ] **Step 5: Commit**

```bash
git add components/image-displays/gallery/Gallery.js __tests__/components/GalleryThemeVariants.test.js
git commit -m "feat(themes): Gallery resolves block variants per active theme (Kyoto preserved)"
```

---

### Task 8: Left-rail nav style (Manhattan shell chrome)

**Files:**
- Modify: `common/navStyles.js`
- Modify: `components/image-displays/page/SiteNav.js`
- Test: `__tests__/components/SiteNavLeftRail.test.js`

**Context:** Register `left-rail` for `manhattan` in `navStyles.js`. In `SiteNav`, add a `left-rail` branch that renders a fixed left sidebar: site name/logo at top, vertical `NavList` (use `depth`>0 styling so items stack), and social + copyright pinned at the bottom. Reuse `buildNavTree` and existing `contact`/`footer` data from `siteConfig`. Mobile (`isMobile`) collapses to the existing hamburger overlay pattern.

- [ ] **Step 1: Update `common/navStyles.js`**

```js
const THEME_NAV_STYLES = {
  'kyoto': 'cover-embedded',
  'manhattan': 'left-rail',
  // legacy ids (pre-migration reads) still resolve sanely
  'minimal-light': 'cover-embedded',
  'minimal-dark': 'cover-embedded',
  'editorial': 'header-dropdown',
}

export function resolveNavStyle(theme) {
  return THEME_NAV_STYLES[theme] || 'cover-embedded'
}
```

- [ ] **Step 2: Write the failing test**

```js
// __tests__/components/SiteNavLeftRail.test.js
import { render, screen } from '@testing-library/react'
import SiteNav from '@/components/image-displays/page/SiteNav'

jest.mock('next/router', () => ({ useRouter: () => ({ asPath: '/sites/me' }) }))

const siteConfig = {
  siteName: 'Ansel A',
  pages: [{ id: 'work', title: 'Work', slug: 'work', showInNav: true, type: 'page' }],
  contact: { instagram: 'ansel' },
  footer: { customText: '© 2026 Ansel' },
}

describe('SiteNav left-rail', () => {
  it('renders a fixed rail with site name, nav, and footer text', () => {
    render(<SiteNav siteConfig={siteConfig} username="me" variant="left-rail" basePath="/sites/me" />)
    const rail = screen.getByTestId('left-rail')
    expect(rail).toBeInTheDocument()
    expect(screen.getByText('Ansel A')).toBeInTheDocument()
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('© 2026 Ansel')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest __tests__/components/SiteNavLeftRail.test.js`
Expected: FAIL — no left-rail branch.

- [ ] **Step 4: Add the `left-rail` branch in `SiteNav`**

Insert before the `header-dropdown` branch (after `currentPath` is computed):

```jsx
  if (style === 'left-rail') {
    const socials = siteConfig.contact || {}
    const socialKeys = ['instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'website'].filter(k => socials[k])
    return (
      <nav
        data-testid="left-rail"
        className="left-rail hidden md:flex flex-col justify-between fixed top-0 left-0 h-screen w-[260px] px-8 py-10 border-r border-black/10"
        style={{ background: 'var(--theme-bg, #fafafa)', color: 'var(--theme-text, #141414)' }}
      >
        <div className="flex flex-col gap-10">
          {onPageClick ? (
            <button className="text-left text-lg font-semibold uppercase tracking-[0.18em] leading-tight">{siteConfig.siteName || username}</button>
          ) : (
            <a href={basePath || '/'} className="text-lg font-semibold uppercase tracking-[0.18em] leading-tight" style={{ textDecoration: 'none', color: 'inherit' }}>{siteConfig.siteName || username}</a>
          )}
          <ul className="flex flex-col gap-2">
            {tree.map(item => {
              const isLink = item.type === 'link'
              const href = isLink ? (item.url || '#') : `${basePath}/${item.slug || item.id}`
              const isActive = !isLink && currentPath === href
              const cls = `text-sm uppercase tracking-[0.12em] transition-colors ${isActive ? 'text-black' : 'text-black/50 hover:text-black'}`
              return (
                <li key={item.id}>
                  {onPageClick && !isLink
                    ? <button onClick={() => onPageClick(item.id)} className={cls}>{item.title}</button>
                    : <a href={href} target={isLink ? '_blank' : undefined} rel={isLink ? 'noopener noreferrer' : undefined} className={cls} style={{ textDecoration: 'none' }}>{item.title}</a>}
                </li>
              )
            })}
          </ul>
        </div>
        <div className="flex flex-col gap-4 text-black/40">
          {socialKeys.length > 0 && (
            <div className="flex gap-3 text-xs uppercase tracking-[0.12em]">
              {socialKeys.map(k => <span key={k}>{k[0].toUpperCase()}</span>)}
            </div>
          )}
          {siteConfig.footer?.customText && (
            <p className="text-[11px] leading-relaxed">{siteConfig.footer.customText}</p>
          )}
        </div>
      </nav>
    )
  }
```

Note: social icons here are letter placeholders to keep scope tight; a follow-up can swap in the real react-icons set already used elsewhere. Mobile rendering for left-rail falls through to the existing mobile overlay handled by other branches; if `isMobile` is true, render the existing hamburger header instead (reuse the `header-dropdown` mobile block or return a slim top bar). Keep the desktop rail `hidden md:flex` so mobile is not blocked.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest __tests__/components/SiteNavLeftRail.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add common/navStyles.js components/image-displays/page/SiteNav.js __tests__/components/SiteNavLeftRail.test.js
git commit -m "feat(themes): left-rail nav style for Manhattan (fixed sidebar shell)"
```

---

### Task 9: Manhattan photo/photos renderers (grid + framed) and scoped styling

**Files:**
- Modify: `components/image-displays/gallery/Gallery.js` (branch photo/photos on `themeId === 'manhattan'`)
- Create: `components/image-displays/themes/manhattan/ManhattanGrid.js`
- Create: `components/image-displays/gallery/photo-block/FramedPhoto.js`
- Modify: `styles/globals.css` (append `[data-theme="manhattan"]` scoped rules)
- Test: `__tests__/components/ManhattanGrid.test.js`

**Context:** For `photos` blocks under Manhattan, render a dense CSS grid of images (the gallery wall) instead of Stacked/Masonry. For `photo` blocks under Manhattan with the `framed` variant, render a white-matted image. `full-width` under Manhattan renders the image at content-region width (not `100vw`, since the rail occupies the left). Keep Kyoto branches exactly as they are.

**Interfaces:**
- Produces: `ManhattanGrid({ images, onImageClick })` — renders `images` (array of `{url,caption}`) as a responsive grid of clickable tiles.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/components/ManhattanGrid.test.js
import { render } from '@testing-library/react'
import ManhattanGrid from '@/components/image-displays/themes/manhattan/ManhattanGrid'

describe('ManhattanGrid', () => {
  it('renders one tile per image and fires onImageClick with the local index', () => {
    const onImageClick = jest.fn()
    const images = [{ url: 'a.jpg' }, { url: 'b.jpg' }, { url: 'c.jpg' }]
    const { container } = render(<ManhattanGrid images={images} onImageClick={onImageClick} />)
    const tiles = container.querySelectorAll('img')
    expect(tiles).toHaveLength(3)
    tiles[1].click()
    expect(onImageClick).toHaveBeenCalledWith(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/ManhattanGrid.test.js`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `ManhattanGrid.js`**

```js
// components/image-displays/themes/manhattan/ManhattanGrid.js
import { getSizedUrl } from '../../../../common/imageUtils'
import { getImageRefUrl } from '../../../../common/assetRefs'

export default function ManhattanGrid({ images = [], onImageClick }) {
  return (
    <div className="manhattan-grid grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {images.map((img, i) => {
        const url = getImageRefUrl(img) || img.url || img
        return (
          <button
            key={i}
            type="button"
            className="block w-full overflow-hidden bg-black/5"
            onClick={() => onImageClick?.(i)}
            style={{ aspectRatio: '1 / 1' }}
          >
            <img
              src={getSizedUrl(url, 'display')}
              alt={img.caption || 'Photo'}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03] cursor-pointer"
            />
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Implement `FramedPhoto.js`**

```js
// components/image-displays/gallery/photo-block/FramedPhoto.js
import { getSizedUrl } from '../../../../common/imageUtils'

export default function FramedPhoto({ imageUrl, caption = '', onImageClick }) {
  return (
    <figure className="framed-photo mx-auto max-w-4xl w-full px-4 md:px-8 py-2">
      <div className="bg-white p-4 md:p-8 shadow-md">
        <img
          src={getSizedUrl(imageUrl, 'display')}
          alt={caption || 'Photo'}
          loading="lazy"
          className="w-full h-auto object-contain cursor-pointer"
          onClick={() => onImageClick?.(0)}
        />
      </div>
      {caption && <figcaption className="mt-3 text-center text-sm italic" style={{ color: 'var(--theme-text-muted)' }}>{caption}</figcaption>}
    </figure>
  )
}
```

- [ ] **Step 5: Branch photo/photos in `Gallery.js` for Manhattan**

Add imports:
```js
import ManhattanGrid from "../themes/manhattan/ManhattanGrid";
import FramedPhoto from "./photo-block/FramedPhoto";
```

In the `photos` case, after computing `imageRefs` and before the Kyoto return, add:
```js
              if (themeId === 'manhattan' && resolveVariant(block, themeId) === 'grid') {
                return (
                  <div key={`block-${index}`} className="photos-block" data-block-index={index} {...hoverProps}>
                    <ManhattanGrid images={imageRefs} onImageClick={makeClickHandler(index)} />
                  </div>
                );
              }
```

In the `photo` case, after the empty-guard and before the Kyoto `PhotoBlock` return, add:
```js
              if (themeId === 'manhattan' && resolveVariant(block, themeId) === 'framed') {
                return (
                  <div key={`block-${index}`} className="photo-block" data-block-index={index} {...hoverProps}>
                    <FramedPhoto imageUrl={getImageRefUrl(block.image || block.imageUrl)} caption={block.caption} onImageClick={makeClickHandler(index)} />
                  </div>
                );
              }
```

- [ ] **Step 6: Append Manhattan-scoped CSS to `styles/globals.css`**

```css
/* Manhattan theme — content region offset by the fixed left rail */
[data-theme="manhattan"] { background: var(--theme-bg, #fafafa); color: var(--theme-text, #141414); }
@media (min-width: 768px) {
  [data-theme="manhattan"] .theme-content { margin-left: var(--theme-rail-width, 260px); }
}
[data-theme="manhattan"] .gallery-container { max-width: 1200px; }
/* Manhattan full-width photo stays inside the content region (no 100vw bleed) */
[data-theme="manhattan"] .photo-block .w-screen { position: static; left: auto; right: auto; margin-left: 0; margin-right: 0; width: 100%; }
```

- [ ] **Step 7: Run tests**

Run: `npx jest __tests__/components/ManhattanGrid.test.js`
Expected: PASS.
Run: `npx jest`
Expected: full suite PASS.

- [ ] **Step 8: Commit**

```bash
git add components/image-displays/themes/manhattan/ManhattanGrid.js components/image-displays/gallery/photo-block/FramedPhoto.js components/image-displays/gallery/Gallery.js styles/globals.css __tests__/components/ManhattanGrid.test.js
git commit -m "feat(themes): Manhattan grid + framed photo renderers and scoped styling"
```

---

### Task 10: Wire the published page and admin preview to the theme

**Files:**
- Modify: `pages/sites/[username]/[slug].js`
- Modify: the admin preview mount that renders `Gallery` (grep: `GalleryPreview` / `Gallery` under `components/admin/`)
- Test: manual (dev server + browse); no new unit test (integration/visual).

**Context:** Wrap the rendered page in `ThemeProvider` with `siteConfig.design.theme`, pass `themeId` to `Gallery` and `variant={theme.navStyle}` to `SiteNav`, and add the `theme-content` class to the content wrapper so Manhattan's rail offset applies.

- [ ] **Step 1: Update `pages/sites/[username]/[slug].js`**

Add import:
```js
import ThemeProvider from '../../../components/image-displays/ThemeProvider'
import { getTheme } from '../../../common/themes'
```

Resolve the theme near the top of the component:
```js
  const theme = getTheme(siteConfig?.design?.theme)
```

Wrap the existing outer `<div className="min-h-screen bg-white font-sans relative">` return in `<ThemeProvider themeId={theme.id}>`, add `className="theme-content"` to the `<main>`, pass `variant={theme.navStyle}` to `SiteNav` (replacing the existing `navVariant` if that only handled sub-nav; keep sub-nav logic), and pass `themeId={theme.id}` to `Gallery`:

```jsx
  return (
    <ThemeProvider themeId={theme.id}>
    <div className="min-h-screen bg-white font-sans relative">
      <Head>{/* unchanged */}</Head>
      <SiteNav siteConfig={siteConfig} username={username} basePath={basePath} variant={theme.navStyle} />
      <main className="theme-content">
        <PageCover /* unchanged props */ />
        <Gallery /* unchanged props */ themeId={theme.id} />
      </main>
    </div>
    </ThemeProvider>
  )
```

- [ ] **Step 2: Update the admin preview mount**

Grep for the admin preview component that renders `<Gallery`. Wrap its output in `<ThemeProvider themeId={siteConfig?.design?.theme}>`, add `themeId={siteConfig?.design?.theme || 'kyoto'}` to that `Gallery`, and pass `variant` from `getTheme(...).navStyle` to its `SiteNav` if it renders one. Add `theme-content` to the preview content wrapper.

- [ ] **Step 3: Manual verification (dev server already running on :3000)**

Run the following and read the screenshots:
```bash
B=~/.claude/skills/gstack/browse/dist/browse
$B goto http://localhost:3000/admin
# switch theme to Manhattan in Site Settings, confirm the preview shows the left rail + grid
$B screenshot --viewport /tmp/manhattan-admin.png
```
Expected: Manhattan shows a fixed left rail and photo blocks tile into a grid; switching back to Kyoto restores the single-column look and prior variant selections.

- [ ] **Step 4: Full regression run**

Run: `npx jest`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add "pages/sites/[username]/[slug].js" components/admin/
git commit -m "feat(themes): wire published page + admin preview through ThemeProvider and theme navStyle"
```

---

## Self-Review

**Spec coverage:**
- Theme = `{ id, name, navStyle, tokens, blocks }` contract → Task 1. ✓
- In-repo registry, `getTheme` fallback → Task 1. ✓
- Content flat / presentation per-theme (`themeState`) → Tasks 2, 4. ✓
- Lossless switching + theme-local variants + default fallback → Tasks 2, 7. ✓
- Migration (legacy variants → `themeState.kyoto`; rename `design.theme`; fold `editorial`) → Task 3. ✓
- ThemeProvider token injection + context → Task 6. ✓
- Editor: theme switcher (Task 5) + variant picker from spec writing themeState (Task 4). ✓
- Manhattan shell (left rail, Task 8), grid + framed renderers + scoped CSS (Task 9), cover kept (published page renders `PageCover` unchanged, Task 10). ✓
- Hybrid rendering: shared renderers reused for text/video/testimonial/contact/page-gallery (Task 7); overrides only for photo/photos (Task 9). ✓
- Wire published + preview (Task 10). ✓

**Placeholder scan:** Social icons in Task 8 use letter placeholders — called out explicitly as intentional scope-limiting with a noted follow-up, not a hidden TODO. All code steps contain real code.

**Type consistency:** `resolveVariant(block, themeId)`, `setVariant(block, themeId, variantId)`, `getBlockSpec(themeId, type)`, `getTheme(id)`, `useTheme()`, theme object shape `{ id, name, navStyle, tokens, blocks[type].{defaultVariant,variants[],defaultAlign?} }` — consistent across Tasks 1-10. Variant ids used in Gallery mapping (`heading/subheading/body/quote`, `full-bleed/centered/side-by-side`, `full-width/framed`, `grid/masonry`, `stacked/masonry`, `photo-above/quote-above`) match the specs in Task 1.

**Deferred (out of scope, noted in spec Non-goals):** full CSS-var tokenization of every Kyoto style (Kyoto keeps hardcoded styles by design); marketplace loader; per-page theme; real social-icon set in the rail.
