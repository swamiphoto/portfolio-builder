# Site Design Consolidation + Hero Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the site-design brush into the Site Settings popover as a "Design" tab, and add a Showcase / Cover variant toggle to the page hero so any page can be styled as a marketing cover with CTA buttons — without introducing a separate cover entity or page type.

**Architecture:**
- Merge `SiteDesignPopover` → `SiteSettingsPopover` as a new tab; delete the standalone popover and the brush button in the sidebar header.
- Extend `page.cover` with three new fields: `variant` (`'showcase' | 'cover'`), `primaryCta`, `secondaryCta`. Default variant is `'showcase'` (current behavior — image + title/description).
- Add a segmented control + conditional CTA fields in `PageSettingsPanel` hero editor.
- Render CTA buttons in `PageCover` only when variant is `'cover'`.

**Tech Stack:** Next.js (pages router), React, Tailwind. No new dependencies.

---

## File Structure

**Modified:**
- `components/admin/platform/SiteSettingsPopover.js` — add Design tab with theme/nav/sub-nav/footer-layout sections (moved from SiteDesignPopover)
- `components/admin/platform/PlatformSidebar.js` — remove brush button, brush ref, SiteDesignPopover import + render
- `components/admin/platform/PageSettingsPanel.js` — add Showcase/Cover segmented control + CTA fields in hero editor
- `components/image-displays/page/PageCover.js` — render primary/secondary CTAs when `variant === 'cover'`

**Deleted:**
- `components/admin/platform/SiteDesignPopover.js` — content fully migrated to SiteSettingsPopover

**Unmodified (by design):**
- `common/siteConfig.js` — `defaultPage().cover = null` stays; the new fields are always applied via defaults in the UI layer. No schema migration needed since existing covers just read `variant === undefined` as falsy (treated as 'showcase').

---

## Task 1: Add Design tab to SiteSettingsPopover

**Files:**
- Modify: `components/admin/platform/SiteSettingsPopover.js`

- [ ] **Step 1: Add 'design' to the tab list and a matching tab-body block**

In `components/admin/platform/SiteSettingsPopover.js`, change the tabs array and add the Design tab UI. The existing tabs array is on line 109: `{['site', 'domain', 'advanced'].map((t) => (`. Change it to `{['site', 'design', 'domain', 'advanced'].map((t) => (`.

After the Site tab block (ends at line 158: `</Section>\n      </>}`), and before the Domain tab block (starts at line 161: `{tab === 'domain' && <>`), insert this new block:

