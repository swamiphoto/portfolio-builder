# Editor polish: sidebar scrollbar, status label, logo font, navigation, footer

**Date:** 2026-07-15
**Status:** Approved, ready for planning

Six wrap-up fixes to the admin editor and published-site chrome. Two are pure polish (scrollbar, status label). The other four make the Design popup's navigation/footer controls real — today they write config that nothing reads — and add a logo-font control.

## Background / key finding

The Design popup (`components/admin/platform/SiteSettingsPopover.js`) exposes three controls — **Navigation** (`navStyle`), **Sub-navigation** (`subNavStyle`), **Footer Layout** (`footerLayout`) — that persist to `siteConfig.design` but are **never read by any render code**. Actual nav layout is decided entirely by the theme via `resolveNavStyle(theme)` in `common/navStyles.js`. This work wires these controls to real behavior (fewer options, functional) and adds a new logo-font control.

Themes and their nav renderings (`components/image-displays/page/SiteNav.js`):
- **Kyoto** → `cover-embedded` → falls through to the default top-right `NavList` (the active theme; primary target).
- **Manhattan** → `left-rail` → fixed vertical sidebar nav.
- **editorial** (legacy) → `header-dropdown` → `OverflowNav`. Best-effort only.

The nav tree (`common/pagesTree.js` → `buildNavTree`) already hangs each subpage off its parent as `children`; the main nav currently ignores that array.

---

## 1. Sidebar scrollbar (polish)

**Where:** `components/admin/platform/PlatformSidebar.js:863` — the pages list container `<div className="flex-1 overflow-y-auto">`.

**Change:** Add the existing `scroll-thin` class (defined in `styles/globals.css`). It already delivers everything requested: thin width, transparent track (no white background), thumb hidden until hover, muted sepia thumb color. Tune the hover thumb color if needed so it blends into the sidebar panel rather than standing out.

**Acceptance:** With many pages, the scrollbar is thin, has no white track, and its thumb only appears on hover.

---

## 2. Save/publish status label (polish)

**Where:** `StatusLine` in `components/admin/platform/PlatformSidebar.js:51-72`.

**Changes:**
- Unpublished edits: one line, **"Changes made {relativeTime}"** (e.g. "Changes made 3 min ago"). Drop the second "(Yet to be published)" line.
- Remove the green **"Published {time}"** state entirely — the publish toast ("Changes published") already conveys this. When there are no unpublished changes, render the reserved (hidden) placeholder instead.
- Keep `saving` ("Saving…") and `error` ("Save failed") states.
- Reduce the reserved vertical gap: lower `marginTop`/`marginBottom` in `base` (from 11/10 to ~7/7) and reserve exactly **one** line's height so the label appearing/disappearing never shifts the pages list below it.

**Acceptance:** Editing shows a single "Changes made X" line; after publishing the label area is empty (toast only); the pages list never wiggles as status changes; the gap above Pages is visibly tighter.

---

## 3. Logo font (new feature)

**Config:** add `siteConfig.logoFont` with values `'theme' | 'modern' | 'editorial'`, default `'theme'`. Add to defaults in `common/siteConfig.js`. Theme-independent (per the editing invariant: store theme-independent data; the sidebar is the source of edits).

**Control:** in `SiteSettingsPopover.js`, inside the Logo block (~line 653-685), show a **"Logo font"** toggle **only when `logoType === 'sitename'`** (hidden for image logos). Options:
- **Modern** — Inter, uppercase, wide tracking (already loaded via `_document.js`).
- **Editorial** — Fraunces (already loaded).
- **Default** — the theme's current wordmark styling.

**Render:** the site-name wordmark (`brand`) in `SiteNav.js` is styled differently per nav style. Add a small helper (e.g. `logoFontStyle(logoFont)` returning `{ fontFamily, textTransform, letterSpacing }` for the non-default options) and apply it to the site-name text in every nav rendering: left-rail (desktop + mobile), header-dropdown, and cover-embedded/default. `'theme'` = leave the existing per-style classes untouched. `'modern'`/`'editorial'` override fontFamily + tracking. Only applies when the logo is the site name, not an uploaded image.

**Acceptance:** With logo = "Site name", switching Modern/Editorial/Default visibly changes the wordmark font across nav styles; image logos are unaffected; the control is hidden when logo = "Image".

---

## 4. Navigation — two real options

**Config:** `siteConfig.design.navStyle` becomes `'links' | 'menu'`, default `'links'`. Update `common/siteConfig.js` default from `'minimal'` to `'links'`. Read-time normalization: any legacy/unknown value (`minimal`/`centered`/`fixed`) → `'links'`.

**Control:** in the Design popup replace the three-option Navigation toggle with two:
- `{ value: 'links', label: '1', title: 'Links' }`
- `{ value: 'menu',  label: '2', title: 'Menu' }`

Show this control **only for top-nav themes** (Kyoto / `cover-embedded`). Hide it for `left-rail` (Manhattan), which is inherently a menu. (Gate on the resolved nav style of the selected theme.)

