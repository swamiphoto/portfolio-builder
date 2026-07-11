# Library Duplicate Finder Implementation Plan (exact, v1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. The UI task (Task 8) also follows frontend-design conventions and needs in-browser verification (dev server on http://localhost:3000).

**Goal:** A user-driven "Find duplicates" scan in the Library that detects exact (byte-identical) duplicate photos, reviews them, and consolidates each group into one canonical photo — rewriting every reference (galleries, Sets, page/block placements) and deleting the redundant files.

**Architecture:** SHA-256 is computed at store time (reusing the upload/import pipeline's in-hand buffer) and stored on `hashes.exact`. The scan backfills hashes for legacy assets via a batched, SSRF-safe endpoint (same client-orchestrated pattern as import), groups by hash, and consolidates through a pure config transform (library config + site config) plus targeted R2 file deletes. The UI reuses the import progress + review-list patterns.

**Tech Stack:** Next.js pages router, plain JavaScript, Jest + @testing-library/react (ESM `import`, `__tests__/**/*.test.js`, `@/` → root), Node `crypto` (SHA-256), `@aws-sdk/client-s3` (R2), existing `safeFetch`/`storeImageBuffer`/`deleteFile`.

## Global Constraints

- **Language:** plain JavaScript, no TypeScript.
- **Tests:** Jest, `__tests__/**/*.test.js`, ESM `import`, `@/` → root. Node-env docblock (`/** @jest-environment node */`) for tests that transitively import cheerio/undici or node core (crypto/dns). Component tests use jsdom (mock the client module). Focused run: `npx jest <path>`.
- **Scope:** EXACT duplicates only (byte-identical, hex SHA-256). Perceptual/near-duplicate is OUT (deferred). Do not compute or use `hashes.perceptual`.
- **No library-config schema changes.** Use the existing `hashes.exact`, `duplicateStatus`, and `usage` fields.
- **Reuse, don't duplicate:** `storeImageBuffer` (`common/storeImage.js`), `safeFetch` (`common/import/safeFetch.js`), `gcsClient` (`deleteFile`/`downloadJSON`/`uploadJSON`), `withAuth`, the import batching pattern, and `ImportProgress` for progress UI.
- **Deletion is required and permanent:** the library GET re-derives assets from R2 object listing (`listAllImages` in `pages/api/admin/library.js`), so consolidation MUST delete the redundant original + thumbnail R2 objects, not just the config record. Safe because the byte-identical canonical survives.
- **Thumbnail key rule (verbatim):** `original.replace('/photos/', '/thumbnails/').replace(/\.[^.]+$/, '.jpg')`. Storage key of an asset = its `storageKey`, or derive from `publicUrl` by stripping the `PUBLIC_URL` prefix.
- **Canonical selection (verbatim):** highest `usage.usageCount`; tie → oldest `createdAt`; final tie → lexicographically smallest `assetId`.
- **Serverless-safe:** batched, client-orchestrated hashing (cap batch size like `fetch-batch`); per-item failures never abort a batch.
- **Copy:** warm, plain prose; no AI-tell patterns.

---

### Task 1: Store-time SHA-256 in `storeImageBuffer`

**Files:**
- Modify: `common/storeImage.js`
- Test: `__tests__/import/storeImageHash.test.js`

**Interfaces:**
- Produces: `storeImageBuffer(userId, {...})` now returns `{ gcsUrl, objectPath, width, height, hash }` where `hash` is the lowercase hex SHA-256 of `buffer`.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/import/storeImageHash.test.js
import { jest } from '@jest/globals'
const send = jest.fn().mockResolvedValue({})
jest.mock('@/common/gcsClient', () => ({ s3: { send }, BUCKET: 'b', PUBLIC_URL: 'https://cdn.test' }))
const { storeImageBuffer } = await import('@/common/storeImage')
const sharp = (await import('sharp')).default
import crypto from 'crypto'

describe('storeImageBuffer hash', () => {
  it('returns the lowercase hex sha256 of the buffer', async () => {
    const buffer = await sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 9, g: 9, b: 9 } } }).png().toBuffer()
    const out = await storeImageBuffer('u', { buffer, filename: 'a.png', contentType: 'image/png', folder: 'photos/import' })
    expect(out.hash).toBe(crypto.createHash('sha256').update(buffer).digest('hex'))
    expect(out.hash).toMatch(/^[0-9a-f]{64}$/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/import/storeImageHash.test.js`
Expected: FAIL — `out.hash` is undefined.

- [ ] **Step 3: Implement**

In `common/storeImage.js`, add `import crypto from 'crypto'` at the top. Compute the hash right after the original upload and add it to the return:

```javascript
// after: await s3.send(new PutObjectCommand({ ... Key: key ... }))
const hash = crypto.createHash('sha256').update(buffer).digest('hex')
// ...
return { gcsUrl: `${PUBLIC_URL}/${key}`, objectPath: key, width, height, hash }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/import/storeImageHash.test.js`
Expected: PASS.

- [ ] **Step 5: Run the existing storeImage test (no regression)**

Run: `npx jest __tests__/import/storeImage.test.js`
Expected: PASS (its assertions don't check `hash`, so adding it is safe).

- [ ] **Step 6: Commit**

```bash
git add common/storeImage.js __tests__/import/storeImageHash.test.js
git commit -m "feat(dedup): compute sha256 content hash in storeImageBuffer"
```

---

### Task 2: Persist `hashes.exact` on import

**Files:**
- Modify: `common/import/importCore.js` (`buildImportedAsset` accepts `hash`)
- Modify: `pages/api/admin/import/fetch-batch.js` (pass `stored.hash`)
- Test: `__tests__/import/importCore.test.js` (extend)

**Interfaces:**
- Consumes: `storeImageBuffer` return `hash` (Task 1).
- Produces: `buildImportedAsset({ ..., hash })` sets `hashes: { exact: hash ?? null, perceptual: null }` on the returned asset.

- [ ] **Step 1: Write the failing test (append to importCore.test.js)**

```javascript
// in __tests__/import/importCore.test.js, add:
describe('buildImportedAsset hash', () => {
  it('writes the content hash to hashes.exact', () => {
    const a = buildImportedAsset({ url: 'https://cdn/x.jpg', width: 2, height: 1, provider: 'generic', hash: 'abc123', now: '2026-07-09T00:00:00Z' })
    expect(a.hashes).toEqual({ exact: 'abc123', perceptual: null })
  })
  it('defaults hashes.exact to null when no hash given', () => {
    const a = buildImportedAsset({ url: 'https://cdn/y.jpg', provider: 'generic', now: '2026-07-09T00:00:00Z' })
    expect(a.hashes).toEqual({ exact: null, perceptual: null })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/import/importCore.test.js -t "hash"`
Expected: FAIL — `a.hashes` undefined.

- [ ] **Step 3: Implement in `common/import/importCore.js`**

Add `hash` to the destructured params of `buildImportedAsset`, and add to the returned object:

```javascript
export function buildImportedAsset({ url, width, height, provider, sourceUrl, label, externalCollectionId, importBatchId, caption, hash, now }) {
  // ...existing body...
  return {
    // ...existing fields...
    hashes: { exact: hash ?? null, perceptual: null },
    source: { /* unchanged */ },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/import/importCore.test.js`
Expected: PASS (all, including existing).

- [ ] **Step 5: Wire the hash through fetch-batch**

In `pages/api/admin/import/fetch-batch.js`, the loop already calls `storeImageBuffer(...)` into `stored` and `buildImportedAsset({...})`. Add `hash: stored.hash` to the `buildImportedAsset` call.

- [ ] **Step 6: Run the fetch-batch route test (no regression)**

Run: `npx jest __tests__/import/fetchBatch.route.test.js`
Expected: PASS. (The mock `storeImageBuffer` returns no `hash`, so imported assets get `hashes.exact: null` — fine.)

- [ ] **Step 7: Commit**

```bash
git add common/import/importCore.js pages/api/admin/import/fetch-batch.js __tests__/import/importCore.test.js
git commit -m "feat(dedup): persist hashes.exact on imported assets"
```

---

### Task 3: Persist `hashes.exact` on manual upload

**Files:**
- Modify: `components/admin/UploadModal.js` (thread `hash` from the upload response)
- Modify: `components/admin/AdminLibrary.js` (`handleUploaded` writes `hashes.exact`)
- Test: `__tests__/components/UploadHashSeed.test.js`

**Interfaces:**
- Consumes: `upload-file` response now includes `hash` (it returns `storeImageBuffer`'s result verbatim — Task 1).
- Produces: uploaded asset records carry `hashes: { exact: <hash>, perceptual: null }`.

**Note:** `pages/api/admin/upload-file.js` already returns `storeImageBuffer`'s result directly, so its response includes `hash` after Task 1 — no change needed there.

- [ ] **Step 1: Write the failing test (pure seeding helper)**

To keep this testable without rendering the whole uploader, extract the per-asset seed into a tiny pure helper. Create it and test it:

```javascript
// __tests__/components/UploadHashSeed.test.js
import { seedUploadedAsset } from '@/common/import/uploadedAsset'

describe('seedUploadedAsset', () => {
  it('builds an asset record carrying the content hash', () => {
    const a = seedUploadedAsset({ url: 'https://cdn/p.jpg', width: 20, height: 10, hash: 'deadbeef', now: '2026-07-09T00:00:00Z' }, {})
    expect(a.publicUrl).toBe('https://cdn/p.jpg')
    expect(a.orientation).toBe('landscape')
    expect(a.aspectRatio).toBe(2)
    expect(a.hashes).toEqual({ exact: 'deadbeef', perceptual: null })
  })
  it('preserves an existing asset and null hash when absent', () => {
    const a = seedUploadedAsset({ url: 'https://cdn/q.jpg', now: '2026-07-09T00:00:00Z' }, { caption: 'keep' })
    expect(a.caption).toBe('keep')
    expect(a.hashes).toEqual({ exact: null, perceptual: null })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/UploadHashSeed.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `common/import/uploadedAsset.js`**

```javascript
// common/import/uploadedAsset.js
// Seed a library asset record for a freshly uploaded file (mirrors the fields
// AdminLibrary.handleUploaded set inline, plus the content hash).
export function seedUploadedAsset({ url, width, height, hash, now }, existing = {}) {
  const ratio = width && height ? width / height : null
  return {
    ...existing,
    assetId: existing.assetId,
    publicUrl: url,
    createdAt: existing.createdAt || now,
    ...(width && height
      ? {
          width,
          height,
          aspectRatio: Number(ratio.toFixed(4)),
          orientation: ratio === 1 ? 'square' : ratio > 1 ? 'landscape' : 'portrait',
        }
      : {}),
    hashes: { exact: hash ?? existing.hashes?.exact ?? null, perceptual: existing.hashes?.perceptual ?? null },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/UploadHashSeed.test.js`
Expected: PASS.

- [ ] **Step 5: Use it in AdminLibrary + thread the hash in UploadModal**

In `components/admin/UploadModal.js`, where it destructures the upload response (`const { gcsUrl, width, height } = await uploadFile(...)`), add `hash`: `const { gcsUrl, width, height, hash } = await uploadFile(...)` and push `{ url: gcsUrl, width, height, hash }` into `uploadedAssets`.

In `components/admin/AdminLibrary.js` `handleUploaded`, replace the inline asset-seed object with a call to `seedUploadedAsset` (import it: `import { seedUploadedAsset } from '@/common/import/uploadedAsset'`). Assign `assetId = createAssetIdFromUrl(url)` first, then:
```javascript
assetUpdates[assetId] = seedUploadedAsset({ url, width, height, hash, now }, { ...(libraryData?.assets?.[assetId] || {}), assetId })
```

- [ ] **Step 6: Verify (focused + suite)**

Run: `npx jest __tests__/components/UploadHashSeed.test.js` → PASS.
Run: `npx jest` → only the 3 pre-existing upstream failures (siteConfig ×2, CrossBlockDrag); no new failures.

- [ ] **Step 7: Commit**

```bash
git add common/import/uploadedAsset.js components/admin/UploadModal.js components/admin/AdminLibrary.js __tests__/components/UploadHashSeed.test.js
git commit -m "feat(dedup): persist hashes.exact on manually uploaded assets"
```

---

### Task 4: Duplicate detection (pure)

**Files:**
- Create: `common/library/dedup.js`
- Test: `__tests__/library/dedup.test.js`

**Interfaces:**
- Produces:
  - `assetsMissingHash(assets) -> [{ assetId, url }]` — assets whose `hashes.exact` is falsy (need backfill), with their `publicUrl`.
  - `groupDuplicates(assets) -> [{ hash, assetIds: string[] }]` — groups where ≥2 assets share a non-empty `hashes.exact` (stable order: by first-seen).
  - `chooseCanonical(assets, assetIds) -> string` — canonical assetId per the Global-Constraints rule.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/library/dedup.test.js
import { assetsMissingHash, groupDuplicates, chooseCanonical } from '@/common/library/dedup'

const A = {
  a1: { assetId: 'a1', publicUrl: 'u1', hashes: { exact: 'H' }, usage: { usageCount: 1 }, createdAt: '2026-01-02' },
  a2: { assetId: 'a2', publicUrl: 'u2', hashes: { exact: 'H' }, usage: { usageCount: 5 }, createdAt: '2026-01-03' },
  a3: { assetId: 'a3', publicUrl: 'u3', hashes: { exact: 'H' }, usage: { usageCount: 5 }, createdAt: '2026-01-01' },
  b1: { assetId: 'b1', publicUrl: 'u4', hashes: { exact: 'K' } },        // singleton
  c1: { assetId: 'c1', publicUrl: 'u5', hashes: { exact: null } },       // needs hash
  c2: { assetId: 'c2', publicUrl: 'u6' },                                // no hashes obj
}

describe('assetsMissingHash', () => {
  it('lists assets without an exact hash, with their url', () => {
    expect(assetsMissingHash(A)).toEqual([{ assetId: 'c1', url: 'u5' }, { assetId: 'c2', url: 'u6' }])
  })
})
describe('groupDuplicates', () => {
  it('groups assetIds by shared non-empty exact hash, ignoring singletons/missing', () => {
    const g = groupDuplicates(A)
    expect(g).toHaveLength(1)
    expect(g[0].hash).toBe('H')
    expect(g[0].assetIds.sort()).toEqual(['a1', 'a2', 'a3'])
  })
})
describe('chooseCanonical', () => {
  it('picks highest usageCount, then oldest createdAt, then smallest id', () => {
    // a2 & a3 both usage 5; a3 is older -> a3 wins
    expect(chooseCanonical(A, ['a1', 'a2', 'a3'])).toBe('a3')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/library/dedup.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `common/library/dedup.js`**

```javascript
// common/library/dedup.js
export function assetsMissingHash(assets) {
  const out = []
  for (const asset of Object.values(assets || {})) {
    if (!asset?.hashes?.exact) out.push({ assetId: asset.assetId, url: asset.publicUrl })
  }
  return out
}

export function groupDuplicates(assets) {
  const byHash = new Map()
  for (const asset of Object.values(assets || {})) {
    const h = asset?.hashes?.exact
    if (!h) continue
    if (!byHash.has(h)) byHash.set(h, [])
    byHash.get(h).push(asset.assetId)
  }
  const groups = []
  for (const [hash, assetIds] of byHash) {
    if (assetIds.length >= 2) groups.push({ hash, assetIds })
  }
  return groups
}

export function chooseCanonical(assets, assetIds) {
  const score = (id) => {
    const a = assets[id] || {}
    return { count: a.usage?.usageCount || 0, created: a.createdAt || '', id }
  }
  return [...assetIds].sort((x, y) => {
    const sx = score(x)
    const sy = score(y)
    if (sy.count !== sx.count) return sy.count - sx.count // higher count first
    if (sx.created !== sy.created) return sx.created < sy.created ? -1 : 1 // older (smaller ISO) first
    return sx.id < sy.id ? -1 : 1 // smaller id first
  })[0]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/library/dedup.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/library/dedup.js __tests__/library/dedup.test.js
git commit -m "feat(dedup): exact-duplicate detection (group + canonical selection)"
```

---

### Task 5: Consolidation transform (pure — the core)

**Files:**
- Create: `common/library/consolidate.js`
- Test: `__tests__/library/consolidate.test.js`

**Interfaces:**
- Consumes: `chooseCanonical` from `@/common/library/dedup`.
- Produces: `consolidate(libraryConfig, siteConfig, decisions) -> { libraryConfig, siteConfig, deleteUrls, siteChanged }` where `decisions = [{ canonicalId, redundantIds: string[] }]`. Pure; inputs untouched (returns new objects). `deleteUrls` = the redundant assets' `publicUrl`s (the caller deletes their files). `siteChanged` = whether any page/block reference was rewritten.

**Behavior (per spec §6):** rewrite URLs (redundant→canonical `publicUrl`) in `galleries`/`portfolios` arrays and in site-config blocks (`image`/`imageUrl`/`images`/`imageUrls`, and a top-level `cover` image if present); rewrite assetIds (redundant→canonical) in `sets[*].assetIds` and `assetOrder`; union `setIds`/`tags`/`usage` and adopt a non-empty `caption`/`alt` onto the canonical; drop redundant asset records and their `assetIdByUrl` entries; de-dupe all rewritten arrays.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/library/consolidate.test.js
import { consolidate } from '@/common/library/consolidate'

const libraryConfig = {
  assets: {
    keep: { assetId: 'keep', publicUrl: 'https://cdn/keep.jpg', setIds: ['s1'], tags: ['x'], caption: '', usage: { pageIds: ['home'], galleryIds: ['japan'], blockIds: ['b1'], cover: false } },
    dup:  { assetId: 'dup',  publicUrl: 'https://cdn/dup.jpg',  setIds: ['s2'], tags: ['y'], caption: 'nice', usage: { pageIds: ['about'], galleryIds: ['best'], blockIds: ['b2'], cover: true } },
    other:{ assetId: 'other',publicUrl: 'https://cdn/other.jpg' },
  },
  assetOrder: ['keep', 'dup', 'other'],
  assetIdByUrl: { 'https://cdn/keep.jpg': 'keep', 'https://cdn/dup.jpg': 'dup', 'https://cdn/other.jpg': 'other' },
  galleries: { japan: ['https://cdn/keep.jpg'], best: ['https://cdn/dup.jpg', 'https://cdn/other.jpg'] },
  portfolios: {},
  sets: { s1: { setId: 's1', assetIds: ['keep'] }, s2: { setId: 's2', assetIds: ['dup'] } },
}
const siteConfig = {
  pages: [
    { id: 'home', blocks: [{ id: 'b1', type: 'photo', image: { assetId: 'keep', url: 'https://cdn/keep.jpg' }, imageUrl: 'https://cdn/keep.jpg' }] },
    { id: 'about', blocks: [
      { id: 'b2', type: 'photo', image: { assetId: 'dup', url: 'https://cdn/dup.jpg' }, imageUrl: 'https://cdn/dup.jpg' },
      { id: 'b3', type: 'masonry', images: [{ assetId: 'dup', url: 'https://cdn/dup.jpg' }, { assetId: 'other', url: 'https://cdn/other.jpg' }], imageUrls: ['https://cdn/dup.jpg', 'https://cdn/other.jpg'] },
    ] },
  ],
}

describe('consolidate', () => {
  const out = consolidate(libraryConfig, siteConfig, [{ canonicalId: 'keep', redundantIds: ['dup'] }])

  it('reports the redundant file to delete', () => {
    expect(out.deleteUrls).toEqual(['https://cdn/dup.jpg'])
    expect(out.siteChanged).toBe(true)
  })
  it('drops the redundant asset record + index entries', () => {
    expect(out.libraryConfig.assets.dup).toBeUndefined()
    expect(out.libraryConfig.assetOrder).toEqual(['keep', 'other'])
    expect(out.libraryConfig.assetIdByUrl['https://cdn/dup.jpg']).toBeUndefined()
  })
  it('rewrites gallery URLs to the canonical and de-dupes', () => {
    expect(out.libraryConfig.galleries.best).toEqual(['https://cdn/keep.jpg', 'https://cdn/other.jpg'])
  })
  it('rewrites set assetIds to the canonical and unions setIds', () => {
    expect(out.libraryConfig.sets.s2.assetIds).toEqual(['keep'])
    expect(out.libraryConfig.assets.keep.setIds.sort()).toEqual(['s1', 's2'])
  })
  it('unions tags + usage and adopts the non-empty caption', () => {
    expect(out.libraryConfig.assets.keep.tags.sort()).toEqual(['x', 'y'])
    expect(out.libraryConfig.assets.keep.caption).toBe('nice')
    expect(out.libraryConfig.assets.keep.usage.pageIds.sort()).toEqual(['about', 'home'])
    expect(out.libraryConfig.assets.keep.usage.cover).toBe(true)
  })
  it('rewrites page/block references (single + multi, url + assetId + legacy)', () => {
    const about = out.siteConfig.pages.find((p) => p.id === 'about')
    expect(about.blocks[0].image).toEqual({ assetId: 'keep', url: 'https://cdn/keep.jpg' })
    expect(about.blocks[0].imageUrl).toBe('https://cdn/keep.jpg')
    expect(about.blocks[1].images).toEqual([{ assetId: 'keep', url: 'https://cdn/keep.jpg' }, { assetId: 'other', url: 'https://cdn/other.jpg' }])
    expect(about.blocks[1].imageUrls).toEqual(['https://cdn/keep.jpg', 'https://cdn/other.jpg'])
  })
  it('does not mutate the inputs', () => {
    expect(libraryConfig.assets.dup).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/library/consolidate.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `common/library/consolidate.js`**

```javascript
// common/library/consolidate.js
function uniq(arr) {
  return [...new Set(arr)]
}

function mergeUsage(a = {}, b = {}) {
  const merged = {
    cover: !!(a.cover || b.cover),
    pageIds: uniq([...(a.pageIds || []), ...(b.pageIds || [])]),
    galleryIds: uniq([...(a.galleryIds || []), ...(b.galleryIds || [])]),
    blockIds: uniq([...(a.blockIds || []), ...(b.blockIds || [])]),
    lastUsedAt: a.lastUsedAt || b.lastUsedAt || null,
  }
  merged.usageCount = merged.pageIds.length + merged.galleryIds.length + merged.blockIds.length
  return merged
}

function rewriteImageRef(ref, urlMap, idMap) {
  if (!ref || typeof ref !== 'object') return ref
  const next = { ...ref }
  if (next.url && urlMap.has(next.url)) next.url = urlMap.get(next.url)
  if (next.assetId && idMap.has(next.assetId)) next.assetId = idMap.get(next.assetId)
  return next
}
function refKey(ref) {
  return ref && typeof ref === 'object' ? ref.url || '' : ref
}

export function consolidate(libraryConfig, siteConfig, decisions) {
  const urlMap = new Map() // redundant publicUrl -> canonical publicUrl
  const idMap = new Map()  // redundant assetId   -> canonical assetId
  const deleteUrls = []
  const redundantIds = new Set()
  const assets = { ...(libraryConfig.assets || {}) }

  // 1. Build maps + union metadata onto the canonical.
  for (const { canonicalId, redundantIds: reds } of decisions || []) {
    const canonical = { ...(assets[canonicalId] || {}) }
    canonical.setIds = [...(canonical.setIds || [])]
    canonical.tags = [...(canonical.tags || [])]
    for (const rid of reds || []) {
      const red = assets[rid]
      if (!red) continue
      redundantIds.add(rid)
      idMap.set(rid, canonicalId)
      if (red.publicUrl) {
        urlMap.set(red.publicUrl, canonical.publicUrl)
        deleteUrls.push(red.publicUrl)
      }
      canonical.setIds = uniq([...canonical.setIds, ...(red.setIds || [])])
      canonical.tags = uniq([...canonical.tags, ...(red.tags || [])])
      canonical.usage = mergeUsage(canonical.usage, red.usage)
      if (!canonical.caption && red.caption) canonical.caption = red.caption
      if (!canonical.alt && red.alt) canonical.alt = red.alt
    }
    assets[canonicalId] = canonical
  }
  for (const rid of redundantIds) delete assets[rid]

  // 2. assetOrder + assetIdByUrl.
  const assetOrder = uniq((libraryConfig.assetOrder || []).map((id) => idMap.get(id) || id)).filter((id) => assets[id])
  const assetIdByUrl = {}
  for (const [url, id] of Object.entries(libraryConfig.assetIdByUrl || {})) {
    if (urlMap.has(url)) continue // redundant url is going away
    assetIdByUrl[url] = idMap.get(id) || id
  }

  // 3. galleries + portfolios (URL arrays).
  const rewriteUrlArray = (arr) => uniq((arr || []).map((u) => urlMap.get(u) || u))
  const galleries = {}
  for (const [k, v] of Object.entries(libraryConfig.galleries || {})) galleries[k] = rewriteUrlArray(v)
  const portfolios = {}
  for (const [k, v] of Object.entries(libraryConfig.portfolios || {})) portfolios[k] = rewriteUrlArray(v)

  // 4. sets (assetId arrays).
  const sets = {}
  for (const [k, s] of Object.entries(libraryConfig.sets || {})) {
    sets[k] = { ...s, assetIds: uniq((s.assetIds || []).map((id) => idMap.get(id) || id)) }
  }

  const nextLibrary = { ...libraryConfig, assets, assetOrder, assetIdByUrl, galleries, portfolios, sets }

  // 5. site config pages/blocks.
  let siteChanged = false
  const rewriteMulti = (refs) => {
    const seen = new Set()
    const out = []
    for (const r of refs || []) {
      const nr = rewriteImageRef(r, urlMap, idMap)
      const key = refKey(nr)
      if (key && seen.has(key)) continue
      if (key) seen.add(key)
      out.push(nr)
    }
    return out
  }
  const nextSite = siteConfig
    ? {
        ...siteConfig,
        cover: siteConfig.cover ? rewriteImageRef(siteConfig.cover, urlMap, idMap) : siteConfig.cover,
        pages: (siteConfig.pages || []).map((page) => ({
          ...page,
          blocks: (page.blocks || []).map((block) => {
            const b = { ...block }
            if (b.image) b.image = rewriteImageRef(b.image, urlMap, idMap)
            if (typeof b.imageUrl === 'string' && urlMap.has(b.imageUrl)) b.imageUrl = urlMap.get(b.imageUrl)
            if (Array.isArray(b.images)) b.images = rewriteMulti(b.images)
            if (Array.isArray(b.imageUrls)) b.imageUrls = uniq(b.imageUrls.map((u) => urlMap.get(u) || u))
            if (JSON.stringify(b) !== JSON.stringify(block)) siteChanged = true
            return b
          }),
        })),
      }
    : siteConfig

  return { libraryConfig: nextLibrary, siteConfig: nextSite, deleteUrls, siteChanged }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/library/consolidate.test.js`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add common/library/consolidate.js __tests__/library/consolidate.test.js
git commit -m "feat(dedup): pure consolidation transform (library + site config rewrite)"
```

---

### Task 6: `hash-batch` + `delete-files` API routes

**Files:**
- Create: `pages/api/admin/dedup/hash-batch.js`
- Create: `pages/api/admin/dedup/delete-files.js`
- Test: `__tests__/library/hashBatch.route.test.js`, `__tests__/library/deleteFiles.route.test.js`

**Interfaces:**
- `POST /api/admin/dedup/hash-batch` — body `{ items: [{ assetId, url }] }` → `200 { hashed: [{ assetId, hash }], failed: [{ assetId, reason }] }`. Uses `safeFetch`; per-item `try/catch`; batch cap 50; `withAuth`.
- `POST /api/admin/dedup/delete-files` — body `{ urls: [string] }` → `200 { deleted: number, failed: [{ url, reason }] }`. For each URL, delete the original + thumbnail R2 objects. Batch cap 200; `withAuth`.

- [ ] **Step 1: Write the failing tests**

```javascript
// __tests__/library/hashBatch.route.test.js
import { jest } from '@jest/globals'
jest.mock('@/common/withAuth', () => ({ withAuth: (h) => (req, res) => h(req, res, { id: 'u1' }) }))
const mockSafeFetch = jest.fn()
jest.mock('@/common/import/safeFetch', () => ({ safeFetch: (...a) => mockSafeFetch(...a) }))
const handler = (await import('@/pages/api/admin/dedup/hash-batch')).default
const mockRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() })

describe('POST /api/admin/dedup/hash-batch', () => {
  beforeEach(() => mockSafeFetch.mockReset())
  it('hashes each item and isolates failures', async () => {
    mockSafeFetch
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer })
      .mockRejectedValueOnce(new Error('boom'))
    const res = mockRes()
    await handler({ method: 'POST', body: { items: [{ assetId: 'a', url: 'https://x/a.jpg' }, { assetId: 'b', url: 'https://x/b.jpg' }] } }, res)
    expect(res.status).toHaveBeenCalledWith(200)
    const p = res.json.mock.calls[0][0]
    expect(p.hashed).toHaveLength(1)
    expect(p.hashed[0]).toMatchObject({ assetId: 'a' })
    expect(p.hashed[0].hash).toMatch(/^[0-9a-f]{64}$/)
    expect(p.failed).toEqual([{ assetId: 'b', reason: 'boom' }])
  })
  it('400 on oversized batch', async () => {
    const items = Array.from({ length: 51 }, (_, i) => ({ assetId: String(i), url: 'x' }))
    const res = mockRes()
    await handler({ method: 'POST', body: { items } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })
})
```

```javascript
// __tests__/library/deleteFiles.route.test.js
import { jest } from '@jest/globals'
jest.mock('@/common/withAuth', () => ({ withAuth: (h) => (req, res) => h(req, res, { id: 'u1' }) }))
const mockDelete = jest.fn().mockResolvedValue({})
jest.mock('@/common/gcsClient', () => ({ deleteFile: (...a) => mockDelete(...a), PUBLIC_URL: 'https://cdn.test' }))
const handler = (await import('@/pages/api/admin/dedup/delete-files')).default
const mockRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() })

describe('POST /api/admin/dedup/delete-files', () => {
  beforeEach(() => mockDelete.mockClear())
  it('deletes original + thumbnail for each url', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: { urls: ['https://cdn.test/users/u1/photos/import/a.jpg'] } }, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(mockDelete).toHaveBeenCalledWith('users/u1/photos/import/a.jpg')
    expect(mockDelete).toHaveBeenCalledWith('users/u1/thumbnails/import/a.jpg')
    expect(res.json.mock.calls[0][0].deleted).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/library/hashBatch.route.test.js __tests__/library/deleteFiles.route.test.js`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the routes**

```javascript
// pages/api/admin/dedup/hash-batch.js
import crypto from 'crypto'
import { withAuth } from '@/common/withAuth'
import { safeFetch } from '@/common/import/safeFetch'

const MAX_BATCH = 50

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { items } = req.body || {}
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' })
  if (items.length > MAX_BATCH) return res.status(400).json({ error: 'batch too large', message: 'Hash fewer photos at a time.' })

  const hashed = []
  const failed = []
  for (const item of items) {
    try {
      const resp = await safeFetch(item.url)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const buf = Buffer.from(await resp.arrayBuffer())
      hashed.push({ assetId: item.assetId, hash: crypto.createHash('sha256').update(buf).digest('hex') })
    } catch (err) {
      failed.push({ assetId: item.assetId, reason: String(err?.message || err) })
    }
  }
  return res.status(200).json({ hashed, failed })
}
export default withAuth(handler)
```

```javascript
// pages/api/admin/dedup/delete-files.js
import { withAuth } from '@/common/withAuth'
import { deleteFile, PUBLIC_URL } from '@/common/gcsClient'

const MAX_BATCH = 200
const keyFromUrl = (url) => String(url || '').replace(`${PUBLIC_URL}/`, '')
const thumbKey = (key) => key.replace('/photos/', '/thumbnails/').replace(/\.[^.]+$/, '.jpg')

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { urls } = req.body || {}
  if (!Array.isArray(urls)) return res.status(400).json({ error: 'urls array required' })
  if (urls.length > MAX_BATCH) return res.status(400).json({ error: 'batch too large' })

  let deleted = 0
  const failed = []
  for (const url of urls) {
    const key = keyFromUrl(url)
    if (!key || key === url) { failed.push({ url, reason: 'not a managed url' }); continue }
    try {
      await deleteFile(key)
      try { await deleteFile(thumbKey(key)) } catch { /* thumbnail may not exist */ }
      deleted += 1
    } catch (err) {
      failed.push({ url, reason: String(err?.message || err) })
    }
  }
  return res.status(200).json({ deleted, failed })
}
export default withAuth(handler)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/library/hashBatch.route.test.js __tests__/library/deleteFiles.route.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pages/api/admin/dedup/hash-batch.js pages/api/admin/dedup/delete-files.js __tests__/library/hashBatch.route.test.js __tests__/library/deleteFiles.route.test.js
git commit -m "feat(dedup): hash-batch + delete-files API routes"
```

---

### Task 7: Scan client orchestration

**Files:**
- Create: `common/library/dedupClient.js`
- Test: `__tests__/library/dedupClient.test.js`

**Interfaces:**
- Consumes: `assetsMissingHash`, `groupDuplicates` from `@/common/library/dedup`; the two routes; existing `PUT /api/admin/library` and `PUT /api/admin/site-config`; `consolidate` from `@/common/library/consolidate`.
- Produces:
  - `backfillHashes(assets, { onProgress, batchSize? }) -> { hashes: { [assetId]: hash }, failed }` — loops `hash-batch` over `assetsMissingHash(assets)`; `onProgress({ done, total })` per batch.
  - `applyHashes(libraryConfig, hashes) -> libraryConfig` — writes `hashes.exact` into asset records (returns new config).
  - `runConsolidation({ libraryConfig, siteConfig, decisions }) -> summary` — calls `consolidate`, PUTs the library config, PUTs the site config only if `siteChanged`, POSTs `delete-files` with `deleteUrls`, returns `{ mergedCount, groupCount, deletedFiles }`.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/library/dedupClient.test.js
import { backfillHashes, applyHashes } from '@/common/library/dedupClient'

beforeEach(() => { global.fetch = jest.fn() })
afterEach(() => jest.resetAllMocks())
const json = (body) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })

describe('backfillHashes', () => {
  it('hashes only assets missing a hash, in batches, reporting progress', async () => {
    global.fetch
      .mockReturnValueOnce(json({ hashed: [{ assetId: 'c1', hash: 'h1' }], failed: [] }))
      .mockReturnValueOnce(json({ hashed: [{ assetId: 'c2', hash: 'h2' }], failed: [] }))
    const assets = {
      a: { assetId: 'a', publicUrl: 'ua', hashes: { exact: 'X' } },
      c1: { assetId: 'c1', publicUrl: 'u1' },
      c2: { assetId: 'c2', publicUrl: 'u2' },
    }
    const progress = []
    const out = await backfillHashes(assets, { batchSize: 1, onProgress: (p) => progress.push(p) })
    expect(out.hashes).toEqual({ c1: 'h1', c2: 'h2' })
    expect(progress[progress.length - 1]).toEqual({ done: 2, total: 2 })
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })
})
describe('applyHashes', () => {
  it('writes hashes.exact into the matching asset records', () => {
    const cfg = { assets: { c1: { assetId: 'c1', hashes: { exact: null, perceptual: null } } } }
    const next = applyHashes(cfg, { c1: 'h1' })
    expect(next.assets.c1.hashes.exact).toBe('h1')
    expect(cfg.assets.c1.hashes.exact).toBeNull() // input untouched
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/library/dedupClient.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `common/library/dedupClient.js`**

```javascript
// common/library/dedupClient.js
import { assetsMissingHash, groupDuplicates } from '@/common/library/dedup'
import { consolidate } from '@/common/library/consolidate'

function chunk(arr, n) {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

export async function backfillHashes(assets, { onProgress, batchSize = 20 } = {}) {
  const todo = assetsMissingHash(assets)
  const total = todo.length
  const hashes = {}
  const failed = []
  let done = 0
  for (const batch of chunk(todo, batchSize)) {
    const res = await fetch('/api/admin/dedup/hash-batch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: batch }),
    })
    const data = await res.json().catch(() => ({}))
    for (const h of data.hashed || []) hashes[h.assetId] = h.hash
    for (const f of data.failed || []) failed.push(f)
    done += batch.length
    if (onProgress) onProgress({ done, total })
  }
  return { hashes, failed }
}

export function applyHashes(libraryConfig, hashes) {
  const assets = { ...(libraryConfig.assets || {}) }
  for (const [assetId, hash] of Object.entries(hashes || {})) {
    if (!assets[assetId]) continue
    assets[assetId] = { ...assets[assetId], hashes: { ...(assets[assetId].hashes || {}), exact: hash } }
  }
  return { ...libraryConfig, assets }
}

export async function runConsolidation({ libraryConfig, siteConfig, decisions }) {
  const { libraryConfig: nextLib, siteConfig: nextSite, deleteUrls, siteChanged } = consolidate(libraryConfig, siteConfig, decisions)
  await fetch('/api/admin/library', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assets: nextLib.assets, galleries: nextLib.galleries, portfolios: nextLib.portfolios, sets: nextLib.sets, assetOrder: nextLib.assetOrder }),
  })
  if (siteChanged) {
    await fetch('/api/admin/site-config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nextSite),
    })
  }
  if (deleteUrls.length) {
    await fetch('/api/admin/dedup/delete-files', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ urls: deleteUrls }),
    })
  }
  return { mergedCount: deleteUrls.length, groupCount: decisions.length, deletedFiles: deleteUrls.length }
}

export { groupDuplicates }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/library/dedupClient.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/library/dedupClient.js __tests__/library/dedupClient.test.js
git commit -m "feat(dedup): scan client orchestration (backfill + consolidate persist)"
```

---

### Task 8: DuplicateFinder UI + Library entry point

**Files:**
- Create: `components/admin/library/DuplicateFinder.js`
- Modify: `components/admin/AlbumSidebar.js` (a discreet "Find duplicates" action; accept `onFindDuplicates`)
- Modify: `components/admin/AdminLibrary.js` (state + mount + `handleDedupeComplete` refresh)
- Test: `__tests__/components/DuplicateFinder.test.js`

**Interfaces:**
- Consumes: `backfillHashes`, `applyHashes`, `groupDuplicates`, `runConsolidation` from `@/common/library/dedupClient`; `chooseCanonical` from `@/common/library/dedup`; `ImportProgress` from `@/components/admin/import/ImportProgress`.
- Produces: `DuplicateFinder({ libraryData, siteConfig, onClose, onComplete })` — modal that scans (backfill progress), reviews groups (hybrid), and on merge calls `runConsolidation` then `onComplete(summary)`. `AlbumSidebar` gains `onFindDuplicates`; `AdminLibrary` mounts the modal and refreshes on complete.

**Design/behavior contract (frontend-design conventions; reuse the import tokens):**
- **Shell:** same modal chrome as `ImportFlow` (`var(--popover)` / `var(--popover-shadow)` / `rounded-xl`, backdrop `rgba(20,12,4,0.55)` + blur, mono title "Find duplicates", close-X hidden while scanning/merging).
- **Scanning:** `<ImportProgress progress={{ done, total }} />` with a mono line "Checking {total} photos for duplicates…". Skip straight to review when nothing needs hashing.
- **Empty result:** Fraunces line "No duplicates found. Your library is clean." + Done.
- **Review (hybrid):** a prominent primary button "Merge all ({N} groups)"; below, one row per group showing the shared thumbnail (canonical's `publicUrl` via the library thumbnail URL), a mono "{k} copies" count, and a muted "where used" line built from each copy's `usage` (galleryIds/pageIds); a per-group "Skip" toggle and a "keep this one" control that sets the group's canonical. Merge acts only on non-skipped groups.
- **Merging:** progress/spinner while `runConsolidation` runs.
- **Done:** "Merged {mergedCount} duplicates into {groupCount} photos." → primary "Done" calls `onComplete(summary)`.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/components/DuplicateFinder.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DuplicateFinder from '@/components/admin/library/DuplicateFinder'
import * as client from '@/common/library/dedupClient'

jest.mock('@/common/library/dedupClient', () => ({
  __esModule: true,
  backfillHashes: jest.fn(),
  applyHashes: (cfg) => cfg,
  groupDuplicates: jest.fn(),
  runConsolidation: jest.fn(),
}))

const libraryData = {
  assets: {
    keep: { assetId: 'keep', publicUrl: 'https://cdn/keep.jpg', hashes: { exact: 'H' }, usage: { usageCount: 3, galleryIds: ['japan'] }, createdAt: '2026-01-01' },
    dup: { assetId: 'dup', publicUrl: 'https://cdn/dup.jpg', hashes: { exact: 'H' }, usage: { usageCount: 0, galleryIds: ['best'] }, createdAt: '2026-01-02' },
  },
}

describe('DuplicateFinder', () => {
  afterEach(() => jest.resetAllMocks())
  it('scans, shows the duplicate group, and merges', async () => {
    client.backfillHashes.mockResolvedValue({ hashes: {}, failed: [] })
    client.groupDuplicates.mockReturnValue([{ hash: 'H', assetIds: ['keep', 'dup'] }])
    client.runConsolidation.mockResolvedValue({ mergedCount: 1, groupCount: 1, deletedFiles: 1 })
    render(<DuplicateFinder libraryData={libraryData} siteConfig={{ pages: [] }} onClose={() => {}} onComplete={jest.fn()} />)
    expect(await screen.findByText(/merge all/i)).toBeInTheDocument()
    expect(screen.getByText(/2 copies/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /merge all/i }))
    await waitFor(() => expect(client.runConsolidation).toHaveBeenCalled())
    const arg = client.runConsolidation.mock.calls[0][0]
    expect(arg.decisions).toEqual([{ canonicalId: 'keep', redundantIds: ['dup'] }])
    expect(await screen.findByText(/done/i)).toBeInTheDocument()
  })
  it('shows a clean-library message when there are no duplicates', async () => {
    client.backfillHashes.mockResolvedValue({ hashes: {}, failed: [] })
    client.groupDuplicates.mockReturnValue([])
    render(<DuplicateFinder libraryData={libraryData} siteConfig={{ pages: [] }} onClose={() => {}} onComplete={jest.fn()} />)
    expect(await screen.findByText(/no duplicates found/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/DuplicateFinder.test.js`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement `DuplicateFinder.js`**

Build the modal to the design contract, satisfying the tests. On mount: run `backfillHashes(libraryData.assets, { onProgress })`; if any hashes came back, `applyHashes` locally so grouping sees them; compute `groups = groupDuplicates(mergedAssets)`; for each group compute the default canonical via `chooseCanonical`. Render scanning → review → done. The "Merge all" button builds `decisions` = non-skipped groups mapped to `{ canonicalId, redundantIds: assetIds.filter(id => id !== canonicalId) }` and calls `runConsolidation({ libraryConfig: {assets, galleries, portfolios, sets, assetOrder}, siteConfig, decisions })`, then shows Done and (on "Done") `onComplete(summary)`. Use the import tokens (mono labels, `#8b6f47`, primary button `#2c2416`/`#f5ecd6`) and `ImportProgress`. Copy warm, no AI-tell.

Key requirements the tests assert: a "Merge all …" button, a "{k} copies" label per group, `runConsolidation` receives `decisions: [{ canonicalId: 'keep', redundantIds: ['dup'] }]`, a "Done" affordance appears after merge, and a "No duplicates found" message when groups is empty.

- [ ] **Step 4: Wire the entry point**

In `components/admin/AlbumSidebar.js`, add `onFindDuplicates` to the destructured props and render a discreet action (a small mono "Find duplicates" text button in the sidebar footer/maintenance area, styled like the muted controls — not a prominent filled button). In `components/admin/AdminLibrary.js`: add `const [dedupeOpen, setDedupeOpen] = useState(false)`; pass `onFindDuplicates={() => setDedupeOpen(true)}` to `AlbumSidebar`; mount `{dedupeOpen && <DuplicateFinder libraryData={libraryData} siteConfig={siteConfig} onClose={() => setDedupeOpen(false)} onComplete={async () => { setDedupeOpen(false); await fetchLibrary() }} />}` near the other modals. (`siteConfig` is already a prop of AdminLibrary.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest __tests__/components/DuplicateFinder.test.js`
Expected: PASS (both).

- [ ] **Step 6: Verify (suite + in-browser)**

Run: `npx jest` → only the 3 pre-existing upstream failures; no new failures.
In-browser (http://localhost:3000, signed in): open the Library, trigger "Find duplicates", confirm the scan runs, a group appears if duplicates exist (or the clean message), and merging removes the redundant copy while the canonical keeps its gallery placements. Screenshot for the report.

- [ ] **Step 7: Commit**

```bash
git add components/admin/library/DuplicateFinder.js components/admin/AlbumSidebar.js components/admin/AdminLibrary.js __tests__/components/DuplicateFinder.test.js
git commit -m "feat(dedup): DuplicateFinder UI + Library entry point"
```

---

## Self-Review

**Spec coverage (against `2026-07-09-library-duplicate-finder-design.md`):**
- §5.1 store-time hashing → Tasks 1–3 (storeImageBuffer hash; persisted on import + upload). ✅
- §5.2 scan = backfill (batched `hash-batch`) + group → Task 6 (route) + Task 7 (`backfillHashes`) + Task 4 (`groupDuplicates`). ✅
- §5.3 / §6 consolidation (canonical, rewrite galleries/portfolios/sets/pages/blocks, union metadata, delete files) → Task 4 (`chooseCanonical`) + Task 5 (`consolidate`) + Task 6 (`delete-files`) + Task 7 (`runConsolidation`). ✅
- §6 file deletion required → Task 6 delete-files + Global Constraints. ✅
- §7 UI (entry, scan, hybrid review, done) → Task 8. ✅
- §8 API routes → Task 6. ✅
- §10 testing incl. never-lose-usage invariant → Task 5's usage-union + reference-rewrite tests (usage.pageIds covers both A and B). ✅
- §3 perceptual OUT → not implemented; `hashes.perceptual` left null everywhere. ✅

**Placeholder scan:** logic tasks (1–7) carry complete code. Task 8 (design-heavy UI) carries a full behavioral contract + the exact tested assertions + the reused tokens; acceptable per the frontend-design carve-out. No "TBD"/"add error handling"-style gaps.

**Type consistency:** `storeImageBuffer` return `hash` (Task 1) consumed by fetch-batch (Task 2) and upload (Task 3). `decisions: [{ canonicalId, redundantIds }]` identical in `consolidate` (Task 5), `runConsolidation` (Task 7), and DuplicateFinder (Task 8). `groupDuplicates -> [{ hash, assetIds }]` consistent (Tasks 4, 7, 8). `hash-batch` I/O (`items`/`hashed`/`failed`) consistent between route (Task 6) and `backfillHashes` (Task 7). `delete-files` `{ urls }` consistent (Task 6, 7). Thumbnail-key rule identical in storeImage (Task 1) and delete-files (Task 6).

**Deferred (not gaps):** perceptual detection; general orphaned-file GC.
