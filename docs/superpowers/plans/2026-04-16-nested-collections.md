# Nested Collections (Path-Based, Rollup) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add path-based nested collections to the photo library so `portraits/mala` is a child of `portraits/`, clicking a parent shows all descendant photos (deduped rollup), and the sidebar renders a collapsible tree.

**Architecture:** Collections are stored as flat keys in `galleries` (e.g. `{ "portraits": [...], "portraits/mala": [...] }`) — no schema change. A `getRollupUrls(key, galleries)` helper computes the union of a key plus all keys that start with `key/`. Counts in the API response use rollup counts for parent keys. The sidebar builds a tree from sorted flat keys and renders with depth-based indentation + expand/collapse.

**Tech Stack:** Next.js 14, React, Tailwind CSS. No new dependencies.

---

## Design Rules (from spec)

- Same photo can appear in `portraits/mala` and `portraits/john` — URL references, not copies
- Adding a photo to `portraits/` when it's already in `portraits/mala` is allowed — deduped in rollup view
- `portraits/` count = deduped union of own list + all descendant lists
- `portraits/mala` count = own list only (no children, so no rollup needed)

## Data Model (unchanged)

```js
// library-config.json galleries field (flat, path-based keys)
{
  "portraits": ["url-a", "url-b"],
  "portraits/mala": ["url-a", "url-c"],
  "portraits/john": ["url-d"]
}
// portraits/ rollup = dedup(["url-a", "url-b"] + ["url-a", "url-c"] + ["url-d"]) = 4 unique URLs
// portraits/ count = 4 (deduped), NOT 3+2+1=6
```

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `common/adminConfig.js` | Modify | Add `getRollupUrls`, `getRollupCount`; update `mergeLibraryData` to use rollup counts |
| `components/admin/AdminLibrary.js` | Modify | `currentAssets()` uses rollup; `handleCreateCollection` accepts `parentKey` |
| `components/admin/AlbumSidebar.js` | Modify | Tree rendering with depth indent, expand/collapse, per-item sub-collection `+` |
| `__tests__/common/adminConfig.test.js` | Modify | Add rollup count tests |

---

## Task 1: Rollup Helpers in `common/adminConfig.js`

**Files:**
- Modify: `common/adminConfig.js`
- Modify: `__tests__/common/adminConfig.test.js`

- [ ] **Step 1: Write failing tests**

Add to `__tests__/common/adminConfig.test.js`:

```js
import {
  LIBRARY_CONFIG_VERSION,
  createAssetIdFromUrl,
  createEmptyLibraryConfig,
  mergeLibraryData,
  normalizeLibraryConfig,
  getRollupUrls,
  getRollupCount,
} from '../../common/adminConfig'

describe('getRollupUrls', () => {
  const galleries = {
    'portraits': ['url-a', 'url-b'],
    'portraits/mala': ['url-a', 'url-c'],
    'portraits/john': ['url-d'],
    'landscapes': ['url-e'],
  }

  it('returns own urls + all descendant urls, deduped', () => {
    const result = getRollupUrls('portraits', galleries)
    expect(result).toHaveLength(4)
    expect(new Set(result)).toEqual(new Set(['url-a', 'url-b', 'url-c', 'url-d']))
  })

  it('returns only own urls for a leaf with no children', () => {
    const result = getRollupUrls('portraits/mala', galleries)
    expect(result).toEqual(['url-a', 'url-c'])
  })

  it('does not include sibling collections', () => {
    const result = getRollupUrls('portraits/mala', galleries)
    expect(result).not.toContain('url-d')
  })

  it('returns empty array for unknown key', () => {
    expect(getRollupUrls('unknown', galleries)).toEqual([])
  })
})

describe('getRollupCount', () => {
  const galleries = {
    'portraits': ['url-a'],
    'portraits/mala': ['url-a', 'url-c'],
    'portraits/john': ['url-d'],
  }

  it('returns deduped count across own + descendants', () => {
    expect(getRollupCount('portraits', galleries)).toBe(3)
  })

  it('returns own count for leaf', () => {
    expect(getRollupCount('portraits/mala', galleries)).toBe(2)
  })
})

describe('mergeLibraryData rollup counts', () => {
  it('uses rollup count for parent collections', () => {
    const urlA = 'https://example.com/a.jpg'
    const urlB = 'https://example.com/b.jpg'
    const merged = mergeLibraryData(
      [{ url: urlA, name: 'a.jpg', size: 1 }, { url: urlB, name: 'b.jpg', size: 1 }],
      {
        galleries: {
          'portraits': [urlA],
          'portraits/mala': [urlA, urlB],
        },
      }
    )
    // portraits/ rollup = dedup([urlA] + [urlA, urlB]) = 2
    expect(merged.counts['portraits']).toBe(2)
    // portraits/mala = own only = 2
    expect(merged.counts['portraits/mala']).toBe(2)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern="adminConfig" --no-coverage 2>&1 | tail -15
```
Expected: FAIL with "getRollupUrls is not a function"

