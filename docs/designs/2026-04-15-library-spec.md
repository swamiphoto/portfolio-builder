# Library Spec

## Purpose

This document turns the library concept into an implementation-ready model for the current product.

The core product rule is:

- the library stores each photo once as a canonical asset
- pages, galleries, covers, and blocks reference that asset
- the library owns metadata, organization, duplicate detection, and usage visibility

## Current State

Today the library is split across two ideas:

- storage: files under `photos/...`
- config: URL arrays grouped under `portfolios` and `galleries`

That creates three problems:

1. The library does not have a canonical asset record.
2. Organization is leaking from storage folders into the UI.
3. The picker and the library page are thin views over URL lists instead of a shared asset model.

## Target Product Model

The library becomes a top-level admin surface alongside pages.

It should answer:

- what photos exist?
- where did they come from?
- where are they used?
- are there duplicates?
- how are they organized?
- how do I quickly find one photo again?

## Data Model

### Library Config Shape

Move `library-config.json` to a versioned canonical structure:

```json
{
  "version": 2,
  "assets": {
    "ast_01HXYZ": {
      "assetId": "ast_01HXYZ",
      "storageKey": "users/abc123/photos/library/antelope-canyon.jpg",
      "publicUrl": "https://storage.googleapis.com/...",
      "originalFilename": "IMG_4123.jpg",
      "mimeType": "image/jpeg",
      "bytes": 4821931,
      "width": 4000,
      "height": 6000,
      "aspectRatio": 0.6667,
      "orientation": "portrait",
      "caption": "Antelope Canyon at sunrise",
      "alt": "",
      "tags": [
        "arizona",
        "sandstone"
      ],
      "collectionIds": [
        "col_landscapes",
        "col_arizona"
      ],
      "source": {
        "type": "import",
        "provider": "squarespace",
        "label": "My Squarespace site",
        "sourceUrl": "https://example.com/gallery/arizona",
        "importBatchId": "imp_2026_04_15_001",
        "externalAssetId": null,
        "externalCollectionId": null,
        "syncMode": null,
        "lastSyncedAt": null
      },
      "capture": {
        "capturedAt": "2025-10-13T14:22:18Z",
        "timezone": "-07:00",
        "cameraMake": "Sony",
        "cameraModel": "ILCE-7RM5",
        "lens": "FE 24-70mm F2.8 GM II",
        "focalLengthMm": 35,
        "aperture": 8,
        "shutterSpeed": "1/125",
        "iso": 200,
        "locationName": "Page, Arizona",
        "latitude": 36.8619,
        "longitude": -111.3743
      },
      "hashes": {
        "exact": "sha256:abc123",
        "perceptual": "phash:def456"
      },
      "duplicateStatus": {
        "exactOf": null,
        "possibleDuplicateIds": [
          "ast_01HXYA"
        ]
      },
      "usage": {
        "cover": false,
        "pageIds": [
          "about",
          "landscapes"
        ],
        "galleryIds": [
          "arizona"
        ],
        "blockIds": [
          "blk_123",
          "blk_456"
        ],
        "usageCount": 4,
        "lastUsedAt": "2026-04-15T22:10:00Z"
      },
      "createdAt": "2026-04-15T22:00:00Z",
      "updatedAt": "2026-04-15T22:10:00Z"
    }
  },
  "assetOrder": [
    "ast_01HXYZ"
  ],
  "collections": {
    "col_landscapes": {
      "collectionId": "col_landscapes",
      "name": "Landscapes",
      "kind": "manual",
      "assetIds": [
        "ast_01HXYZ"
      ],
      "createdAt": "2026-04-15T22:00:00Z",
      "updatedAt": "2026-04-15T22:10:00Z"
    },
    "col_import_sqsp": {
      "collectionId": "col_import_sqsp",
      "name": "Imported from Squarespace",
      "kind": "smart",
      "rule": {
        "source.provider": "squarespace"
      }
    }
  },
  "savedViews": {
    "view_portraits_85mm": {
      "name": "Portraits / 85mm",
      "filters": {
        "orientation": "portrait",
        "capture.lens": "85mm"
      }
    }
  }
}
```

### Why `collections`

Use `collections` as the primary organization concept.

Do not use folders as the primary UX primitive.

Reason:

- folders imply one true location
- photographers routinely reuse the same image across multiple conceptual sets
- collections map better to bodies of work, shoots, places, clients, or favorites

Folders can still exist in storage, but they should stay implementation detail.

### URL vs Asset ID

Long term, all page and block content should reference `assetId`, not raw URL.

