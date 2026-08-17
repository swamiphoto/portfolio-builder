import { defaultPage } from '@/common/siteConfig'
import { defaultBlock } from '@/common/blocks'
import { stableHash } from './importCore'

const MASONRY_RUN = 10
const STACKED_RUN = 6
const MIN_TAIL = 4

function photosBlock(assets, layout) {
  return {
    ...defaultBlock(layout === 'masonry' ? 'masonry' : 'stacked'),
    images: assets.map((a) => ({ url: a.publicUrl, assetId: a.assetId })),
    imageUrls: assets.map((a) => a.publicUrl),
    layout,
  }
}

function takeSolo(assets) {
  const i = assets.findIndex((a) => a.orientation === 'landscape')
  return assets.splice(i === -1 ? 0 : i, 1)[0]
}

// Opener + alternating masonry / solo / stacked runs. Deterministic: same
// assets in, same blocks out.
export function composeGalleryBlocks(assets) {
  if (!assets.length) return []
  if (assets.length < 8) return [photosBlock(assets, 'masonry')]

  const rest = [...assets]
  let openerIdx = -1
  let best = -1
  rest.forEach((a, i) => {
    const px = (a.width || 0) * (a.height || 0)
    if (a.orientation === 'landscape' && px > best) { best = px; openerIdx = i }
  })
  const opener = rest.splice(openerIdx === -1 ? 0 : openerIdx, 1)[0]
  const blocks = [{ ...defaultBlock('photo'), imageUrl: opener.publicUrl }]

  const runs = [
    () => rest.length && blocks.push(photosBlock(rest.splice(0, MASONRY_RUN), 'masonry')),
    () => rest.length && blocks.push({ ...defaultBlock('photo'), imageUrl: takeSolo(rest).publicUrl }),
    () => rest.length && blocks.push(photosBlock(rest.splice(0, STACKED_RUN), 'stacked')),
  ]
  let i = 0
  while (rest.length) {
    if (rest.length < MIN_TAIL) {
      // Tail too small for its own block — fold into the last photos block,
      // or emit as one small masonry if none exists yet.
      const lastPhotos = [...blocks].reverse().find((b) => b.type === 'photos')
      if (lastPhotos) {
        lastPhotos.images.push(...rest.map((a) => ({ url: a.publicUrl, assetId: a.assetId })))
        lastPhotos.imageUrls.push(...rest.map((a) => a.publicUrl))
        rest.length = 0
      } else {
        blocks.push(photosBlock(rest.splice(0), 'masonry'))
      }
      break
    }
    runs[i % runs.length]()
    i += 1
  }
  return blocks
}

// Merges freshly imported assets with assets that fetch-batch dedupe-skipped
// (already present in the library, so the import step never returned them as
// `imported`). Each skipped url is resolved against the library's assets map
// by matching `source.sourceUrl`; urls with no match are dropped. Guards
// against double-counting an asset that ends up in both lists.
export function resolveComposableAssets({ imported, skipped, libraryAssets }) {
  const result = [...(imported || [])]
  const seen = new Set(result.map((a) => a?.assetId).filter(Boolean))
  const bySourceUrl = new Map(
    Object.values(libraryAssets || {}).map((a) => [a?.source?.sourceUrl, a]).filter(([url]) => url)
  )
  for (const url of skipped || []) {
    const asset = bySourceUrl.get(url)
    if (!asset || seen.has(asset.assetId)) continue
    seen.add(asset.assetId)
    result.push(asset)
  }
  return result
}

function assetsForCollection(collection, assetBySourceUrl) {
  if (!collection) return []
  return (collection.assetRefs || [])
    .map((r) => assetBySourceUrl.get(r.remoteUrl))
    .filter(Boolean)
}

function uniqueSlug(base, taken) {
  let slug = base || 'page'
  let n = 2
  while (taken.has(slug)) { slug = `${base}-${n}`; n += 1 }
  taken.add(slug)
  return slug
}

