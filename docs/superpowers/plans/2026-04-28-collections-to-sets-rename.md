# Collections → Sets Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the library "Collections" concept to "Sets" across the admin UI, code, and config schema, while preserving back-compat for any existing user `library-config.json` data that still has a `collections` key.

**Architecture:** This is a global rename of a domain term. The library data shape currently has `libraryConfig.collections` (a map keyed by `collectionId`) and `asset.collectionIds` (an array of references). After this rename, the shape becomes `libraryConfig.sets` and `asset.setIds`. We rename the in-memory shape, all UI labels, all variable/function/file names, and add a back-compat read path that auto-migrates `collections → sets` (and `collectionIds → setIds`) on load. We do NOT keep dual-writing — once read, everything writes the new shape.

The motivation for the rename: we're introducing a "Collection page" template (separate plan) that publicly shows a curated group of galleries. Reusing "Collection" for both the library grouping and the public-facing page would be confusing. The library term becomes "Set"; the public-facing term remains "Collection".

**Tech Stack:** Next.js (pages router), Jest, plain JS modules.

---

## File Inventory

The string `collection`/`Collection` appears in these 16 files (as of plan-write time). Rename surface — group by responsibility:

**Data layer (must rename):**
- `common/adminConfig.js` — `normalizeCollections`, `libraryConfig.collections`, `asset.collectionIds`, `createEmptyLibraryConfig`
- `common/galleryData.js` — references collection IDs
- `pages/api/admin/library.js` — PUT handler accepts `collections` payload key
- `__tests__/common/adminConfig.test.js` — tests for collection normalization

**Admin UI components (must rename labels + variable names):**
- `components/admin/gallery-builder/CollectionPillsPicker.js` → rename file to `SetPillsPicker.js`
- `components/admin/gallery-builder/PickerFilterRail.js`
- `components/admin/gallery-builder/PhotoPickerModal.js`
- `components/admin/gallery-builder/BlockCard.js`
- `components/admin/gallery-builder/BlockBuilder.js`
- `components/admin/platform/BlockPageEditor.js`
- `components/admin/platform/PageEditorSidebar.js`
- `components/admin/AdminLibrary.js`
- `components/admin/AdminPhotoLightbox.js`
- `components/admin/AlbumSidebar.js`
- `components/admin/PhotoGrid.js`
- `components/admin/UploadModal.js`

---

### Task 1: Add back-compat normalizer (TDD-first)

**Files:**
- Modify: `common/adminConfig.js`
- Test: `__tests__/common/adminConfig.test.js`

- [ ] **Step 1: Read the current `normalizeCollections` and surrounding context**

Read `common/adminConfig.js` lines 1–250 to confirm current shape: `libraryConfig.collections` (map), entries with `collectionId`, `name`, `kind`, `assetIds`, `rule`, `createdAt`, `updatedAt`. Also note `asset.collectionIds` (array) inside `createAssetRecord` (line ~188) and `createEmptyLibraryConfig` (line ~229) which seeds `collections: {}`.

- [ ] **Step 2: Write failing test for back-compat read path**

Add this test to `__tests__/common/adminConfig.test.js`:

```js
import { normalizeLibraryConfig } from '../../common/adminConfig'

describe('normalizeLibraryConfig — sets back-compat', () => {
  it('reads legacy `collections` key and exposes it as `sets`', () => {
    const legacy = {
      assets: {},
      collections: {
        wed24: { collectionId: 'wed24', name: 'Weddings 2024', kind: 'manual', assetIds: ['ast_a'] },
      },
    }
    const out = normalizeLibraryConfig(legacy)
    expect(out.sets).toBeDefined()
    expect(out.sets.wed24).toMatchObject({ setId: 'wed24', name: 'Weddings 2024', assetIds: ['ast_a'] })
    expect(out.collections).toBeUndefined()
  })

  it('reads modern `sets` key as-is', () => {
    const modern = {
      assets: {},
      sets: {
        wed24: { setId: 'wed24', name: 'Weddings 2024', kind: 'manual', assetIds: ['ast_a'] },
      },
    }
    const out = normalizeLibraryConfig(modern)
    expect(out.sets.wed24.setId).toBe('wed24')
  })

  it('migrates asset.collectionIds → asset.setIds', () => {
    const legacy = {
      assets: {
        ast_a: { url: 'https://x/a.jpg', collectionIds: ['wed24'] },
      },
    }
    const out = normalizeLibraryConfig(legacy)
    expect(out.assets.ast_a.setIds).toEqual(['wed24'])
    expect(out.assets.ast_a.collectionIds).toBeUndefined()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx jest __tests__/common/adminConfig.test.js -t "sets back-compat"`
