# Draft / Publish separation + Version history — Design Spec

**Date:** 2026-09-14 · **Status:** design proposed, pending review

## Background — why

Today there is **no draft**. Editor autosave and the public site read/write the *same*
file (`users/{userId}/site-config.json`). So every autosaved keystroke is instantly live,
and the "Publish" button is cosmetic — it flips a local, in-memory `hasUnpublishedChanges`
flag (`pages/studio/index.js`) and writes nothing. Two consequences the user hit:

1. After a refresh the flag re-initializes to `false`, so Publish is disabled even when there
   are (conceptually) unpublished edits.
2. There is no safety net: a bad edit or the autosave-loss bug means content is just gone,
   with no version to recover.

This spec adds (A) a real draft vs. published split so the public site only changes on
Publish, and (B) durable version history so a support/disaster case can recover.

## Goals

- **Draft is private.** Editing (and autosave) targets a draft the public never sees.
- **Publish is real.** The public site changes only when the user clicks Publish.
- **Dirty state survives refresh.** `hasUnpublishedChanges` is computed on load from stored
  data, not ephemeral client state.
- **Safety net.** Every publish (and optionally every autosave overwrite) is snapshotted in
  our own storage, so a bad edit is recoverable — and it sets up a future user-facing restore.
- **No live site goes dark on deploy.** Existing users migrate transparently.

## Storage model

Per user, in R2:

| File | Role | Read by | Written by |
|------|------|---------|-----------|
| `users/{id}/site-config.json` | **Draft** (working copy) | editor GET | autosave PUT |
| `users/{id}/site-config.published.json` | **Published snapshot** | public site | Publish only |
| `users/{id}/history/site-config-{ts}.json` | **Publish history** (keep last 20) | future restore UI | Publish only |

New path helpers in `common/gcsUser.js`: `getUserPublishedConfigPath`,
`getUserHistoryPrefix`, `getUserHistoryPath(id, ts)`.

## Draft / publish flow

### Timestamps (server-owned)
The **server** stamps timestamps — the client never sets them (the client's in-memory config
carries a possibly-stale `updatedAt`, so we always overwrite it server-side):

- Autosave PUT (`writeSiteConfig`) stamps the draft's `updatedAt = Date.now()` on every write.
- Publish stamps `updatedAt` (draft) and `publishedAt` (published) to the **same** value.

Dirty is then a simple comparison: `hasUnpublishedChanges = draft.updatedAt > published.publishedAt`.
Right after a publish the two are equal → not dirty; the next autosave bumps `updatedAt` past
`publishedAt` → dirty. (Equal-ms edge collapses to "not dirty", which is correct.)

### Publish — `POST /api/admin/publish`
Client sends the **current config in the body** (so publish captures exactly what the user
sees, with no dependence on a possibly-pending debounced autosave). Server, in one request,
with a single `ts = Date.now()`:

1. Write the draft = `{ ...config, updatedAt: ts }` (covers any un-flushed edit).
2. Write `site-config.published.json` = `{ ...config, publishedAt: ts }`.
3. Write a history snapshot `history/site-config-{ts}.json` = the published config.
4. Prune history to the newest 20 (list prefix, delete the rest).
5. Return `{ publishedAt: ts }`.

Both writes use the same `ts`, so `updatedAt === publishedAt` → clean immediately after.

### Dirty computation — editor `GET /api/admin/site-config`
Reads the draft plus the published file's `publishedAt`, and returns:

```
{ ...draft,
  hasUnpublishedChanges: !published || draft.updatedAt > published.publishedAt,
  lastPublishedAt: published?.publishedAt ?? null }
```

This is stored, not ephemeral, so it survives refreshes: disabled right after publish, enabled
again after the next edit.

### Public read path
`pages/sites/[username]/[slug].js`, `.../index.js`, `.../[slug]/slideshow.js` switch from
`readSiteConfig` to a new `readPublishedSiteConfig(userId)` that reads the published file
(same normalization/migration pipeline as `readSiteConfig`).

## Migration (transparent, lazy)