Recommended target reference shape:

```json
{
  "assetId": "ast_01HXYZ",
  "url": "https://storage.googleapis.com/...",
  "caption": "Optional placement override"
}
```

In the transition period, existing URL-based content can still work if the system resolves URL to asset by `publicUrl`.

## Organization Rules

### Manual organization

Users should be able to:

- create collections
- add assets to multiple collections
- bulk move assets into collections
- bulk remove assets from collections
- add tags
- edit caption and alt at the library level

### Smart organization

The system should auto-create or derive smart collection views for:

- imported from Squarespace
- imported from Instagram
- imported from Lightroom
- uploaded manually
- portrait
- landscape
- unused
- possible duplicates
- year
- lens
- location

Smart collections should feel like views, not duplicated storage.

## Duplicate Handling

### Exact duplicate

Compute `sha256` over the uploaded file bytes before creating a new asset record.

If a match exists:

- do not create a second stored asset by default
- show prompt:
  - `Use existing photo`
  - `Replace existing file`
  - `Keep both`

Recommended default: `Use existing photo`

### Near duplicate

Compute a perceptual hash after ingestion.

If a close match exists:

- flag as `possible duplicate`
- never auto-merge
- surface both assets in the library detail panel

### Replace existing file

If user chooses `Replace existing file`:

- keep the same `assetId`
- update file contents and metadata
- preserve all placements and collection membership
- write an audit event

This is safer than minting a new asset and attempting to rewire references later.

## Usage Tracking

The library must show where each asset is used.

Track references from:

- cover image
- gallery thumbnails
- page thumbnails
- photo blocks
- stacked blocks
- masonry blocks
- slideshow blocks

The user should be able to click from a library asset into the page or block where it is used.

## Lightroom Integration

Lightroom should be treated as a publishing integration, not just another one-time import source.

The right model is:

- Lightroom publishes assets into the Library
- Lightroom can optionally target a specific gallery destination
- the library remains the canonical record
- page builder layouts continue to reference library assets

### Why this is the right boundary

Lightroom knows about photos, edits, captions, keywords, and collections.

It does not know about:

- block layout
- page composition
- hero placement
- inline editorial sequences

So Lightroom should publish to:

- `Library`
- a manual `collection`
- a `gallery` or `album` destination

It should not publish directly into arbitrary page blocks in v1.

### Recommended user flow

1. User connects Lightroom once.
2. In Lightroom, user chooses a publish destination:
   - `Library only`
   - `Library + collection`
   - `Library + gallery`
3. Lightroom exports rendered JPEGs plus metadata.
4. The backend checks exact duplicate hash before storing.
5. If the asset already exists:
   - skip duplicate storage
   - relink to the existing asset
   - if this came from the same Lightroom external asset, treat it as an update candidate
6. If this is a republish of the same Lightroom photo:
   - update the existing asset rather than creating a new one
   - preserve placements and usage when safe
7. The destination gallery updates its ordered asset list.

### Required asset fields for Lightroom sync

For Lightroom-originated assets, the source record should preserve:

- `source.provider = "lightroom"`
- `source.externalAssetId`
- `source.externalCollectionId`
- `source.syncMode`
- `source.lastSyncedAt`

This gives the system a stable identity so repeated publishes update the same asset instead of creating duplicates.

### Publish destinations

Recommended supported destinations:

- `Library`
- `Collection`
- `Gallery album`

Do not support in v1:

- direct publish to `cover`
- direct publish to arbitrary `page` block

Reason: galleries are durable containers. Page blocks are editorial placements and should stay inside the page builder.

### Republishing behavior

When a Lightroom photo is republished:

- if `externalAssetId` matches an existing asset, update that asset
- if exact hash matches a different existing asset, reuse that asset and link the Lightroom source identity
- if the visual file changed, keep the same `assetId` and replace underlying file contents

The important rule is that Lightroom republish should feel idempotent.

The user should not get a new duplicate every time they re-export an edited file.

### Removal behavior

If a photo is removed from a Lightroom publish collection:

- default: remove it from that gallery or collection destination only
- do not delete the asset from the library automatically

If the asset becomes unused after that, it should appear in the `Unused` smart collection.

This is safer than hard delete because the asset may already be used elsewhere in the site.

### Metadata sync behavior

Lightroom should be allowed to populate or update:

- caption
- title
- keywords to tags
- capture date
- EXIF fields

If the user edits those fields later inside the app, use a simple rule:

- `last write wins` at the library asset level

The system can later add field-level sync locks, but not in v1.

## Library Page UX

### Navigation

