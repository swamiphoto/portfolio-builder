# Library Concept

## Core Decision

The library is the master asset registry for a user's entire portfolio. Every imported or uploaded image enters the library once, gets one canonical asset record, and can then be referenced from pages, galleries, and blocks.

Detailed spec: `docs/designs/2026-04-15-library-spec.md`

This means:

- One stored asset, many placements
- Duplicate storage should be prevented by default
- Reuse across multiple pages is allowed
- Duplicate placement within the same context should be warned on, not silently duplicated

The important distinction is between:

- asset duplicate: same image uploaded/imported again
- placement duplicate: same asset used again on a page, gallery, or block

## Why This Matters

Photographers think "where is this photo in my body of work?" not "which page builder block owns this file?" The library should be the source of truth for photo identity, metadata, and organization. Pages should only hold references to library assets.

## Recommended Model

Each library asset should contain:

- `assetId`
- `storageKey`
- `originalFilename`
- `width`
- `height`
- `aspectRatio`
- `orientation`
- `caption`
- `alt`
- `tags`
- `collections`
- `sourceType`
- `sourceLabel`
- `sourceUrl`
- `importBatchId`
- `exif`
- `dominantLocation` or parsed location fields if available
- `capturedAt`
- `uploadedAt`
- `hashExact`
- `hashPerceptual`
- `usage`

`usage` should be derived or cached as references to where the asset appears:

- cover
- page ids
- gallery ids
- block ids

## Duplicate Policy

### Exact duplicate

On upload or import, compute a content hash of the normalized file bytes.

If exact match exists:

- default action: do not store a second copy
- prompt user:
  - "Already in library"
  - "Use existing photo"
  - "Replace existing file"
  - "Keep both anyway"

`Use existing photo` should be the recommended default.

### Near duplicate

Also compute a perceptual hash for visually similar images.

If near-match score crosses a threshold:

- show "possible duplicate" warning
- do not block upload automatically

This catches exports, resized copies, or slightly edited versions without being too aggressive.

## Placement Rules

Do not ban reuse across the whole site. That is too rigid for real portfolios because a user may intentionally use the same photo as:

- homepage hero
- gallery thumbnail
- image inside a project page

Instead:

- allow reuse globally
- warn if the asset already exists in the current page or gallery
- optionally offer "jump to existing placement"

## Organization Model

Use `collections` as the main user-facing organizational primitive.

Do not make folders the primary concept.

Why:

- folders imply one true location
- one image often belongs in multiple conceptual groups
- photographers think in bodies of work, locations, shoots, and themes, not strict filesystem trees

Recommended structure:

- collections: manual groupings created by the user
- smart collections: rule-based views such as "Squarespace import", "Portrait", "Shot on 24-70", "Yosemite", "2024"
- tags: lightweight labels for flexible filtering

Physical storage paths in GCS can still exist, but they should stay implementation detail, not the main UX.

## Library Page

The library needs its own dedicated page in the admin, not just a picker.

Recommended layout:

- left sidebar: filters and saved views
- main pane: masonry or row-based thumbnails preserving original aspect ratio
- right detail panel on selection: metadata, usage, collections, tags, edit actions

### Sidebar filters

- Search
- Collections
- Source
- Used in
- Orientation
- Date captured
- Date uploaded
- Camera
- Lens
- Focal length
- Aperture
- ISO
- Shutter speed
- Location
- Tags
- Unused photos
- Possible duplicates

### Main pane behavior

- preserve image aspect ratio
- fast multi-select
- sort by captured date, uploaded date, recently used, aspect ratio
- show badges for source, usage count, duplicate warning, missing metadata

## Picker Behavior

The picker should be a reduced version of the library, not a separate data model.

It should support:

- the same collections and filter logic
- quick drill-down by collection or source
- search by filename, caption, tag, location, lens
- visible usage info before insertion

## Navigation Placement

Put `Library` in the main admin sidebar near the pages list, not buried inside a page editor.

Recommended:

- Pages
- Library
- Theme
- Site settings

This reinforces that Library is a top-level product surface, not a modal utility.

## First Implementation Cut

Phase 1:

- canonical asset records
- exact duplicate detection
- dedicated library page
- collections
- usage tracking
- aspect-ratio-preserving grid

Phase 2:

- EXIF extraction and filters
- smart collections
- near-duplicate detection
- bulk organization actions

Phase 3:

- replacement workflow
- advanced metadata editing
- duplicate cleanup dashboard
- auto-suggested collections