The first time a read finds **no** published file (legacy user), seed it: `published := draft`
with `publishedAt` set to the draft's current `updatedAt` (or `Date.now()` if the draft has
none yet), so the seeded pair compares as clean.
Seeding runs in a shared `ensurePublishedSeeded(id)` called from both the editor GET and the
public read. Result: every existing site keeps showing its current content, everyone starts
in a **clean/published** state (no spurious "you have unpublished changes"), and only real
edits after deploy mark the draft dirty. Idempotent and safe to run on every read.

## Version history

**Note:** R2 has **no object versioning** (a long-standing feature request, not shipped as of
2026-09). Its data-protection features are Bucket locks (WORM retention) and lifecycle rules —
neither keeps "previous versions." So the safety net is **application-level**, which is fine
because we own every config write. There is no Cloudflare toggle to flip.

- **Tier 1 — snapshot on publish (this spec).** Step 3 above. Publish is the meaningful
  checkpoint, so the `history/` prefix becomes a clean per-user version line, capped at 20.
- **Tier 1b — snapshot on autosave overwrite (optional, recommended).** Before an autosave PUT
  overwrites the draft, copy the prior draft into a small rolling backup (e.g. keep the last
  ~10 in a `history/autosave/` prefix). Protects against a bad edit clobbering work *between*
  publishes — the exact class of the data-loss bug we just fixed. Still kilobytes of JSON; no
  image duplication (configs reference photos, they don't contain them).
- **Optional hardening — Bucket lock on `history/`.** A retention rule so snapshots can't be
  accidentally deleted. Nice-to-have.
- **Tier 2 — restore UI / history slider (future, out of scope).** Surface the `history/`
  snapshots in the editor: list, preview, restore. Tier 1 lays the storage so this is a small
  additive follow-up. Not built now.

## Relationship to Undo/Redo (2026-09-14-undo-redo-design.md)

Complementary, not overlapping. Undo is **in-memory, per-surface, session-only** — for
live editing mistakes. Publish history is **durable, at publish checkpoints** — for reverting
to a past *published* version. Both must cancel/flush the pending debounced autosave when they
write, to avoid a stale write clobbering the result (see Risks).

## Units

1. `common/gcsUser.js` — published + history path helpers.
2. `common/siteConfig.js` — stamp `updatedAt` on write; `readPublishedSiteConfig`,
   `writePublishedSiteConfig`, `ensurePublishedSeeded`.
3. `pages/api/admin/site-config.js` GET — compute `hasUnpublishedChanges` + `lastPublishedAt`
   (+ seed on read).
4. `pages/api/admin/publish.js` (new) — persist draft, write published, snapshot, prune.
5. Public read paths (3 files) — use `readPublishedSiteConfig`.
6. `pages/studio/index.js` — initialize `hasUnpublishedChanges`/`lastPublishedAt` from GET;
   `onPublish` becomes async (POST current config, set `publishing`, update flags on success).
7. `PlatformSidebar` publish button — already keys off `hasUnpublishedChanges`/`publishing`;
   add a saving→publishing state if needed.

## Testing

- **Unit:** dirty computation (draft newer than published → true; equal → false; no published
  → seeds then false); prune keeps newest 20.
- **Manual:** edit → autosave → draft changes but public site unchanged; Publish → public site
  updates; refresh editor → dirty state correct (disabled right after publish, enabled after a
  new edit); legacy user (no published file) → site stays live, opens clean; publish twice →
  two history snapshots; publish 21× → oldest pruned.

## Risks / edge cases

- **Autosave vs publish race.** Publish sends the current config in-body and writes the draft
  itself, so a pending debounced autosave can't leave the published copy stale. `onPublish`
  should also cancel the pending autosave timer after publishing.
- **Public caching.** Public pages use `getServerSideProps` (per-request, no ISR today), so a
  publish is visible immediately with no invalidation. If ISR/edge caching is added later,
  publish must trigger revalidation — noted for the future.
- **Multi-tab / concurrent edits.** Out of scope (single-user assumption); last write wins on
  the draft.
- **History storage growth.** Bounded by the 20-snapshot cap per user; config JSON is small.