- [ ] **Step 3: Add `getRollupUrls` and `getRollupCount` to `common/adminConfig.js`**

Add after the `addToAlbum` function at the end of `common/adminConfig.js`:

```js
/**
 * Returns deduped union of URLs for a collection key plus all descendant keys.
 * e.g. getRollupUrls('portraits', galleries) includes portraits/mala, portraits/john etc.
 */
export function getRollupUrls(key, galleries) {
  const prefix = key + '/'
  const matchingKeys = Object.keys(galleries).filter(
    (k) => k === key || k.startsWith(prefix)
  )
  return [...new Set(matchingKeys.flatMap((k) => galleries[k] || []))]
}

export function getRollupCount(key, galleries) {
  return getRollupUrls(key, galleries).length
}
```

- [ ] **Step 4: Update `mergeLibraryData` to use rollup counts for galleries**

In `common/adminConfig.js`, find the `mergeLibraryData` function. Replace the line that computes gallery counts:

```js
  // BEFORE:
  for (const [key, urls] of Object.entries(normalized.galleries)) counts[key] = urls.length;

  // AFTER:
  for (const key of Object.keys(normalized.galleries)) counts[key] = getRollupCount(key, normalized.galleries);
```

The full counts block should now read:
```js
  const counts = { all: orderedAssets.length };
  for (const [key, urls] of Object.entries(normalized.portfolios)) counts[key] = urls.length;
  for (const key of Object.keys(normalized.galleries)) counts[key] = getRollupCount(key, normalized.galleries);
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern="adminConfig" --no-coverage 2>&1 | tail -15
```
Expected: all tests PASS (existing + new)

- [ ] **Step 6: Commit**

```bash
git add common/adminConfig.js __tests__/common/adminConfig.test.js
git commit -m "feat: add getRollupUrls/getRollupCount for nested collection rollup counts"
```

---

## Task 2: Rollup in `AdminLibrary.js` + Nested Collection Creation

**Files:**
- Modify: `components/admin/AdminLibrary.js`

- [ ] **Step 1: Read the file**

```bash
cat components/admin/AdminLibrary.js
```

- [ ] **Step 2: Update `currentAssets()` to use rollup**

Find the `currentAssets` function. It currently reads:
```js
const urls =
  selectedAlbum.type === "portfolio"
    ? libraryData.portfolios[selectedAlbum.key] || []
    : libraryData.galleries[selectedAlbum.key] || [];

return applyFilters(urls.map(getAssetByUrl).filter(Boolean));
```

Replace with:
```js
if (selectedAlbum.type === "portfolio") {
  const urls = libraryData.portfolios[selectedAlbum.key] || []
  return applyFilters(urls.map(getAssetByUrl).filter(Boolean))
}

// Gallery: rollup — include own + all descendant collections, deduped
const galleries = libraryData.galleries || {}
const prefix = selectedAlbum.key + '/'
const matchingKeys = Object.keys(galleries).filter(
  (k) => k === selectedAlbum.key || k.startsWith(prefix)
)
const urls = [...new Set(matchingKeys.flatMap((k) => galleries[k] || []))]
return applyFilters(urls.map(getAssetByUrl).filter(Boolean))
```

