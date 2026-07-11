# Library Duplicate Finder — Design Spec (exact, v1)

**Date:** 2026-07-09
**Status:** Approved for planning
**Author:** Swami (with Claude)

## 1. Summary

Photographers accumulate duplicate photos — the same shot imported from a website
*and* uploaded from disk, or the same file arriving by two routes. When two copies
exist as separate library assets, they waste storage and, worse, fragment usage:
one copy is placed on one page, the other on another, so neither is "the" photo.

This feature adds a **user-driven "Find duplicates" scan** to the Library that
detects **exact** (byte-identical) duplicates, shows them in a review list, and
**consolidates** each group into a single canonical photo — rewriting every
reference (galleries, Sets, and page/block placements) so nothing a copy was used
for is lost, then deleting the redundant files.

Near-duplicate (perceptual/visual) detection is explicitly a **later phase** (§9).

## 2. Goals

- Detect **exact** duplicates across the whole library (identical content hash).
- Let the photographer review found groups (with counts and where each copy is used)
  and consolidate them — one-click "merge all" or per-group control.
- **Consolidate usage:** when duplicates are used on different pages/sets, all
  references end up pointing at the single surviving canonical photo.
- Reclaim storage by deleting the redundant (identical) files.
- Reuse the established serverless-safe batched pattern (like the import loop) and the
  review-list UI pattern (like the import Review step).
- Populate the asset model's already-present `hashes.exact` going forward so repeat
  scans are fast.

## 3. Non-goals (deferred)

- **Perceptual / near-duplicate detection** (resized, re-compressed, lightly-edited,
  burst frames). A distinct phase 2 that plugs into the same review/merge UI once
  exact is proven (§9). No perceptual hashing in v1.
- **Automatic background dedup.** The scan is user-triggered only.
- **Cross-user dedup.** Per-user library only.
- **Re-import dedup by source URL** — already handled by the import engine
  (`fetch-batch` skips a `source.sourceUrl` it has already imported), so importing the
  same site twice does not create duplicates. This feature covers *content* duplicates
  that arrive by different routes.

## 4. Data model (no schema changes)

The asset model already carries the needed fields:
- `hashes: { exact, perceptual }` — `exact` = hex SHA-256 of the file bytes. Populated
  going forward (§5.1) and backfilled during a scan (§5.2). `perceptual` stays null in v1.
- `duplicateStatus: { exactOf, possibleDuplicateIds }` — optional bookkeeping; not
  required for the merge, may be used to annotate.
- `usage: { cover, pageIds, galleryIds, blockIds, usageCount, lastUsedAt }` — used to
  choose the canonical and to show "where used" in the review.

Two persisted config surfaces are involved:
- **Library config** (`users/{userId}/library-config.json`): `assets` (by assetId),
  `galleries`/`portfolios` (slug → **URL** arrays), `sets` (setId → `{ assetIds }`).
- **Site config** (`users/{userId}/site-config.json`): pages and their blocks, which
  reference photos by **URL**.

## 5. Architecture

### 5.1 Hash at store time (going forward)
`common/storeImage.js` (`storeImageBuffer`) already has the file `buffer`. It computes
`sha256(buffer)` (hex) and returns it alongside `{ gcsUrl, objectPath, width, height }`.
The upload and import asset-seeding paths write it into `hashes.exact`. New photos are
hashed for free at store time.

### 5.2 Scan = backfill + group (client-orchestrated, batched)
When the user runs "Find duplicates":
1. The client collects assets missing `hashes.exact` and calls
   `POST /api/admin/library/hash-batch` with a small batch of `{ assetId, url }` at a
   time. The server fetches each object (via the SSRF-safe `safeFetch`), SHA-256s the
   bytes, returns `{ assetId, hash }[]` (per-asset failures captured, never abort the
   batch). The client accumulates with a progress bar — identical shape to the import
   loop. Empty backfill (all already hashed) → this stage is instant.
2. The client writes the new hashes back to the library config (single PUT).
3. The client groups all assets by `hashes.exact`; each hash with ≥2 assets is a
   **duplicate group**.

After the first scan, subsequent scans only backfill new/unhashed assets, so they are fast.

### 5.3 Consolidate = client rewrites configs + deletes files, then persists
Detailed in §6. Pure config transformation + targeted file deletes, then a library-config
PUT and (if pages changed) a site-config PUT.

## 6. Consolidation logic (the careful part)

For each duplicate group the user chooses to merge:

1. **Choose canonical.** Default: highest `usage.usageCount`; tie-break oldest
   `createdAt`; final tie-break lowest assetId (deterministic). The review lets the user
   override which asset is canonical.
