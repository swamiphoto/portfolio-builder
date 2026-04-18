# Selling Agent V1 Implementation Plan

> **For agentic workers:** Use existing library/admin patterns. Do not invent a parallel storage model. Keep edits scoped to the current Next.js pages-router app and per-user JSON configs.

**Goal:** Ship a first Selling area for photographers that turns library assets into ready-to-sell listings via an approval queue. V1 supports one export-style print destination and one structured licensing destination.

**Non-goal:** Publication submissions, browser automation against third-party UIs, dynamic pricing, or a generic "submit everywhere" agent.

## Why This Plan

This repo already has the right primitives:

- per-user authenticated admin routes
- `site-config.json` for page state
- `library-config.json` for canonical asset state
- admin UIs for library and page editing

The right move is to extend those seams. Not to bolt on a second mini product.

## Key Architecture Decisions

### 1. Keep sellability metadata on the canonical asset

Asset-level truth belongs in `library-config.json`.

That includes:

- whether the asset is sellable
- shared title/caption/keywords/category
- rights and release state
- default pricing preset
- destination eligibility

Reason:

- this data follows the asset everywhere
- it is needed before queue generation
- it will later support store and publication workflows too

### 2. Put queue history, destinations, and pricing presets in a separate `selling-config.json`

Do **not** stuff queue state into `library-config.json`.

Use a new per-user config:

- `pricingPresets`
- `destinations`
- `listingRecords`
- `submissionHistory`

Reason:

- library state is asset truth
- selling state is workflow and operational history
- this avoids mixing immutable-ish asset metadata with noisy queue actions

### 3. Derive the draft queue on read, persist only user actions

The queue should be built server-side from:

- sellable assets in the library
- enabled destinations
- listing records and submission history

Do not persist every "draft queue row" as a first-class record unless the user acts on it.

Reason:

- avoids stale queue snapshots
- simpler backfills and destination rule changes
- easier to reason about revalidation

### 4. Use a dedicated `/admin/selling` route in v1

Do not pause this project to redesign the whole admin IA.

V1 should ship a separate route:

- `/admin` for Pages
- current library entry for Library
- `/admin/selling` for Selling

Add lightweight cross-links between the three surfaces. A full shared admin shell can happen later.

Reason:

- ships faster
- lower regression risk
- avoids tangling selling work with the page editor

### 5. Make the first destination an export adapter, not an API integration

Destination 1 should be print/export prep.

Reason:

- immediate user value
- no partner dependency
- proves metadata mapping, file variant generation, and approval flow

## Data Model

### Library config, bump to version 3

Modify [common/adminConfig.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/common/adminConfig.js) to extend each asset with new fields.

Recommended asset shape:

```json
{
  "assetId": "ast_123",
  "publicUrl": "https://...",
  "caption": "Soft light cutting through canyon walls.",
  "tags": ["arizona", "canyon"],
  "orientation": "portrait",
  "title": "Antelope Canyon at Sunrise",
  "category": "landscape",
  "selling": {
    "enabled": true,
    "releaseStatus": "none",
    "licenseAvailability": "editorial",
    "pricingPresetId": "large-print",
    "destinationEligibility": ["print-export", "licensing-basic"],
    "lastPreparedAt": null
  }
}
```

Notes:

- `caption` and `tags` stay canonical and continue to power the portfolio.
- `title` and `category` should be top-level because they are useful outside selling too.
- Selling-only workflow fields stay under `selling`.

### New selling config

Add a new helper and file path for `users/{userId}/selling-config.json`.

Recommended shape:

