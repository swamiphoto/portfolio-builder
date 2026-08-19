// Deterministic outline -> block plan. Images are referenced by `ref`; asset
// binding happens downstream. Consecutive images are grouped into stacked
// photos blocks (capped at 9, with single photos sprinkled in for variety); a
// lone caption paragraph immediately following an image attaches onto that
// image's `caption` instead of becoming its own text block.
const MAX_PER_PHOTOS = 9

// Markdown syntax probe — a link, emphasis, a heading/list/blockquote line.
// Plain prose (the common case) should NOT get `format: 'markdown'`.
function hasMarkdownSyntax(text) {
  const s = String(text || '')
  if (/\[[^\]]+\]\([^)]+\)/.test(s)) return true // [label](url)
  if (/\*\*[^\s*][\s\S]*?\*\*/.test(s)) return true // **bold**
  if (/__[^\s_][\s\S]*?__/.test(s)) return true // __bold__
  if (/(^|[^*\w])\*[^\s*][^*]*\*(?!\w)/.test(s)) return true // *emphasis*
  if (/(^|[^_\w])_[^\s_][^_]*_(?!\w)/.test(s)) return true // _emphasis_
  return s.split('\n').some((line) => {
    const t = line.trimStart()
    return /^#{1,6}\s/.test(t) || /^[-*]\s/.test(t) || /^\d+\.\s/.test(t) || /^>/.test(t)
  })
}

// A lone paragraph directly after an (empty-caption) image, not itself
// followed by another paragraph, is that image's caption — many sites render
// captions as a plain <p> rather than a <figcaption>. A run of 2+ paragraphs
// after an image is prose, not a caption, and is left alone.
function attachCaptionsToImages(nodes) {
  const out = []
  for (let i = 0; i < nodes.length; i += 1) {
    const n = nodes[i]
    if (n.kind === 'image' && !n.caption) {
      const next = nodes[i + 1]
      const afterNext = nodes[i + 2]
      if (next && next.kind === 'paragraph' && (!afterNext || afterNext.kind !== 'paragraph')) {
        out.push({ ...n, caption: next.text })
        i += 1 // drop the paragraph node
        continue
      }
    }
    out.push(n)
  }
  return out
}

// Emits a run of consecutive images (`{ref, caption}`) with a cap-9 +
// sprinkle-singles rhythm: stacked chunks of up to 9, and a single `photo`
// block between chunks (for variety) whenever a FULL 9-image chunk leaves 2+
// images still queued. Returns whether the run carried any caption, so the
// caller can count it toward `recognized`.
function emitPhotoRun(run, out) {
  if (!run.length) return false
  const hadCaption = run.some((r) => r.caption)
  if (run.length === 1) {
    out.push({ type: 'photo', ref: run[0].ref, caption: run[0].caption || '' })
    return hadCaption
  }
  let i = 0
  while (i < run.length) {
    const chunk = run.slice(i, i + MAX_PER_PHOTOS)
    i += chunk.length
    if (chunk.length === 1) {
      out.push({ type: 'photo', ref: chunk[0].ref, caption: chunk[0].caption || '' })
    } else {
      out.push({
        type: 'photos',
        layout: 'stacked',
        refs: chunk.map((c) => c.ref),
        captions: chunk.map((c) => c.caption || ''),
      })
    }
    if (chunk.length === MAX_PER_PHOTOS && run.length - i >= 2) {
      out.push({ type: 'photo', ref: run[i].ref, caption: run[i].caption || '' })
      i += 1
    }
  }
  return hadCaption
}

export function mapOutlineToBlocks(outline) {
  const nodes = attachCaptionsToImages(outline || [])
  const out = []
  let pending = [] // buffered consecutive images: {ref, caption}
  let recognized = 0

  const flush = () => {
    if (!pending.length) return
    if (emitPhotoRun(pending, out)) recognized += 1
    pending = []
  }

  for (let i = 0; i < nodes.length; i += 1) {
    const n = nodes[i]
    if (n.kind === 'image') {
      pending.push({ ref: n.ref, caption: n.caption || '' })
      continue
    }
    flush()
    if (n.kind === 'heading') { out.push({ type: 'text', variant: 1, content: n.text }); recognized += 1 }
    else if (n.kind === 'paragraph') {
      const parts = [n.text]
      while (nodes[i + 1] && nodes[i + 1].kind === 'paragraph') { parts.push(nodes[i + 1].text); i += 1 }
      const content = parts.join('\n\n')
      const block = { type: 'text', variant: 3, content }
      if (hasMarkdownSyntax(content)) block.format = 'markdown'
      out.push(block)
      recognized += 1
    } else if (n.kind === 'quote') { out.push({ type: 'testimonial', text: n.text, name: n.attribution || '', ref: null }); recognized += 1 }
    else if (n.kind === 'linkcards') { out.push({ type: 'page-gallery', source: 'manual', pageIds: [], pageRefs: n.items.map((it) => it.href) }); recognized += 1 }
    // Reserved: extractPageOutline emits no `video` nodes today (videos are
    // threaded separately via page.videoUrls), so this branch is currently
    // unreachable. Kept for when/if the outline starts emitting them.
    else if (n.kind === 'video') { out.push({ type: 'video', url: n.url }); recognized += 1 }
  }
  flush()

  // Binary invariant: confident (>= 0.5) whenever ANY caption or non-image
  // structure was recognized, unconfident (< 0.5) for a pure images-only
  // outline. A fractional formula diluted below 0.5 on realistic pages (many
  // bare images + a little structure), causing a later stage to discard the
  // mapping.
  const confidence = nodes.length === 0 ? 0 : (recognized > 0 ? 1 : 0)
  return { blocks: out, confidence }
}