Expected: FAIL — `normalizeLibraryConfig` either doesn't exist or doesn't expose a `sets` key.

- [ ] **Step 4: Implement `normalizeSets` and update `normalizeLibraryConfig`**

In `common/adminConfig.js`:

1. Add a new `normalizeSets` function (replaces `normalizeCollections`):

```js
function normalizeSets(sets = {}) {
  const normalized = {};
  for (const [setId, set] of Object.entries(sets || {})) {
    if (!set || typeof set !== "object") continue;
    normalized[setId] = {
      setId,
      name: set.name || setId,
      kind: set.kind || "manual",
      assetIds: uniqueStrings(set.assetIds),
      rule: set.rule || null,
      createdAt: set.createdAt || null,
      updatedAt: set.updatedAt || null,
    };
  }
  return normalized;
}
```

2. Update the existing `normalizeLibraryConfig` (find it in the file — it's the function that calls `normalizeCollections`) to:
   - Read both `config.sets` and legacy `config.collections`, merging with `sets` taking precedence
   - Pass the merged map through `normalizeSets`
   - Output `sets` key (no `collections` key)

3. Update `createAssetRecord` (line ~188) — replace `collectionIds: uniqueStrings(existingAsset.collectionIds)` with `setIds: uniqueStrings(existingAsset.setIds || existingAsset.collectionIds)`.

4. Update `createEmptyLibraryConfig` — replace `collections: {}` with `sets: {}`.

5. Delete the old `normalizeCollections` function entirely.

- [ ] **Step 5: Run tests until passing**

Run: `npx jest __tests__/common/adminConfig.test.js`
Expected: PASS for new tests. Existing tests for collections may now fail — fix them by updating expectations to use `sets`/`setIds` (they were testing the old shape; it's now the new shape).

- [ ] **Step 6: Commit**

```bash
git add common/adminConfig.js __tests__/common/adminConfig.test.js
git commit -m "feat(library): rename Collections data shape to Sets with back-compat read"
```

---

### Task 2: Rename `CollectionPillsPicker` → `SetPillsPicker`

**Files:**
- Rename: `components/admin/gallery-builder/CollectionPillsPicker.js` → `components/admin/gallery-builder/SetPillsPicker.js`
- Modify (importers): `components/admin/gallery-builder/BlockCard.js`, `components/admin/gallery-builder/BlockBuilder.js`, `components/admin/gallery-builder/PickerFilterRail.js`, plus any other file that imports `CollectionPillsPicker`

- [ ] **Step 1: Find all importers of `CollectionPillsPicker`**

Run: `grep -rn "CollectionPillsPicker" --include="*.js" --include="*.jsx" .`
Note every file that imports this component.

- [ ] **Step 2: `git mv` the file**

```bash
git mv components/admin/gallery-builder/CollectionPillsPicker.js components/admin/gallery-builder/SetPillsPicker.js
```

- [ ] **Step 3: Rename the export and all internal references inside the file**

Open `components/admin/gallery-builder/SetPillsPicker.js`. Rename:
- The default-exported component: `CollectionPillsPicker` → `SetPillsPicker`
- All internal variables: `collection` → `set`, `collections` → `sets`, `collectionId` → `setId`, `collectionIds` → `setIds`
- All user-visible strings: "Collection" → "Set", "Collections" → "Sets", "collection" → "set", "collections" → "sets" (preserve casing)
- Any prop names that include `collection` should rename to `set`. For example a prop `collections={...}` becomes `sets={...}` and a prop `onCollectionToggle` becomes `onSetToggle`.

- [ ] **Step 4: Update every importer**

For each file found in Step 1, replace the import path and identifier:
- `import CollectionPillsPicker from '.../CollectionPillsPicker'` → `import SetPillsPicker from '.../SetPillsPicker'`
- All JSX usages `<CollectionPillsPicker ...>` → `<SetPillsPicker ...>`
- Update prop names passed to the component to match Step 3 renames

- [ ] **Step 5: Run dev server smoke check**

Run: `npm run dev -- -p 3000` (kill existing first if needed: `lsof -ti:3000 | xargs kill -9`)
Open the admin in `/browse` or a real browser, navigate to a page editor that uses the picker (open a gallery block, click "Choose photos", verify the Set pill picker rail renders without errors). Check the browser console for any "ReferenceError" or "is not defined" errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(admin): rename CollectionPillsPicker to SetPillsPicker"
```

---

### Task 3: Rename in `common/adminConfig.js` callers and `pages/api/admin/library.js`

**Files:**
- Modify: `pages/api/admin/library.js`
- Modify: `common/galleryData.js`

- [ ] **Step 1: Update the API handler**

In `pages/api/admin/library.js`, find every reference to `collection`/`collections`/`collectionId`/`collectionIds`. Two cases:
- **Request payload keys** (e.g. `req.body.collections`): Accept BOTH `req.body.sets` and legacy `req.body.collections` (prefer `sets`). This keeps any in-flight client requests safe during deploy.
- **Internal variable names** (e.g. `const { collections } = ...`): rename to `sets`.
- **Response keys**: emit `sets` (not `collections`).

- [ ] **Step 2: Update `common/galleryData.js`**

Read the file. For every reference to `collection*`, rename to the `set*` equivalent — variable names, parameter names, and any string literals in error messages or logs. If it consumes `libraryConfig.collections`, change to `libraryConfig.sets` (the normalizer already migrates legacy data, so this is safe).

- [ ] **Step 3: Run tests**

Run: `npx jest`
Expected: ALL PASS. Fix any test that still references the old shape — update to `sets`/`setIds`.

- [ ] **Step 4: Commit**

```bash
git add pages/api/admin/library.js common/galleryData.js
git commit -m "refactor(library): rename collections to sets in API and gallery data"
```

---

### Task 4: Rename in admin component files (UI labels + variable names)

**Files (all under `components/admin/`):**
- `components/admin/AdminLibrary.js`
- `components/admin/AdminPhotoLightbox.js`
- `components/admin/AlbumSidebar.js`
- `components/admin/PhotoGrid.js`
- `components/admin/UploadModal.js`
- `components/admin/gallery-builder/PickerFilterRail.js`
- `components/admin/gallery-builder/PhotoPickerModal.js`
- `components/admin/gallery-builder/BlockCard.js`
- `components/admin/gallery-builder/BlockBuilder.js`
- `components/admin/platform/BlockPageEditor.js`
- `components/admin/platform/PageEditorSidebar.js`

- [ ] **Step 1: Per file — read it, then rename in-place**

For each file in the list above, perform these renames (preserve casing):
- `collection` → `set`
- `Collection` → `Set`
- `collections` → `sets`
- `Collections` → `Sets`
- `collectionId` → `setId`
- `collectionIds` → `setIds`
- `CollectionPillsPicker` references already handled in Task 2 — skip if seen

User-visible UI strings that should change:
- Button/label text: "Add to collection" → "Add to set", "New collection" → "New set", "Collections" header → "Sets", "Filter by collection" → "Filter by set", etc.
- Tooltips, placeholder text, empty states, error messages

DO NOT rename:
- Anything in `node_modules/`, `.git/`, `docs/`
- Comments referring to historical context (e.g. "// Legacy collections support" can stay)
- File names other than `CollectionPillsPicker.js` (already renamed in Task 2)

After each file, save and move to the next. Do NOT batch all 11 — go file-by-file so a typo in one is easy to track down.

- [ ] **Step 2: Search for stragglers**

Run: `grep -rn "[Cc]ollection" --include="*.js" --include="*.jsx" components/ pages/ common/ | grep -v "// " | grep -v node_modules`
Expected: Only references that are intentional (e.g. comments noting legacy back-compat, or strings like "external Collection ID" inside `source.externalCollectionId` — that field name comes from import-source provenance and stays).

If anything else appears, decide case-by-case whether to rename or leave (when in doubt, rename).

- [ ] **Step 3: Run dev server and click through every place**

Run: `npm run dev -- -p 3000`
Manually verify in the browser:
1. Library opens, the Sets section renders with the new label
2. Selecting a Set filters photos
3. Creating a new Set works
4. Renaming a Set works
5. The block editor's Set pill picker (renamed in Task 2) lets you toggle Sets on/off
6. Uploading a photo and assigning it to a Set works
7. The photo lightbox shows the photo's Sets

If any UI label still says "Collection" anywhere, find it and rename.

- [ ] **Step 4: Run all tests**

Run: `npx jest`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add -A components/ pages/
git commit -m "refactor(admin): rename Collections to Sets in admin UI and components"
```

---

### Task 5: Update tests, docs, and final cleanup

**Files:**
- `__tests__/common/adminConfig.test.js`
- `CLAUDE.md` (project root, if it mentions Collections)
- `docs/designs/2026-04-15-library-spec.md` (note: the spec doc references Collections; update to Sets with a brief note that the term changed)

- [ ] **Step 1: Update existing tests in `adminConfig.test.js`**

Read the file. Rename test descriptions, variable names, and assertions from `collection*` to `set*` (excluding the back-compat tests added in Task 1, which intentionally test legacy keys).

Run: `npx jest __tests__/common/adminConfig.test.js`
Expected: ALL PASS.

- [ ] **Step 2: Update CLAUDE.md if needed**

Read `CLAUDE.md`. If it mentions "Collections" as a concept, rename to "Sets" and add a one-line note in the architecture section: `- Library "Sets" = curated groupings of assets (renamed from "Collections" 2026-04-28; "Collection" is now reserved for the public-facing Collection page template).`

- [ ] **Step 3: Update the library spec doc**

Read `docs/designs/2026-04-15-library-spec.md`. Add a top-of-file note:

```markdown
> **2026-04-28 update:** "Collections" in this spec are now called "Sets". The term "Collection" is reserved for the public-facing Collection page template. Read `collection*` → `set*` throughout.
```

Do NOT rewrite the body of the spec — the note is enough.

- [ ] **Step 4: Final grep sweep**

Run: `grep -rn "[Cc]ollection" --include="*.js" --include="*.jsx" .`
Expected output should be ONLY:
- Back-compat normalizer code in `common/adminConfig.js`
- Back-compat tests in `__tests__/common/adminConfig.test.js`
- The `externalCollectionId` field inside import-source provenance (intentional — that's the upstream provider's term)
- Plan docs in `docs/superpowers/plans/` and design specs (frozen historical record)

- [ ] **Step 5: Final test run**

Run: `npx jest`
Expected: ALL PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs: note Collections → Sets rename in spec and CLAUDE.md"
```

---

## Self-Review Notes

- **Spec coverage:** All 16 files from the inventory have a corresponding rename task (Task 1 covers `adminConfig.js` + test; Task 2 covers `CollectionPillsPicker.js`; Task 3 covers `library.js` + `galleryData.js`; Task 4 covers the 11 admin components). Docs covered in Task 5.
- **Back-compat:** Task 1 establishes that `normalizeLibraryConfig` reads either `collections` or `sets` and outputs `sets`. Task 3 makes the API accept either payload key. Once a user's config is read and re-saved, it will only contain `sets`.
- **Type consistency:** `setId`, `setIds`, `sets`, and `Set` (capitalized) are used consistently across all tasks. The internal field name on a Set object is `setId` (matching the prior `collectionId` pattern).
- **Risk:** "Set" is also a JavaScript built-in type. Don't shadow it — use `set` (lowercase, the domain object) or specific names like `selectedSet`, `setEntry`. The plan uses lowercase `set`/`sets` for variables, which won't collide.