```json
{
  "version": 1,
  "pricingPresets": [
    {
      "id": "large-print",
      "label": "Large Print",
      "price": 250,
      "currency": "USD",
      "usageNotes": "Archival print"
    }
  ],
  "destinations": [
    {
      "id": "print-export",
      "name": "Print Export",
      "type": "print",
      "integrationMode": "export",
      "enabled": true
    },
    {
      "id": "licensing-basic",
      "name": "Licensing Channel",
      "type": "licensing",
      "integrationMode": "structured",
      "enabled": false
    }
  ],
  "listingRecords": {
    "print-export:ast_123": {
      "assetId": "ast_123",
      "destinationId": "print-export",
      "status": "approved",
      "preparedPayload": {
        "title": "Antelope Canyon at Sunrise",
        "caption": "Soft light cutting through canyon walls.",
        "keywords": ["arizona", "canyon"],
        "price": 250
      },
      "validationErrors": [],
      "updatedAt": "2026-04-15T22:00:00Z"
    }
  },
  "submissionHistory": [
    {
      "assetId": "ast_123",
      "destinationId": "print-export",
      "action": "exported",
      "status": "success",
      "createdAt": "2026-04-15T22:00:00Z"
    }
  ]
}
```

## Request / Data Flow

```text
Admin Library
  -> edit asset metadata + selling flags
  -> PUT /api/admin/library
  -> write library-config.json

/admin/selling
  -> GET /api/admin/selling
  -> read library-config.json + selling-config.json
  -> derive draft queue rows for eligible assets x enabled destinations
  -> return queue + config + history

Approve queue row
  -> POST /api/admin/selling/approve
  -> validate asset + destination + pricing preset
  -> persist listingRecord + history entry

Export queue row
  -> POST /api/admin/selling/export
  -> run destination adapter
  -> persist result + history entry
```

## File Plan

### Modify

| File | Change |
|------|--------|
| [common/adminConfig.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/common/adminConfig.js) | Bump library config version, normalize `title`, `category`, and `selling` asset fields |
| [common/gcsUser.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/common/gcsUser.js) | Add `getUserSellingConfigPath(userId)` |
| [pages/api/admin/library.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/pages/api/admin/library.js) | Preserve and validate new asset fields on PUT/GET |
| [components/admin/AdminLibrary.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/components/admin/AdminLibrary.js) | Add asset selection/edit flow for selling metadata |
| [components/admin/PhotoGrid.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/components/admin/PhotoGrid.js) | Add bulk selection, bulk "mark sellable", and bulk pricing preset actions |
| [components/admin/PhotoTile.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/components/admin/PhotoTile.js) | Add checkbox, selling badge, and "Edit selling info" action |

### Create

| File | Purpose |
|------|---------|
| [common/sellingConfig.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/common/sellingConfig.js) | Read/write/normalize `selling-config.json` |
| [common/selling/queue.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/common/selling/queue.js) | Derive draft queue rows from assets + destinations + presets |
| [common/selling/validation.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/common/selling/validation.js) | Destination eligibility and metadata validation |
| [common/selling/adapters/printExport.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/common/selling/adapters/printExport.js) | Build export package for print-ready output |
| [common/selling/adapters/licensingBasic.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/common/selling/adapters/licensingBasic.js) | Structured metadata mapping for the first licensing channel |
| [pages/api/admin/selling/index.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/pages/api/admin/selling/index.js) | GET full selling dashboard payload, PUT presets/destinations |
| [pages/api/admin/selling/approve.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/pages/api/admin/selling/approve.js) | Approve one or many queue items |
| [pages/api/admin/selling/export.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/pages/api/admin/selling/export.js) | Run adapter, persist result, return artifact info |
| [pages/admin/selling.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/pages/admin/selling.js) | Selling dashboard route |
| [components/admin/selling/SellingDashboard.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/components/admin/selling/SellingDashboard.js) | Parent client container for queue/config/history |
| [components/admin/selling/SellingQueue.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/components/admin/selling/SellingQueue.js) | Queue table with validation state and actions |
| [components/admin/selling/PricingEditor.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/components/admin/selling/PricingEditor.js) | CRUD UI for presets |
| [components/admin/selling/DestinationsEditor.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/components/admin/selling/DestinationsEditor.js) | Toggle/edit destination settings |
| [components/admin/selling/SubmissionHistory.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/components/admin/selling/SubmissionHistory.js) | History table |
| [components/admin/SellingMetadataModal.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/components/admin/SellingMetadataModal.js) | Single-asset and bulk metadata editor launched from the library |

## Implementation Phases

## Phase 1: Canonical asset extensions

### Task 1. Bump library config to v3

