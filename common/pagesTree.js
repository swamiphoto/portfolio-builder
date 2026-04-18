// Pure helpers for the unified-page nav structure.
// `pages` is the flat array stored on siteConfig; the tree is derived.

export function buildNavTree(pages) {
  const nav = pages.filter(p => p.showInNav)
  const navIds = new Set(nav.map(p => p.id))
  const byParent = new Map()
  for (const p of nav) {
    const key = p.parentId && navIds.has(p.parentId) ? p.parentId : null
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key).push(p)
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  }
  function build(parentId) {
    return (byParent.get(parentId) || []).map(p => ({
      ...p,
      children: build(p.id),
    }))
  }
  return build(null)
}

export function flattenForOtherPages(pages) {
  return pages
    .filter(p => !p.showInNav)
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

export function movePage(pages, pageId, patch) {
  const next = pages.map(p => {
    if (p.id !== pageId) return p
    const merged = { ...p, ...patch }
    if (patch.showInNav === false) merged.parentId = null
    return merged
  })

  // If a parent left the nav, orphan its children's parentId.
  if (patch.showInNav === false) {
    return next.map(p => (p.parentId === pageId ? { ...p, parentId: null } : p))
  }
  return next
}