- [ ] **Step 3: Update `handleCreateCollection` to accept a `parentKey`**

Find `handleCreateCollection`. It currently reads:
```js
const handleCreateCollection = useCallback(async (name) => {
  const key = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  if (config.galleries[key]) return;
  const updated = { ...config, galleries: { ...config.galleries, [key]: [] } };
  await saveConfig(updated);
  setSelectedAlbum({ type: "gallery", key });
}, [saveConfig]);
```

Replace with:
```js
const handleCreateCollection = useCallback(async (name, parentKey = null) => {
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
  if (!slug) return
  const key = parentKey ? `${parentKey}/${slug}` : slug
  const config = currentConfig()
  if (config.galleries[key]) return
  const updated = { ...config, galleries: { ...config.galleries, [key]: [] } }
  await saveConfig(updated)
  setSelectedAlbum({ type: "gallery", key })
}, [saveConfig])
```

- [ ] **Step 4: Update `AlbumSidebar` call to pass `selectedCollectionKey` as default parent**

Find where `<AlbumSidebar` is rendered. Currently:
```jsx
onCreateCollection={handleCreateCollection}
```

Change to pass the currently-selected collection key as context (AlbumSidebar will pass it when creating a sub-collection):
```jsx
onCreateCollection={handleCreateCollection}
```
(No change here — `AlbumSidebar` will pass the `parentKey` as second argument when user clicks a per-item `+`. The section-level `+` passes no parent.)

- [ ] **Step 5: Verify build passes**

```bash
npm run build 2>&1 | grep -v "ENOSPC\|PackFile\|Caching failed" | grep -E "Error|error" | head -5
```
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add components/admin/AdminLibrary.js
git commit -m "feat: use rollup for gallery assets, support nested collection creation"
```

---

## Task 3: Tree UI in `AlbumSidebar.js`

**Files:**
- Modify: `components/admin/AlbumSidebar.js`

The sidebar Collections section needs to render a tree. Keys like `portraits`, `portraits/mala`, `portraits/john` become:

```
Collections                    [+]
  Portraits             4  [+] [▾]
    Mala                2  [+]
    John                1  [+]