Put `Library` in the main admin sidebar as a first-class destination:

- Pages
- Library
- Theme
- Site settings

This is better than hiding it inside an editor footer because the library is not just a picker.

### Layout

Use a 3-pane layout:

- left sidebar: filters, collections, saved views
- center pane: aspect-ratio-preserving asset grid
- right pane: selected asset details and actions

### Center pane

The grid should:

- preserve original aspect ratio
- support multi-select
- support sort by captured date, uploaded date, recently used, filename
- show badges for source, usage count, duplicate flag, missing metadata

### Left sidebar filters

At minimum:

- search
- collections
- source provider
- import batch
- used in page
- used in gallery
- orientation
- captured date
- uploaded date
- camera
- lens
- focal length
- aperture
- ISO
- shutter speed
- location
- tags
- unused
- possible duplicates

### Right detail panel

Show:

- large preview
- caption and alt editor
- collections and tags
- full metadata summary
- duplicate status
- exact usage list
- actions: add to collection, remove from collection, open usage, replace file, delete

## Picker UX

The picker should not have separate library logic.

It should use the same query model as the Library page with a reduced UI:

- same search semantics
- same collections
- same source filters
- same orientation filters
- same metadata-backed search

The picker should emphasize fast drill-down:

- recent
- collections
- source
- unused
- search

If a photo is already used in the current page or gallery, show a warning instead of silently duplicating placement.

## Migration Plan

### Step 1: Introduce canonical asset records

Keep legacy URL arrays working, but build `assets` in `library-config.json`.

Backfill from:

- current bucket listing
- existing `portfolios`
- existing `galleries`
- current page/block content where applicable

### Step 2: Resolve URLs to assets

Create helpers:

- `findAssetByUrl(url)`
- `findAssetByHash(hash)`
- `getAssetUsage(assetId, siteConfig, libraryConfig)`

This lets the current UI gradually move from URL arrays to asset records.

### Step 3: Move picker and admin page to asset queries

Change picker and library page APIs so they return asset records, not raw URL lists.

### Step 4: Convert page models to `assetId`

When editing or saving blocks, prefer `assetId` references and keep `url` as a denormalized convenience field during transition.

### Step 5: Remove folder-first UX

Replace folder dropdowns in the picker with:

- collections
- source
- imported batches
- tags

Storage folder selection can remain in upload internals or advanced options only.

## API Changes

### `GET /api/admin/library`

Return:

- asset records
- collections
- saved views
- available filter facets

### `PUT /api/admin/library`

Support updates to:

- collections
- tags
- captions
- alt
- saved views

### New upload flow

Recommended shape:

1. preflight metadata extraction
2. exact duplicate check
3. prompt if duplicate exists
4. signed upload only if needed
5. asset record creation or asset replacement

This can stay under `/api/admin/upload` initially, but logically it should become asset-aware rather than file-aware.

## Phased Implementation

### Phase 1

Ship:

- versioned `library-config.json`
- canonical `assets`
- exact duplicate detection
- dedicated Library page in admin nav
- aspect-ratio-preserving grid
- manual collections
- usage count and usage list

Do not ship yet:

- EXIF filters
- near duplicate detection
- smart collections

### Phase 2

Ship:

- EXIF extraction at upload/import time
- metadata filters
- source and import batch views
- smart collections
- picker driven by collections instead of folders
- Lightroom publish destination design and asset schema support

### Phase 3

Ship:

- perceptual hash duplicate detection
- replace-file workflow
- duplicate review dashboard
- bulk operations
- saved views
- Lightroom sync implementation and republish handling

## Recommended Build Order In This Repo

1. Add a new library schema layer in `common/adminConfig.js`.
2. Update `pages/api/admin/library.js` to read and write asset records.
3. Update `components/admin/AdminLibrary.js` to use asset objects instead of URL arrays.
4. Add Library as a top-level route in the admin shell if not already present.
5. Update `components/admin/gallery-builder/PhotoPickerModal.js` to use collection and asset filters instead of folders.
6. Update upload flow to run duplicate preflight before finalizing storage.
7. Backfill usage from existing page and gallery config.

## Notes For Current Code

Current code that will need to change first:

- `common/adminConfig.js`
- `pages/api/admin/library.js`
- `components/admin/AdminLibrary.js`
- `components/admin/gallery-builder/PhotoPickerModal.js`
- `components/admin/UploadModal.js`

Current code that should remain compatible during transition:

- any builder component that still expects URL-based image values

The safest path is additive first:

- create asset records
- keep URL compatibility
- then convert UI surfaces
- then convert block persistence
