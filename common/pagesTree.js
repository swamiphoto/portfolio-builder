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

// Returns true if `maybeAncestorId` is `pageId` or any ancestor of pageId in the nav tree.
export function isDescendantOf(pages, pageId, maybeAncestorId) {
  if (pageId === maybeAncestorId) return true
  const byId = new Map(pages.map(p => [p.id, p]))
  let cur = byId.get(pageId)
  while (cur && cur.parentId) {
    if (cur.parentId === maybeAncestorId) return true
    cur = byId.get(cur.parentId)
  }
  return false
}

// Move a page. Patch shape:
//   { showInNav, parentId, sortOrder }                  — direct field set (legacy)
//   { showInNav, parentId, beforeId | afterId }         — insert relative to a sibling, renumber
//   { showInNav, parentId, position: 'end' | 'start' }  — append/prepend, renumber
export function movePage(pages, pageId, patch) {
  // 1. Apply field updates to the moving page
  const draft = pages.map(p => {
    if (p.id !== pageId) return p
    const merged = { ...p }
    if ('showInNav' in patch) merged.showInNav = patch.showInNav
    if ('parentId' in patch) merged.parentId = patch.parentId
    if (merged.showInNav === false) merged.parentId = null
    if ('sortOrder' in patch) merged.sortOrder = patch.sortOrder
    return merged
  })

  // 2. If leaving nav, orphan children
  let next = draft
  if (patch.showInNav === false) {
    next = next.map(p => (p.parentId === pageId ? { ...p, parentId: null } : p))
  }

  // 3. If insertion-relative, renumber siblings
  if ('beforeId' in patch || 'afterId' in patch || 'position' in patch) {
    const moving = next.find(p => p.id === pageId)
    if (!moving) return next

    const inNav = moving.showInNav !== false
    const parentId = moving.parentId ?? null

    const siblings = next
      .filter(p => p.id !== pageId && (p.showInNav !== false) === inNav && (p.parentId ?? null) === parentId)
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

    let insertIdx = siblings.length
    if ('beforeId' in patch && patch.beforeId) {
      const i = siblings.findIndex(p => p.id === patch.beforeId)
      if (i !== -1) insertIdx = i
    } else if ('afterId' in patch && patch.afterId) {
      const i = siblings.findIndex(p => p.id === patch.afterId)
      if (i !== -1) insertIdx = i + 1
    } else if (patch.position === 'start') {
      insertIdx = 0
    }

    const ordered = [...siblings.slice(0, insertIdx), moving, ...siblings.slice(insertIdx)]
    const orderById = new Map(ordered.map((p, i) => [p.id, i]))

    next = next.map(p => orderById.has(p.id) ? { ...p, sortOrder: orderById.get(p.id) } : p)
  }

  return next
}