- Modify `LIBRARY_CONFIG_VERSION` in [common/adminConfig.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/common/adminConfig.js)
- Extend `createAssetRecord()` to preserve:
  - `title`
  - `category`
  - `selling.enabled`
  - `selling.releaseStatus`
  - `selling.licenseAvailability`
  - `selling.pricingPresetId`
  - `selling.destinationEligibility`
  - `selling.lastPreparedAt`
- Default missing selling data safely during normalization

Acceptance:

- old configs load without migration scripts
- new fields survive GET -> PUT -> GET roundtrips

### Task 2. Keep library API backward compatible

- Update [pages/api/admin/library.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/pages/api/admin/library.js) merge logic so incoming partial library updates do not wipe new asset fields
- Continue returning `images`, `assets`, `assetIdByUrl`, `counts`, and `metadata`
- Add enough returned metadata for library UI badges:
  - `title`
  - `category`
  - `sellingEnabled`
  - `pricingPresetId`

Acceptance:

- existing page editor and picker flows still work unchanged

## Phase 2: Selling config + queue engine

### Task 3. Add selling config helpers

- Create [common/sellingConfig.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/common/sellingConfig.js)
- Add `createDefaultSellingConfig()`
- Add `normalizeSellingConfig()`
- Add `readSellingConfig(userId)` and `writeSellingConfig(userId, config)`
- Add `getUserSellingConfigPath(userId)` in [common/gcsUser.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/common/gcsUser.js)

Acceptance:

- missing `selling-config.json` initializes automatically for new users

### Task 4. Build queue derivation

- Create [common/selling/queue.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/common/selling/queue.js)
- Input:
  - normalized library config
  - normalized selling config
- Output:
  - queue rows for all `asset.selling.enabled === true`
  - only for enabled destinations in `destinationEligibility`
  - merged with listing records/history if present

Each queue row should include:

- `assetId`
- `destinationId`
- preview metadata
- pricing preset label/value
- validation errors
- current status
- whether the row is actionable

Acceptance:

- queue updates automatically when asset metadata or destination rules change

### Task 5. Add validation layer

- Create [common/selling/validation.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/common/selling/validation.js)
- Validate:
  - missing title
  - missing caption
  - empty keywords
  - missing pricing preset
  - ineligible license type for destination
  - missing release for commercial destination

Acceptance:

- queue rows can be blocked with explicit user-facing reasons

## Phase 3: Library editing UX

### Task 6. Add bulk asset selection to the library

- Modify [components/admin/PhotoGrid.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/components/admin/PhotoGrid.js)
- Add selection state, bulk toolbar, and actions:
  - mark sellable / unsellable
  - assign pricing preset
  - edit category
  - edit eligibility

Reason:

Without bulk edit, the "20 photos in 10 minutes" promise is fake.

### Task 7. Add single-asset and bulk metadata editing

- Create [components/admin/SellingMetadataModal.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/components/admin/SellingMetadataModal.js)
- Launch from:
  - a new `Edit selling info` action in [components/admin/PhotoTile.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/components/admin/PhotoTile.js)
  - the bulk toolbar in [components/admin/PhotoGrid.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/components/admin/PhotoGrid.js)

Required fields:

- title
- category
- release status
- license availability
- pricing preset
- destination eligibility

Nice-to-have:

- generate title from filename or caption if blank

Acceptance:

- user can mark and configure 20 assets without leaving the library

## Phase 4: Selling dashboard route

### Task 8. Add `/admin/selling`

- Create [pages/admin/selling.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/pages/admin/selling.js)
- Reuse auth gate pattern from [pages/admin/index.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/pages/admin/index.js)
- Keep layout simple:
  - header with links: Pages, Library, Selling
  - left rail or local tabs: Queue, Destinations, Pricing, History

Recommendation:

Do not refactor the whole admin layout yet. Add lightweight navigation first.

### Task 9. Add selling API overview route

- Create [pages/api/admin/selling/index.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/pages/api/admin/selling/index.js)

`GET` should return:

- selling config
- derived queue
- recent submission history
- library summary counts:
  - sellable assets
  - blocked assets
  - approved rows

`PUT` should update:

