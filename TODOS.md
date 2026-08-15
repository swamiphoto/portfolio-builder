# TODOS

## Landing Page

### Responsive + accessibility pass (from /ship review, 2026-08-07)
**Priority:** P2

Pre-existing issues found during the landing-redesign pre-landing review (PR #33), deferred to a follow-up branch:

- Footer `/privacy` and `/terms` links 404 (no pages exist)
- Sign-in control is a `<span onClick>` — not keyboard-accessible; make it a button
- AdminShot mock uses fixed computed height; squashes below ~1160px viewports
- Footer flex row lacks `flexWrap` — overflows at ~375px
- `T.muted` on `T.card` ≈ 3.5:1 contrast, below WCAG AA for small text
- AdminShot fake-UI text should be `aria-hidden`

Noticed by: gstack /ship on branch `swamiphoto/landing-page-redesign`, 2026-08-07.

## Testing

### Fix pre-existing test failures (stale tests on main)
**Priority:** P1

Four tests were already failing on `main` before the multi-theme branch (unrelated to that work). They should be updated to match current code:

- `__tests__/common/siteConfig.test.js` — `sets default theme to minimal-light` expects `minimal-light`, but `createDefaultSiteConfig` now returns `kyoto`. Update the expectation.
- `__tests__/common/siteConfig.test.js` — `returns a config with one home page` assertion no longer matches the current default page shape.
- `__tests__/common/siteConfig.unifiedModel.test.js` — `home page reserves clientFeatures with all flags off` expects the old flat `{ enabled, passwordHash, watermarkEnabled, votingEnabled, downloadEnabled }` shape; code now uses `{ enabled, downloads, favorites, comments, purchase }`.
- `__tests__/components/CrossBlockDrag.test.js` — `dropping a cross-block drag payload appends image to target block` fails because `BlockCard` calls `useSession()` (BlockCard.js:147) without a `<SessionProvider>` wrapper in the test render. Wrap the render in a mock SessionProvider.

Noticed by: gstack /ship on branch `swamiphoto/web-import`, 2026-07-14.

## Library

### Harden /api/admin/library PUT against stale-snapshot clobbers
**Priority:** P2

Every library mutator (AdminLibrary handlers, PhotoPickerModal `registerCaptures`) PUTs a full `{portfolios, galleries, assets}` built from a client-cached snapshot; the API replaces `assets` wholesale (last writer wins). Two tabs or a long multi-file upload racing a caption edit can silently drop server-side changes. Options: refetch-before-PUT, server-side merge by assetId, or move capture registration fully server-side into upload-file.js. Pattern is app-wide — fix consistently, not per call site.

Noticed by: pre-landing review on branch `swamiphoto/pending-go-live`, 2026-08-14 (also flagged by two prior reviews the same day).

## Completed
