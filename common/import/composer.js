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

export function composeSite({ siteMap, collections, imported, importBatchId, existingPages }) {
  const mapPages = siteMap?.pages?.filter((p) => p.kind !== 'other') || []
  if (!mapPages.length) return { pages: [] }

  const assetBySourceUrl = new Map((imported || []).map((a) => [a.source?.sourceUrl, a]))
  const collectionById = new Map((collections || []).map((c) => [c.id, c]))
  const taken = new Set((existingPages || []).map((p) => p.slug).filter(Boolean))

  const ordered = [...mapPages].sort((a, b) => {
    const an = a.navOrder ?? Infinity
    const bn = b.navOrder ?? Infinity
    return an - bn
  })

  const pages = []
  ordered.forEach((page) => {
    const assets = assetsForCollection(collectionById.get(page.collectionId), assetBySourceUrl)
    let blocks
    if (page.kind === 'gallery') {
      if (!assets.length) return // an empty gallery page helps no one
      blocks = composeGalleryBlocks(assets)
    } else if (page.kind === 'about') {
      blocks = [{ ...defaultBlock('text'), variant: 1, content: page.title }]
      const portrait = assets.find((a) => a.orientation === 'portrait')
      if (portrait) blocks.push({ ...defaultBlock('photo'), imageUrl: portrait.publicUrl })
      blocks.push({ ...defaultBlock('text'), variant: 3, format: 'markdown', content: page.textContent || '' })
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
        source: { importBatchId: importBatchId || null, sourceUrl: page.sourceUrl || null },
      })
    )
  })
  return { pages }
}