2. **Rewrite references** from each redundant asset to the canonical, by both key types:
   - **By URL** (redundant `publicUrl` → canonical `publicUrl`): in every
     `galleries[slug]` and `portfolios[slug]` array (then de-dupe the array), and in every
     page/block in the **site config** that references the redundant URL.
   - **By assetId** (redundant `assetId` → canonical `assetId`): in every `sets[setId].assetIds`
     (de-dupe), and anywhere assetIds are referenced.
3. **Union metadata** onto the canonical asset: merge `setIds`, `tags`, and `usage`
   (`pageIds`/`galleryIds`/`blockIds`/`cover` OR-ed, `usageCount` recomputed), and adopt a
   non-empty `caption`/`alt` from a redundant copy if the canonical's is empty.
4. **Delete the redundant copies:** remove their `assets` records, remove their URLs from
   `assetOrder`/`assetIdByUrl`, and **delete their R2 objects** (original + derived
   thumbnail) via `deleteFile`.

**Why the file must be deleted (important, unavoidable):** the library GET re-derives
assets from what is present in storage (`listAllImages`) merged with config. Removing only
the asset record would let the duplicate reappear on the next load. So consolidation must
delete the redundant file. This is safe — the file is byte-identical to the canonical,
which survives, so no image content is lost — but it is a real, permanent deletion. This is
why the flow shows a review before merging (§7).

## 7. UI

- **Entry point:** a discreet "Find duplicates" action in a Library maintenance/overflow
  menu (not an always-present primary button) — it is occasional housekeeping.
- **Scanning:** "Checking {N} photos for duplicates…" with the hashing progress bar
  (reused progress component). Shown only while backfilling; instant when nothing to hash.
- **Review (hybrid):** a list of duplicate groups. Each row shows the shared thumbnail,
  the copy count ("3 copies"), and where each copy is used ("Home cover · 'Japan' set ·
  Portraits page"), with the canonical marked. Controls: a prominent **"Merge all (N groups)"**
  default button, plus per-group **Skip** and **"keep this one"** (choose canonical).
  Empty result → "No duplicates found. Your library is clean."
- **Done:** "Merged {X} duplicates into {Y} photos. Reclaimed ~{Z} MB." Library refreshes
  and reflects the consolidated photos.

Warm, plain copy throughout (no AI-tell patterns).

## 8. API routes (new)

- `POST /api/admin/library/hash-batch` — body `{ items: [{ assetId, url }] }` →
  `200 { hashed: [{ assetId, hash }], failed: [{ assetId, reason }] }`. Uses `safeFetch`
  to fetch each object and SHA-256 the bytes. Per-item failures captured; never throws the
  batch. Auth via `withAuth`. Enforces a batch-size cap (like `fetch-batch`).

Consolidation persists through the existing `PUT /api/admin/library` (library config) and
the existing site-config save endpoint (only when page/block references changed). File
deletion uses the existing storage `deleteFile`.

## 9. Future / deferred

- **Perceptual / near-duplicate detection.** Compute a perceptual hash (e.g. dHash/pHash)
  at store time and during scan; group by Hamming-distance threshold; surface *possible*
  duplicates (always human-reviewed, never auto-merged) in the same review UI, visually
  distinguished from exact matches. Plugs into the same consolidation logic.
- **Orphaned-file garbage collection** as a general maintenance action.

## 10. Testing

- **Store-time hashing:** `storeImageBuffer` returns a stable hex SHA-256 for given bytes;
  identical bytes → identical hash; the seeding paths write it to `hashes.exact`.
- **Grouping:** given a set of assets with mixed/duplicate/absent hashes, grouping yields
  the correct duplicate groups (≥2), ignores singletons, and treats missing hashes as
  "needs backfill."
- **Canonical selection:** most-used wins; tie → oldest; final tie → lowest assetId
  (deterministic).
- **Consolidation (pure):** given a library config + site config + a merge decision,
  produces the expected rewritten configs — URLs replaced in galleries/portfolios/pages,
  assetIds replaced in sets, arrays de-duped, metadata unioned, redundant assets removed,
  and the exact list of R2 keys to delete. Idempotent; leaves unrelated assets untouched.
- **hash-batch route:** hashes a batch, isolates per-item failures, enforces the batch cap,
  requires auth.
- **Never-lose-usage invariant:** a duplicate used on page A and another copy used on page B
  → after merge, the canonical's usage covers both A and B and both pages render the
  surviving photo.

## 11. Design principles

Tasteful and native to the Library (reuses the import progress + review-list patterns).
The scan is honest about what it will do (review before an irreversible merge). Copy is warm
and plain.
