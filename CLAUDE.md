# Portfolio Builder

Photography portfolio platform. Photographers paste a URL, get a beautiful site in under 2 minutes.

## Design Doc

See `docs/designs/photohub-platform-design.md` for the full product design.

## Tech Stack

- Next.js (pages router)
- Tailwind CSS
- Google Cloud Storage (GCS) for images and config
- NextAuth.js for Google OAuth (to be added)

## Architecture

- `components/admin/gallery-builder/` - Block-based gallery editor (existing, working)
- `components/admin/slideshow-builder/` - Slideshow editor (existing, working)
- `components/admin/` - Photo library management (existing, working)
- `components/image-displays/` - Gallery, Photo, Slideshow rendering components
- `pages/api/admin/` - GCS API routes (library, upload, delete, galleries)
- `common/` - Shared utilities (GCS client, config helpers)

## Key Patterns

- Block-based editing: photo, stacked, masonry, text, video blocks
- Draft/publish workflow with 1.5s debounced autosave
- GCS JSON config files for all persistent data
- PhotoPickerModal for image selection across all editors

## What Needs Building (from design doc)

1. Auth + multi-tenancy (NextAuth.js, per-user GCS paths)
2. Page-level sidebar (site config, page list, breadcrumb nav)
3. Import engine (gallery-dl/Instaloader, auto-generation)
4. Onboarding flow (paste URL, import progress, site reveal)
5. Theme system (CSS custom properties, theme config)
6. Published site rendering (dynamic routing, nav auto-gen)
7. Library caption sync (bidirectional)
