# Sidebar: cover row, theme bar, and honest home/empty states

**Date:** 2026-08-05
**Status:** Approved (pending written-spec review)

## Problem

Three related gaps in the Portfolio Studio left sidebar:

1. **Home isn't assigned to the first page.** `siteConfig.homePageId` stays `null` until the
   user explicitly picks "Set as home," so the home icon never appears on their first real page.

2. **The cover page has no presence in the Pages list.** It's editable only by digging into
   Site Settings, and there's no visible row for it in the sidebar.

3. **Theme + design controls are buried** in Site Settings → Design. The user wants them
   surfaced directly above the Pages section.

Investigating #1 and #2 surfaced the root cause tying them together: a **seeded hidden page**.

### Root cause: the seeded hidden `home` page

Every new site is born with one page (`common/siteConfig.js`):

```js
pages: [ defaultPage({ id: 'home', title: 'Home', showInNav: false }) ]
```

This page is invisible everywhere in the sidebar (`showInNav: false`, and the Hidden-pages list
filters out `p.id === 'home'`), yet it does two jobs that are **coding crutches, not product
requirements**:

- **Render fallback** — `resolveHomePage` falls back to `id === 'home'` so the site root always
  has something to render.
- **Cover-page stand-in** — `pages/admin/index.js`:
  `const isCoverPageSelected = selectedPage?.id === 'home' && siteConfig.hasCoverPage !== false`.
  The cover is a settings object (`hasCoverPage` + `cover`), not a page, but the admin fakes a page
  so there's something clickable to select when editing the cover.

There is **no product spec** requiring a hidden page. The product intent is: a new site starts with
**zero pages**. So we remove the seed and make the model honest — which is also exactly what
feature #2 (a real Cover page row) needs.

## Decisions

- **D1.** Remove the seeded hidden `home` page. New sites start with `pages: []`.
- **D2.** The cover stays a first-class settings object (`hasCoverPage: true` by default, `cover: {…}`).
  It is **not** a page. Selecting/editing the cover is driven by an explicit `coverSelected` flag,
  replacing the `selectedPage.id === 'home'` hack.
- **D3.** The first *visible* page a user creates becomes home: if `homePageId` is unset, set it to
  that page. The sidebar home icon reflects the *resolved* home so it is never blank.
- **D4.** Add a "Cover page" reserved row at the top of the Pages list (page-item sized).
- **D5.** Add a theme bar above the Pages section: current theme as a dropdown (caret switches theme),
  brush icon just left of the caret opens a design popover with the same controls as
  Site Settings → Design **minus** the theme selector.
- **D6.** Empty-state behavior (see matrix). When the cover is on but there are no pages, keep the
  cover CTA button visible; clicking it shows a "coming soon" message instead of navigating.

## Feature detail

### 1. First visible page → home (D3)

- On creating the first visible (`showInNav !== false`, non-link) page, if `siteConfig.homePageId`
  is falsy, set `homePageId` to the new page id. Later pages don't change it.
- The sidebar's per-row `isHome` should reflect the **resolved** home (reuse the existing
  `resolveHomePage` ordering) so the icon shows immediately even before `homePageId` is persisted —
  but with the seed gone and D3 in place, the persisted value will normally be set the moment a real
  page exists.

### 2. Cover page row (D4)

A reserved row at the **top of the Pages list**, styled to match a page item (same height/thumb).
It is not draggable and not part of `pages`. Clicking it selects the cover (sets `coverSelected`),
which opens the existing cover editor. States:

- **Cover on** → label "Cover page"; thumbnail = `cover.imageUrl`, or, when no image is set yet, the
  same warm gradient the cover itself falls back to (`COVER_FALLBACK_BG` from `common/coverBackground.js`),
  so the row matches what the cover renders.
- **Cover off** → muted "Add a cover page" row that re-enables the cover (`hasCoverPage: true`) and
  selects it.