- pricing presets
- destination toggles/settings

### Task 10. Build queue UI

- Create [components/admin/selling/SellingDashboard.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/components/admin/selling/SellingDashboard.js)
- Create [components/admin/selling/SellingQueue.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/components/admin/selling/SellingQueue.js)

Queue table columns:

- thumbnail
- title
- destination
- price
- validation state
- status
- actions

Actions:

- `Approve`
- `Edit asset`
- `Skip`
- `Export` or `Prepare`

## Phase 5: Destination adapters

### Task 11. Implement print export adapter first

- Create [common/selling/adapters/printExport.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/common/selling/adapters/printExport.js)

V1 output can be:

- JSON metadata payload
- derived file naming
- export manifest

If image transformation infra is not ready yet, return a prepared manifest first and keep actual resize work behind a clearly marked TODO. That is acceptable for V1 planning, but not acceptable for claiming "fully exported" in the UI.

### Task 12. Add one structured licensing adapter

- Create [common/selling/adapters/licensingBasic.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/common/selling/adapters/licensingBasic.js)

This adapter should:

- map title/caption/keywords/category
- validate commercial vs editorial compatibility
- return a structured payload or export package

Recommendation:

Pick the channel with the cleanest ingestion path, not the biggest logo.

### Task 13. Add approve/export API routes

- Create [pages/api/admin/selling/approve.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/pages/api/admin/selling/approve.js)
- Create [pages/api/admin/selling/export.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/pages/api/admin/selling/export.js)

Approval behavior:

- validate queue row
- persist listing record status
- append history event

Export behavior:

- load adapter by `destinationId`
- generate artifact/result payload
- persist outcome

## Phase 6: History and polish

### Task 14. Add pricing and destinations editors

- Create [components/admin/selling/PricingEditor.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/components/admin/selling/PricingEditor.js)
- Create [components/admin/selling/DestinationsEditor.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/components/admin/selling/DestinationsEditor.js)

V1 can keep destination settings intentionally small:

- enabled
- name
- integration mode
- accepted license types

### Task 15. Add submission history UI

- Create [components/admin/selling/SubmissionHistory.js](/Users/swami/conductor/workspaces/portfolio-builder-v1/abuja/components/admin/selling/SubmissionHistory.js)

Show:

- asset
- destination
- action
- status
- timestamp
- error, if any

## Edge Cases

These are real. Handle them up front.

1. Asset deleted from library after queue approval
   - queue row should become invalid, not crash

2. Pricing preset deleted while assets still reference it
   - queue should show `Missing pricing preset`

3. Destination disabled after rows were approved
   - preserve history, block new actions

4. Asset marked `commercial` without required release
   - validation error, no export

5. Existing users with old `library-config.json`
   - normalize in memory, persist lazily

6. Existing library UI saving partial config
   - must not wipe selling metadata on unrelated edits

## Testing Plan

### Unit tests

Create:

- `__tests__/common/adminConfig.test.js`
- `__tests__/common/sellingConfig.test.js`
- `__tests__/common/sellingQueue.test.js`
- `__tests__/common/sellingValidation.test.js`

Cover:

- v2 -> v3 library normalization
- sellable asset defaults
- queue derivation
- validation failures
- pricing preset deletion behavior

### API tests

Create:

- `__tests__/pages/api/admin/selling.index.test.js`
- `__tests__/pages/api/admin/selling.approve.test.js`
- `__tests__/pages/api/admin/selling.export.test.js`

Cover:

- auth-gated access
- missing config bootstrap
- approval persistence
- export adapter routing

### Manual QA

1. Upload 20 assets
2. Bulk mark sellable and assign pricing preset
3. Configure 2 destinations
4. Open `/admin/selling`
5. Confirm blocked rows are explained clearly
6. Approve and export at least 5 rows
7. Delete one referenced asset and confirm graceful degradation

## Recommendation

Build this in the exact order above.

Do not start with the selling dashboard UI.
Do not start with partner integrations.

Start with canonical asset metadata and queue derivation.

That is the whole game. If those layers are clean, the UI is straightforward. If those layers are sloppy, every screen becomes a bug surface.