**Render (SiteNav, `cover-embedded`/default path, currently the bottom `return`):**
- **Links** — current behavior (top-right `NavList`).
- **Menu** — render a hamburger button (top-right) that opens the themed full-screen overlay used today for mobile, now on desktop too. The overlay lists top-level nav items; subpages follow the sub-nav rule in §5.

Left-rail is unaffected by this toggle.

**Acceptance:** On the Kyoto-style theme, "Menu" replaces the inline top links with a hamburger that opens a full-screen overlay; "Links" keeps inline links; the Navigation control does not appear when a left-rail theme is selected.

---

## 5. Sub-navigation — real dropdown in the main nav

**Meaning (corrected):** controls how a **top-level nav link that has subpages** behaves in the main nav.

**Config:** `siteConfig.design.subNavStyle` = `'dropdown' | 'inline'`, default `'dropdown'` (keep). Control unchanged in the popup (Dropdown / "Links below page title").

**Render:**
- **Dropdown** — in the main nav, a top-level item with `children.length > 0` shows a caret next to its label; hover/click reveals a themed dropdown menu listing its subpages. Style the dropdown to match the theme (reuse the existing "More" overflow dropdown styling in `OverflowNav` as the visual reference: soft background, hairline border, subtle shadow). Clicking the parent still navigates to the parent page; the caret/dropdown reveals children. Applies to the top-nav renderings (`cover-embedded` NavList primary; `header-dropdown` OverflowNav best-effort).
- **Links below page title** — current behavior: subpages render inline under the page title in `GalleryCover` (`components/image-displays/gallery/gallery-cover/GalleryCover.js`). Under this mode the main nav does **not** show the dropdown.

**Left-rail:** no top-nav to drop from — render subpages as indented items beneath their parent in the vertical rail (graceful degradation), independent of the dropdown/inline toggle.

**Preview parity:** the admin preview drives nav via `onPageClick`/`onChildPageClick`; the dropdown must work in both published (`<a href>`) and preview (`onPageClick`) modes, matching how `NavLink` already branches.

**Acceptance:** With subpages under a nav item and Dropdown selected, the parent shows a caret and reveals a styled subpage menu on hover/click in both preview and published views; with "Links below page title" selected, no dropdown appears and subpages show under the page title as today.

---

## 6. Footer — renumber and make real

**Config:** `siteConfig.design.footerLayout` = `'simple' | 'expanded'`, default `'simple'` (was `'standard'`; update `common/siteConfig.js`). Add a separate visibility toggle `siteConfig.footer.hidden` (boolean, default `false`). Read-time normalization: legacy `none` → treat as hidden; `compact`/`standard`/`full`/unknown → `'simple'` unless explicitly `'expanded'`.

**Control:** in the Design popup, replace the four-option (0/1/2/3) Footer Layout toggle with two, numbered from 1:
- `{ value: 'simple',   label: '1', title: 'Simple' }`
- `{ value: 'expanded', label: '2', title: 'Expanded' }`

Add a footer show/hide toggle (either here in the Design popup or beside the existing "Footer text" field in the identity section — implementer's choice, keep it discoverable).

**Render (`components/image-displays/page/SiteFooter.js`, currently ignores layout):**
- `footer.hidden === true` → render nothing.
- **Simple** — current centered copyright line (`footer.customText` or `© YEAR SiteName`).
- **Expanded** — copyright line plus a row of social icons/links derived from `siteConfig.contact` (keys `instagram, facebook, twitter, tiktok, youtube, website`, matching the left-rail's `socialKeys` logic). Only render icons for populated contact fields; if none are set, fall back to the simple layout.

**Acceptance:** Footer numbering starts at 1; Expanded shows social links from contact config; Simple shows the copyright line; the hide toggle removes the footer entirely.

---

## Files touched (summary)

- `common/siteConfig.js` — defaults: `logoFont`, `design.navStyle`, `design.subNavStyle`, `design.footerLayout`, `footer.hidden`.
- `components/admin/platform/PlatformSidebar.js` — scrollbar class (§1), StatusLine (§2).
- `components/admin/platform/SiteSettingsPopover.js` — logo-font control (§3), navigation 2-option + theme gating (§4), footer 2-option + hide toggle (§6).
- `components/image-displays/page/SiteNav.js` — logo font styling (§3), menu/hamburger mode (§4), sub-nav dropdown + caret + left-rail indented children (§5).
- `components/image-displays/gallery/gallery-cover/GalleryCover.js` — unchanged behavior for inline sub-nav (§5), confirm it stays gated by `subNavStyle === 'inline'`.
- `components/image-displays/page/SiteFooter.js` — layout variants + hidden (§6).
- Possibly a small shared resolver for read-time normalization of `design.*` values.

## Non-goals

- No changes to Manhattan's core left-rail visual design beyond indented subpages.
- No new fonts loaded (Inter + Fraunces already available).
- No redesign of the mobile overlay; the hamburger "Menu" mode reuses it on desktop.
- Legacy `header-dropdown`/editorial theme gets best-effort dropdown support only.
