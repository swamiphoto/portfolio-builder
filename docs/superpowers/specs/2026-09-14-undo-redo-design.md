# Undo / Redo — Design Spec

**Date:** 2026-09-14 · **Status:** design approved (A/A/A), pending build

## Goal

Universal undo/redo in the studio. `Cmd/Ctrl+Z` undoes, `Cmd/Ctrl+Shift+Z` (and `Cmd/Ctrl+Y`) redoes. Covers theme changes, block edits, photo moves/adds/splits, page create/move/drag-to-hidden, and library/set changes — anything that flows through the app's config stores. Where we already show a toast for an action, the toast also gets an **Undo** button.

## Decisions (locked)

- **Granularity — one logical action per step.** Most structural actions are a single config write, so one snapshot = one step. Text-field typing uses the browser's native undo while focused; the whole field edit becomes one step once committed (blur).
- **Scope — per-surface.** The Library and the page editor each own their undo/redo stack. `Cmd+Z` undoes the last action on the surface you're using. No cross-surface global timeline.
- **Persistence — in-memory, session-only.** History clears on reload.
- **Depth — ~50 steps per surface.**

## Architecture

### The two choke points

Nearly all mutations already funnel through:

- `updateConfig(updater)` in `pages/studio/index.js` → `siteConfig` (pages, theme, settings, block edits, page moves, drag-to-hidden). Debounced autosave → `PUT /api/admin/site-config`.
- `saveConfig(newConfig)` in `components/admin/AdminLibrary.js` → library config (assets, galleries/sets, portfolios) → `PUT /api/admin/library`.

A few direct PUTs bypass these (`PageEditorSidebar`, `AccountPopover`, the import-composition fallback). v1: route the user-facing ones through the choke point so they're undoable; leave rare/administrative ones out (documented).

### History store: `useHistory`

A small hook per surface holding two stacks of config snapshots:

```
{ undo: Config[], redo: Config[],
  capture(prevConfig), popUndo(currentConfig), popRedo(currentConfig),
  canUndo, canRedo }
```

- `capture(prev)` pushes `prev` onto `undo`, clears `redo`, trims to depth 50. Called with the PRE-change config at each committed action.
- `popUndo(current)` pops `undo`, pushes `current` onto `redo`, returns the popped snapshot to restore.
- `popRedo(current)` reverses.

Snapshots are the whole config object; the existing immutable-update pattern gives structural sharing, and config JSON size is bounded, so 50 snapshots is cheap.

### Wiring the capture (one step per action + coalescing)

- **siteConfig** — in `updateConfig`, `capture(prevConfig)` before applying the updater, UNLESS it should coalesce with the previous write:
  - **Text-field coalescing:** while a text input/textarea/contenteditable is focused, consecutive writes to the *same field* coalesce into one entry (capture only the first; the entry commits on blur).
  - **Same-gesture coalescing:** writes within ~400ms that are part of one gesture (e.g. a drag) coalesce into one entry (time + identity heuristic).
- **library saveConfig** — each call is already one user action (add-to-set, create-set, delete…), so `capture(prevConfig)` per call. No text coalescing needed.

### Applying undo/redo

`popUndo/popRedo` return a snapshot → set it as the config (`setSiteConfig` / `setLibraryData`) AND persist it via the same save path, guarded by a `restoring` flag so the restore does not re-enter `capture`. The restore also **cancels any pending debounced autosave** of the pre-undo state (else it would clobber the restore).

### Keyboard

A global listener in the studio shell handles `Cmd/Ctrl+Z` (undo) and `Cmd/Ctrl+Shift+Z` / `Cmd/Ctrl+Y` (redo). It:

- No-ops when the active element is a text input/textarea/contenteditable (native undo owns those).
- Routes to the CURRENT surface's history (Library vs editor) based on which is active.

### Toast integration

The shared toast helper gains an optional `undo` action; passing it renders an **Undo** button that calls the surface's `popUndo` + restore. Only actions that already toast get the button.

## Units

1. `common/useHistory.js` — pure history stacks + coalescing policy. Unit-testable in isolation.
2. Capture wiring in `updateConfig` (`pages/studio/index.js`) and `saveConfig` (`AdminLibrary.js`).
3. Guarded restore + persist path.
4. `useUndoRedoKeys` — keyboard handler + surface routing.
5. Toast `undo` action.
6. Route the user-facing bypass PUTs through the choke points.

## Testing

- **Unit (`useHistory`):** capture / undo / redo; depth trim; redo-cleared on a new action; coalescing (same-field writes → one entry; time-window merge).
- **Manual:** theme change → undo/redo; block move/add/split → undo/redo; page create/move/drag-to-hidden → undo; library add-to-set/create-set → undo; text edit → native undo while typing, one step after blur; keyboard inert inside text fields; toast Undo button.

## Out of scope (v1)

- Cross-reload persistence.
- A single global cross-surface timeline.
- Restoring UI ephemera (open modals, scroll position, selection).
- Undo for rare admin PUTs not routed through the choke points (documented).

## Risks

- **Autosave race** — undo must persist the restored state and cancel the pending debounced autosave of the pre-undo state. (Mitigated above.)
- **Coalescing correctness** — the "one action" heuristic (time window + same-field) may occasionally merge/split imperfectly; acceptable for v1, tune later.
- **Snapshot size** — whole-config snapshots × 50, bounded by config size; trim depth if a very large site pushes memory.
