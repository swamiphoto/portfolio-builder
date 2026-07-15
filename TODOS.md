# TODOS

## Testing

### Fix pre-existing test failures (stale tests on main)
**Priority:** P1

Four tests were already failing on `main` before the multi-theme branch (unrelated to that work). They should be updated to match current code:

- `__tests__/common/siteConfig.test.js` — `sets default theme to minimal-light` expects `minimal-light`, but `createDefaultSiteConfig` now returns `kyoto`. Update the expectation.
- `__tests__/common/siteConfig.test.js` — `returns a config with one home page` assertion no longer matches the current default page shape.
- `__tests__/common/siteConfig.unifiedModel.test.js` — `home page reserves clientFeatures with all flags off` expects the old flat `{ enabled, passwordHash, watermarkEnabled, votingEnabled, downloadEnabled }` shape; code now uses `{ enabled, downloads, favorites, comments, purchase }`.
- `__tests__/components/CrossBlockDrag.test.js` — `dropping a cross-block drag payload appends image to target block` fails because `BlockCard` calls `useSession()` (BlockCard.js:147) without a `<SessionProvider>` wrapper in the test render. Wrap the render in a mock SessionProvider.

Noticed by: gstack /ship on branch `swamiphoto/web-import`, 2026-07-14.

## Completed
