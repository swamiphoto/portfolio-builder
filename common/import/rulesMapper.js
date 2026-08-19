// Deterministic outline -> block plan. Images are referenced by `ref`; asset
// binding happens downstream. Groups consecutive bare images into a photos
// block; a single image + a short trailing paragraph becomes a side caption.
const MAX_PER_PHOTOS = 9

function flushImages(refs, out) {
  if (!refs.length) return
  if (refs.length === 1) { out.push({ type: 'photo', ref: refs[0], caption: '' }); refs.length = 0; return }
  for (let i = 0; i < refs.length; i += MAX_PER_PHOTOS) {
    const chunk = refs.slice(i, i + MAX_PER_PHOTOS)
    // A size-1 chunk (e.g. the 10th of 10 images) must be a photo block, not a
    // 1-image photos block, to stay consistent with the lone-image path above.
    if (chunk.length === 1) { out.push({ type: 'photo', ref: chunk[0], caption: '' }) }
    else { out.push({ type: 'photos', refs: chunk, layout: 'stacked' }) }
  }
  refs.length = 0
}

export function mapOutlineToBlocks(outline) {
  const nodes = outline || []
  const out = []
  const pending = [] // buffered consecutive bare images
  let recognized = 0

  for (let i = 0; i < nodes.length; i += 1) {
    const n = nodes[i]
    if (n.kind === 'image') {
      const next = nodes[i + 1]
      // image + short standalone caption paragraph => side caption
      if (!n.caption && next && next.kind === 'paragraph' && next.text.length <= 160 &&
          (!nodes[i + 2] || nodes[i + 2].kind !== 'paragraph')) {
        flushImages(pending, out)
        out.push({ type: 'photo', ref: n.ref, variant: 3, caption: next.text })
        recognized += 1
        i += 1
        continue
      }
      if (n.caption) { flushImages(pending, out); out.push({ type: 'photo', ref: n.ref, caption: n.caption }); recognized += 1; continue }
      pending.push(n.ref)
      continue
    }
    flushImages(pending, out)
    if (n.kind === 'heading') { out.push({ type: 'text', variant: 1, content: n.text }); recognized += 1 }
    else if (n.kind === 'paragraph') {
      const parts = [n.text]
      while (nodes[i + 1] && nodes[i + 1].kind === 'paragraph') { parts.push(nodes[i + 1].text); i += 1 }
      out.push({ type: 'text', variant: 3, format: 'markdown', content: parts.join('\n\n') })
      recognized += 1
    } else if (n.kind === 'quote') { out.push({ type: 'testimonial', text: n.text, name: n.attribution || '', ref: null }); recognized += 1 }
    else if (n.kind === 'linkcards') { out.push({ type: 'page-gallery', source: 'manual', pageIds: [], pageRefs: n.items.map((it) => it.href) }); recognized += 1 }
    else if (n.kind === 'video') { out.push({ type: 'video', url: n.url }); recognized += 1 }
  }
  flushImages(pending, out)

  // Binary invariant: confident (>= 0.5) whenever ANY non-image structure was
  // recognized, unconfident (< 0.5) for an images-only outline. `recognized`
  // already counts captioned photos, side captions, headings, essays, quotes,
  // linkcards, and videos — exactly the structure worth keeping. A fractional
  // formula diluted below 0.5 on realistic pages (many bare images + a little
  // structure), causing a later stage to discard the mapping.
  const confidence = nodes.length === 0 ? 0 : (recognized > 0 ? 1 : 0)
  return { blocks: out, confidence }
}