Replaces the `selectedPage.id === 'home'` cover proxy in `pages/admin/index.js` with a `coverSelected`
state. `handleViewCover` sets `coverSelected` instead of selecting the seeded page.

### 3. Theme bar (D5)

A full-width bar above the Pages section header:

- Left: the **current theme name** (from `getTheme(config.design.theme).name`).
- Right: a **caret** that opens the theme dropdown (options from the theme registry, same list Site
  Settings uses). Selecting writes `config.design.theme` — live, preview updates immediately.
- **Just left of the caret: a brush icon** opening a design popover containing the same controls as
  Site Settings → Design **except the theme selector**: logo font, navigation, nested pages, social
  links. These controls are extracted into a shared component so Site Settings and the sidebar render
  the identical set (Site Settings keeps theme + the rest; the sidebar splits theme into the dropdown).

Site Settings → Design is otherwise unchanged.

### 4. Empty-state / preview behavior (D6)

| Cover | Pages | Behavior |
|-------|-------|----------|
| On    | ≥1    | Normal — cover + pages. CTA navigates to home. |
| On    | 0     | Cover renders fully, **including the CTA button**. Clicking the CTA shows a "coming soon" message instead of navigating (nudges the user to add pages). |
| Off   | 0     | "Site under construction" placeholder — nothing else to show. |
| Off   | ≥1    | Home page renders normally. |

- The CTA "coming soon" behavior applies in both the admin preview and the published site. Implement
  by giving the primary cover button an `onClick` (the `CtaButton` component already supports
  `onClick`) that shows the message when there are no pages, rather than an `href`.
- "Site under construction" is a small centered placeholder shown in place of page content when
  `!hasCoverPage && pages.length === 0`.

## Blast radius (files touched)

- `common/siteConfig.js` — remove seeded page (`pages: []`); `createDefaultSiteConfig`.
- `pages/api/admin/reset.js` — same seed removal.
- `pages/admin/index.js` — `resolveEditingPage` `id:'home'` fallback; default selection (line ~280);
  `isCoverPageSelected` → `coverSelected` state; `handleViewCover` / `handleDisableCover` /
  `handleCreateFirstPage`; empty-state rendering.
- `components/admin/platform/PagePreview.js` — `resolveHomePage` `id:'home'` fallback; cover-only and
  under-construction preview states; CTA "coming soon" wiring.
- `components/admin/platform/PlatformSidebar.js` — cover row; theme bar; brush design popover; drop the
  `p.id !== 'home'` filter; home icon reflects resolved home.
- `components/admin/platform/SiteSettingsPopover.js` + `designControls.js` — extract shared design
  controls (minus theme) for reuse in the sidebar brush popover.
- `components/image-displays/page/PageCover.js` — primary button `onClick` "coming soon" path.
- `common/coverBackground.js` — reuse `COVER_FALLBACK_BG` for the empty cover-row thumbnail.
- `pages/sites/[username]/index.js` — published root: render cover-only / under-construction when zero
  pages.
- Tests: `__tests__/common/siteConfig.test.js`, `__tests__/common/siteConfig.unifiedModel.test.js`
  (drop assertions that the seeded `home` page exists), plus new coverage for D3/D4/D6.

## Testing

- **Unit:** `createDefaultSiteConfig` returns `pages: []` and `hasCoverPage: true`. First-page-created
  sets `homePageId`. Resolved-home icon logic. Cover-row state (on/off/with-image).
- **Component:** Cover row renders correct label/thumb per state and selects the cover on click.
  Theme bar dropdown writes `design.theme`; brush popover shows the design controls minus theme.
- **Behavior:** Empty-state matrix — cover-only with CTA "coming soon"; under-construction placeholder.

## Out of scope

- No changes to the theme registry / adding new themes.
- No changes to Site Settings beyond extracting the shared design-controls component.
- No changes to import/onboarding page generation (imported sites already create real pages).