// First paragraph of source prose, trimmed and capped — used as the page's
// description. Plain text only (no markdown), internal whitespace/newlines
// collapsed to single spaces.
function firstParagraphDescription(text) {
  if (!text) return ''
  const [first] = String(text).split(/\n\s*\n/)
  const collapsed = (first || '').replace(/\s+/g, ' ').trim()
  return collapsed.slice(0, 300)
}

// Ordering rule: galleries first (by navOrder, nulls last, stable), then
// about, then contact last — regardless of source nav position.
const KIND_RANK = { gallery: 0, about: 1, contact: 2 }

function orderPages(mapPages) {
  return mapPages
    .map((page, index) => ({ page, index }))
    .sort((a, b) => {
      const ra = KIND_RANK[a.page.kind] ?? 3
      const rb = KIND_RANK[b.page.kind] ?? 3
      if (ra !== rb) return ra - rb
      if (ra === 0) {
        const an = a.page.navOrder ?? Infinity
        const bn = b.page.navOrder ?? Infinity
        if (an !== bn) return an - bn
      }
      return a.index - b.index
    })
    .map((x) => x.page)
}

export function composeSite({ siteMap, collections, imported, importBatchId, existingPages }) {
  const mapPages = siteMap?.pages?.filter((p) => p.kind !== 'other') || []
  if (!mapPages.length) return { pages: [] }

  const assetBySourceUrl = new Map((imported || []).map((a) => [a.source?.sourceUrl, a]))
  const collectionById = new Map((collections || []).map((c) => [c.id, c]))
  const taken = new Set((existingPages || []).map((p) => p.slug).filter(Boolean))

  const ordered = orderPages(mapPages)

  const pages = []
  ordered.forEach((page) => {
    const assets = assetsForCollection(collectionById.get(page.collectionId), assetBySourceUrl)
    const videoUrls = page.videoUrls || []
    let blocks
    let description = ''
    if (page.kind === 'gallery') {
      if (!assets.length) return // an empty gallery page helps no one
      blocks = composeGalleryBlocks(assets)
      for (const url of videoUrls) blocks.push({ ...defaultBlock('video'), url })
      description = firstParagraphDescription(page.textContent)
    } else if (page.kind === 'about') {
      blocks = [{ ...defaultBlock('text'), variant: 1, content: page.title }]
      const remaining = [...assets]
      const portraitIdx = remaining.findIndex((a) => a.orientation === 'portrait')
      if (portraitIdx !== -1) {
        const [portrait] = remaining.splice(portraitIdx, 1)
        blocks.push({ ...defaultBlock('photo'), imageUrl: portrait.publicUrl })
      }
      blocks.push({ ...defaultBlock('text'), variant: 3, format: 'markdown', content: page.textContent || '' })
      if (remaining.length === 1) {
        blocks.push({ ...defaultBlock('photo'), imageUrl: remaining[0].publicUrl })
      } else if (remaining.length >= 2) {
        blocks.push(photosBlock(remaining, 'masonry'))
      }
      for (const url of videoUrls) blocks.push({ ...defaultBlock('video'), url })
    } else {
      blocks = [defaultBlock('contact')]
    }
    const slug = uniqueSlug(page.slug, taken)
    pages.push(
      defaultPage({
        id: `pg-${stableHash(`${importBatchId}:${slug}`)}`,
        title: page.title,
        template: page.kind === 'gallery' ? 'gallery' : page.kind,
        slug,
        showInNav: true,
        sortOrder: (existingPages?.length || 0) + pages.length,
        blocks,
        description,
        source: { importBatchId: importBatchId || null, sourceUrl: page.sourceUrl || null },
      })
    )
  })
  return { pages }
}

export function applyComposedPages(siteConfig, composedPages) {
  const existing = new Set((siteConfig.pages || []).map((p) => p.id))
  const fresh = (composedPages || []).filter((p) => !existing.has(p.id))
  return { ...siteConfig, pages: [...(siteConfig.pages || []), ...fresh] }
}