```jsx
      {/* ── Design tab ── */}
      {tab === 'design' && <>
        <Section label="Theme">
          <select
            className="w-full text-sm text-stone-700 border-b border-stone-200 p-0 pb-1 outline-none bg-transparent"
            value={config.design?.theme || 'minimal-light'}
            onChange={(e) => update({ design: { ...(config.design || {}), theme: e.target.value } })}
          >
            <option value="minimal-light">Minimal Light</option>
            <option value="minimal-dark">Minimal Dark</option>
            <option value="editorial">Editorial</option>
          </select>
        </Section>

        <Section label="Navigation">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { value: 'minimal',  label: '1', title: 'Minimal'  },
              { value: 'centered', label: '2', title: 'Centered' },
              { value: 'fixed',    label: '3', title: 'Fixed'    },
            ].map(({ value, label, title }) => {
              const active = (config.design?.navStyle || 'minimal') === value
              return (
                <button
                  key={value}
                  onClick={() => update({ design: { ...(config.design || {}), navStyle: value } })}
                  title={title}
                  className={`min-w-[28px] px-2 py-0.5 text-xs rounded-full border transition-colors ${
                    active
                      ? 'bg-stone-800 border-stone-800 text-white'
                      : 'border-stone-300 text-stone-500 hover:border-stone-500 hover:text-stone-700'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </Section>

        <Section label="Sub-navigation">
          <select
            className="w-full text-sm text-stone-700 border-b border-stone-200 p-0 pb-1 outline-none bg-transparent"
            value={config.design?.subNavStyle || 'dropdown'}
            onChange={(e) => update({ design: { ...(config.design || {}), subNavStyle: e.target.value } })}
          >
            <option value="dropdown">Dropdown</option>
            <option value="inline">Links below page title</option>
          </select>
        </Section>

        <Section label="Footer Layout">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { value: 'none',     label: '0', title: 'None'     },
              { value: 'compact',  label: '1', title: 'Compact'  },
              { value: 'standard', label: '2', title: 'Standard' },
              { value: 'full',     label: '3', title: 'Full'     },
            ].map(({ value, label, title }) => {
              const active = (config.design?.footerLayout || 'standard') === value
              return (
                <button
                  key={value}
                  onClick={() => update({ design: { ...(config.design || {}), footerLayout: value } })}
                  title={title}
                  className={`min-w-[28px] px-2 py-0.5 text-xs rounded-full border transition-colors ${
                    active
                      ? 'bg-stone-800 border-stone-800 text-white'
                      : 'border-stone-300 text-stone-500 hover:border-stone-500 hover:text-stone-700'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </Section>
      </>}
```

Note: we deliberately inline the pill selector here rather than creating a shared component — only two sections need it, and the file is already self-contained.

- [ ] **Step 2: Verify in browser**

Start/reload the dev server. Open the admin UI, click the site settings gear, confirm 4 tabs appear: **site | design | domain | advanced**. Click the Design tab and change theme, nav style, sub-nav, and footer layout. Confirm changes persist after refresh (autosave writes to siteConfig.design).

Expected: All four design controls work identically to the current SiteDesignPopover.

- [ ] **Step 3: Commit**

```bash
git add components/admin/platform/SiteSettingsPopover.js
git commit -m "feat: add Design tab to SiteSettingsPopover"
```

---

## Task 2: Remove brush button + SiteDesignPopover wiring from PlatformSidebar

**Files:**
- Modify: `components/admin/platform/PlatformSidebar.js`

- [ ] **Step 1: Remove the SiteDesignPopover import**

In `components/admin/platform/PlatformSidebar.js`, delete line 8:
```js
import SiteDesignPopover from './SiteDesignPopover'
```

- [ ] **Step 2: Remove the brush-related state and ref**

Delete lines 40–41:
```js
const [siteDesignOpen, setSiteDesignOpen] = useState(false)
const siteDesignBrushRef = useRef(null)
```

- [ ] **Step 3: Remove the brush button from the header**

Delete the entire brush `<button>` block (lines 369–378):
```jsx
<button
  ref={siteDesignBrushRef}
  onClick={() => setSiteDesignOpen(v => !v)}
  title="Site design"
  className="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors flex-shrink-0"
>
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
  </svg>
</button>
```

The settings gear and account avatar remain. Result: the sidebar header shows `[site name] [gear] [avatar]` with no brush.

- [ ] **Step 4: Remove the SiteDesignPopover render block**

Delete lines 447–454:
```jsx
{siteDesignOpen && (
  <SiteDesignPopover
    siteConfig={siteConfig}
    anchorEl={siteDesignBrushRef.current}
    onUpdate={onConfigChange}
    onClose={() => setSiteDesignOpen(false)}
  />
)}
```

- [ ] **Step 5: Verify in browser**

Reload admin. Confirm sidebar header shows gear + avatar only (no brush). Confirm no console errors.

Expected: Design controls now only reachable via Site Settings → Design tab.

- [ ] **Step 6: Commit**

```bash
git add components/admin/platform/PlatformSidebar.js
git commit -m "refactor: remove brush button; Design is now a tab in Site Settings"
```

---

## Task 3: Delete SiteDesignPopover.js

**Files:**
- Delete: `components/admin/platform/SiteDesignPopover.js`

- [ ] **Step 1: Confirm no remaining imports**

Run: `grep -rn "SiteDesignPopover" /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/components /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/pages /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/common`

Expected: no matches.

- [ ] **Step 2: Delete the file**

```bash
rm components/admin/platform/SiteDesignPopover.js
```

- [ ] **Step 3: Commit**

```bash
git add -A components/admin/platform/SiteDesignPopover.js
git commit -m "chore: delete obsolete SiteDesignPopover"
```

---

## Task 4: Add Showcase/Cover variant toggle + CTA fields in PageSettingsPanel

**Files:**
- Modify: `components/admin/platform/PageSettingsPanel.js`

**Context:** The hero editor currently shows Title + Description when expanded (lines 99–119). We add a segmented control beneath Description that controls `page.cover.variant`. When `'cover'` is selected, two CTA sub-editors appear (Primary and Secondary CTA: label + URL or anchor).

- [ ] **Step 1: Add cover helpers inside the component**

In `components/admin/platform/PageSettingsPanel.js`, after the existing `updateTitle` function (after line 19, before line 21 `const isLink = ...`), add:

```js
function updateCover(patch) {
  update({ cover: { ...(page.cover || {}), ...patch } })
}

function updateCta(key, patch) {
  updateCover({ [key]: { ...(page.cover?.[key] || {}), ...patch } })
}

const variant = page.cover?.variant || 'showcase'
```

- [ ] **Step 2: Replace the expanded body with variant toggle + CTA fields**

Replace the entire expanded body block (lines 98–120 — the `{expanded && (...)}` block inside the page hero branch, ending just before `{designOpen && (`) with:

```jsx
{expanded && (
  <div className="px-3 pb-3 border-t border-stone-100 pt-3 space-y-4">
    <div>
      <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Title</div>
      <input
        className="w-full border-b border-stone-200 p-0 pb-1 text-sm font-medium text-stone-800 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
        placeholder="Page title"
        value={page.title || ''}
        onChange={(e) => updateTitle(e.target.value)}
      />
    </div>
    <div>
      <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Description</div>
      <textarea
        className="w-full border-b border-stone-200 p-0 pb-1 text-sm text-stone-600 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
        placeholder="Optional"
        rows={2}
        value={page.description || ''}
        onChange={(e) => update({ description: e.target.value })}
      />
    </div>

    <div>
      <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1.5">Style</div>
      <div className="inline-flex rounded-md border border-stone-200 overflow-hidden text-xs">
        {[
          { value: 'showcase', label: 'Showcase' },
          { value: 'cover',    label: 'Cover'    },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => updateCover({ variant: value })}
            className={`px-3 py-1 transition-colors ${
              variant === value
                ? 'bg-stone-800 text-white'
                : 'bg-white text-stone-500 hover:text-stone-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-stone-400 mt-1">
        {variant === 'cover'
          ? 'Full-viewport landing with call-to-action buttons.'
          : 'Image with title and gallery links below.'}
      </p>
    </div>

    {variant === 'cover' && (
      <>
        <div>
          <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1">Primary button</div>
          <div className="space-y-1.5">
            <input
              className="w-full border-b border-stone-200 p-0 pb-1 text-sm text-stone-700 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
              placeholder="Label (e.g. View portfolio)"
              value={page.cover?.primaryCta?.label || ''}
              onChange={(e) => updateCta('primaryCta', { label: e.target.value })}
            />
            <input
              className="w-full border-b border-stone-200 p-0 pb-1 text-xs text-stone-500 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
              placeholder="URL or #anchor"
              value={page.cover?.primaryCta?.href || ''}
              onChange={(e) => updateCta('primaryCta', { href: e.target.value })}
            />
          </div>
        </div>

        <div>
          <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1">Secondary button</div>
          <div className="space-y-1.5">
            <input
              className="w-full border-b border-stone-200 p-0 pb-1 text-sm text-stone-700 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
              placeholder="Label (e.g. Contact me)"
              value={page.cover?.secondaryCta?.label || ''}
              onChange={(e) => updateCta('secondaryCta', { label: e.target.value })}
            />
            <input
              className="w-full border-b border-stone-200 p-0 pb-1 text-xs text-stone-500 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
              placeholder="URL or #anchor"
              value={page.cover?.secondaryCta?.href || ''}
              onChange={(e) => updateCta('secondaryCta', { href: e.target.value })}
            />
          </div>
        </div>
      </>
    )}
  </div>
)}
```

- [ ] **Step 3: Verify in browser**

Reload admin. Select any page. In the hero card (top of the page editor sidebar), confirm the Style segmented control appears under Description. Toggle to **Cover** — confirm Primary + Secondary button fields appear. Fill in labels and URLs; toggle back to **Showcase** — confirm the CTA fields disappear but the data is still stored (toggle back to Cover; values are retained).

Expected: Clean toggle, CTA fields only visible in Cover mode, data persists across toggles.

- [ ] **Step 4: Commit**

```bash
git add components/admin/platform/PageSettingsPanel.js
git commit -m "feat: add Showcase/Cover variant toggle and CTA fields to page hero editor"
```

---

## Task 5: Render CTA buttons in PageCover when variant is 'cover'

**Files:**
- Modify: `components/image-displays/page/PageCover.js`

**Context:** `PageCover` currently just renders a full-bleed image. For the Cover variant, we also render a centered overlay with title, subtitle, and up to two CTA buttons.

- [ ] **Step 1: Replace the component**

Replace the entire contents of `components/image-displays/page/PageCover.js` with:

```jsx
// components/image-displays/page/PageCover.js
import { getSizedUrl } from '../../../common/imageUtils'

function CtaButton({ cta, variant }) {
  if (!cta?.label) return null
  const href = cta.href || '#'
  const base = 'inline-flex items-center px-5 py-2.5 text-sm font-medium transition-colors'
  const style = variant === 'primary'
    ? 'bg-white text-stone-900 hover:bg-stone-100'
    : 'border border-white text-white hover:bg-white/10'
  return (
    <a href={href} className={`${base} ${style}`}>
      {cta.label}
    </a>
  )
}

export default function PageCover({ cover, title, description }) {
  if (!cover || !cover.imageUrl) return null
  const heightClass = cover.height === 'partial' ? 'h-[60vh]' : 'h-[100vh]'
  const isCover = cover.variant === 'cover'

  return (
    <section className={`relative w-full ${heightClass} overflow-hidden`}>
      <img
        src={getSizedUrl(cover.imageUrl, 'large') || cover.imageUrl}
        alt={cover.overlayText || title || ''}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {isCover && (
        <div className="absolute inset-0 bg-black/30" />
      )}
      {isCover && (
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white px-6">
          {title && <h1 className="text-4xl md:text-6xl font-light tracking-tight mb-3">{title}</h1>}
          {description && <p className="text-base md:text-lg text-white/80 max-w-xl mb-8">{description}</p>}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <CtaButton cta={cover.primaryCta} variant="primary" />
            <CtaButton cta={cover.secondaryCta} variant="secondary" />
          </div>
        </div>
      )}
    </section>
  )
}
```

Key changes:
1. Accept a new `description` prop so the Cover variant can show the page description under the title.
2. Add `isCover` flag (renders overlay, title, description, CTAs only in Cover variant — preserving current Showcase behavior: plain image, no overlay).
3. Add a dim `bg-black/30` for legibility in Cover mode.
4. Two CTA button styles: primary (filled white) and secondary (outlined white).

- [ ] **Step 2: Ensure callers pass the description prop**

Run: `grep -rn "PageCover" /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/components /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/pages --include="*.js" --include="*.jsx"`

For each call site (excluding the component itself and the backup dir), add `description={page.description}` to the props. Since `description` defaults to `undefined` when not passed, existing call sites that don't pass it continue to work — but update them anyway so Cover mode renders correctly from wherever it's called.

- [ ] **Step 3: Verify in browser**

Reload admin. Find a page where you set variant='cover' in Task 4. Add a cover image if there isn't one. Open the published preview (or the preview pane — whichever currently renders PageCover). Confirm:
- Title and description appear centered on the cover
- Primary button renders as filled white
- Secondary button renders as outlined white
- Switch the page's variant back to 'showcase' — overlay and buttons disappear, just the image remains (current behavior)

Expected: Cover variant now shows a proper marketing hero; Showcase variant is unchanged.

- [ ] **Step 4: Commit**

```bash
git add components/image-displays/page/PageCover.js
git add -u
git commit -m "feat: render title, description, and CTAs in PageCover for Cover variant"
```

---

## Self-Review Notes

- **Spec coverage:**
  - Site Design → Site Settings Design tab: Task 1
  - Remove brush icon: Task 2
  - Delete orphan popover: Task 3
  - Hero variant toggle: Task 4
  - CTA fields: Task 4
  - CTA rendering: Task 5
  - Page-level design tab: intentionally skipped per user direction ("page settings doesn't need one yet")
  - Cover-as-separate-block: intentionally skipped; single hero with variant is the agreed design

- **Data model:** `page.cover` existing shape is `{ imageUrl, height, overlayText }`; this plan adds optional `variant`, `primaryCta`, `secondaryCta`. No migration — `variant === undefined` reads as Showcase (default). Absent CTAs render as null (CtaButton short-circuits on missing label).

- **No placeholders, no TBDs.** Every code block is the exact content to paste.

- **No tests:** This codebase has no UI test framework in scope; verification is via manual browser checks documented in each task.