```

- [ ] **Step 1: Read the current file**

```bash
cat components/admin/AlbumSidebar.js
```

- [ ] **Step 2: Add `buildCollectionTree` helper function**

Add this function before the `AlbumSidebar` export:

```js
function buildCollectionTree(keys) {
  const sorted = [...keys].sort()
  return sorted.map((key) => {
    const parts = key.split('/')
    const depth = parts.length - 1
    const label = parts[parts.length - 1]
    const hasChildren = sorted.some((k) => k.startsWith(key + '/'))
    return { key, label, depth, hasChildren }
  })
}
```

- [ ] **Step 3: Replace the Collections section in the render**

Find the entire `<SidebarSection title="Collections" ...>` block and replace it with:

```jsx
{(() => {
  const nodes = buildCollectionTree(galleryKeys)
  const [collapsed, setCollapsed] = React.useState(new Set())
  const [creatingUnder, setCreatingUnder] = React.useState(undefined) // undefined=closed, null=root, string=parentKey
  const [newCollectionName, setNewCollectionName] = React.useState('')

  const visibleNodes = nodes.filter((node) => {
    const parts = node.key.split('/')
    for (let i = 1; i < parts.length; i++) {
      if (collapsed.has(parts.slice(0, i).join('/'))) return false
    }
    return true
  })

  function submitCreate(parentKey) {
    const slug = newCollectionName.trim()
    if (!slug) return
    onCreateCollection(slug, parentKey ?? null)
    setCreatingUnder(undefined)
    setNewCollectionName('')
  }

  return (
    <SidebarSection
      title="Collections"
      action={
        <button
          onClick={() => { setCreatingUnder(null); setNewCollectionName('') }}
          className="text-gray-400 hover:text-gray-700 text-base leading-none"
          title="New collection"
        >+</button>
      }
    >
      {visibleNodes.map((node) => (
        <div key={node.key} style={{ paddingLeft: node.depth * 12 }}>
          <div className="flex items-center group">
            <div className="flex-1 min-w-0">
              <SidebarButton
                active={isSelected("gallery", node.key)}
                label={node.label}
                count={counts[node.key] ?? 0}
                onClick={() => { onSelect({ type: "gallery", key: node.key }); onFilterChange("usage", "all") }}
              />
            </div>
            <div className="flex items-center gap-0.5 pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => { setCreatingUnder(node.key); setNewCollectionName('') }}
                className="text-gray-400 hover:text-gray-700 text-xs px-1"
                title={`New sub-collection under ${node.label}`}
              >+</button>
              {node.hasChildren && (
                <button
                  onClick={() => setCollapsed((prev) => {
                    const next = new Set(prev)
                    if (next.has(node.key)) next.delete(node.key)
                    else next.add(node.key)
                    return next
                  })}
                  className="text-gray-400 hover:text-gray-700 text-xs px-1"
                >
                  {collapsed.has(node.key) ? '▸' : '▾'}
                </button>
              )}
            </div>
          </div>
          {creatingUnder === node.key && (
            <div className="px-2 py-1" style={{ paddingLeft: (node.depth + 1) * 12 + 8 }}>
              <input
                autoFocus
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitCreate(node.key)
                  else if (e.key === 'Escape') setCreatingUnder(undefined)
                }}
                onBlur={() => setCreatingUnder(undefined)}
                placeholder="Collection name"
                className="w-full text-sm px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500"
              />
            </div>
          )}
        </div>
      ))}
      {creatingUnder === null && (
        <div className="px-2 py-1">
          <input
            autoFocus
            type="text"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitCreate(null)
              else if (e.key === 'Escape') setCreatingUnder(undefined)
            }}
            onBlur={() => setCreatingUnder(undefined)}
            placeholder="Collection name"
            className="w-full text-sm px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500"
          />
        </div>
      )}
    </SidebarSection>
  )
})()}
```

- [ ] **Step 4: Remove old `creatingCollection` / `newCollectionName` state and old inline input**

The IIFE in Step 3 owns all the state internally. Remove from the top of `AlbumSidebar`:
```js
// DELETE these two lines:
const [creatingCollection, setCreatingCollection] = React.useState(false);
const [newCollectionName, setNewCollectionName] = React.useState("");
```

- [ ] **Step 5: Verify build passes**

```bash
npm run build 2>&1 | grep -v "ENOSPC\|PackFile\|Caching failed" | grep -E "Error|error" | head -5
```
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add components/admin/AlbumSidebar.js
git commit -m "feat: tree UI for nested collections with expand/collapse and sub-collection creation"
```

---

## Spec Coverage Check

| Requirement | Task |
|-------------|------|
| Path-based keys (`portraits/mala`) | Task 2 (handleCreateCollection with parentKey) |
| Same photo in multiple collections | Already works (URL reference model unchanged) |
| Clicking parent shows rollup of all descendants, deduped | Task 2 (currentAssets rollup) |
| Parent count = deduped union of own + descendants | Task 1 (getRollupCount in mergeLibraryData) |
| Leaf count = own only | Task 1 (getRollupCount — no children, returns own) |
| Adding same photo to parent + child → shown once in rollup | Task 1 + 2 (Set dedup) |
| Tree UI with depth indentation | Task 3 |
| Expand/collapse parent nodes | Task 3 |
| Section `+` creates root collection | Task 3 (creatingUnder=null) |
| Per-item `+` creates sub-collection | Task 3 (creatingUnder=node.key) |
| Tests for rollup logic | Task 1 |
