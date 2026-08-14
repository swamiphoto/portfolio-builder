// Pure helpers for the unified-page nav structure.
// `pages` is the flat array stored on siteConfig; the tree is derived.

// Build a parentId hierarchy from the pages that pass `inSection`. A parentId that
// points outside the section is treated as a root (so cross-section references
// never break the tree).
function buildTree(pages, inSection) {
  const items = pages.filter(inSection)
  const ids = new Set(items.map(p => p.id))
  const byParent = new Map()
  for (const p of items) {
    const key = p.parentId && ids.has(p.parentId) ? p.parentId : null
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key).push(p)
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  }
  function build(parentId) {
    return (byParent.get(parentId) || []).map(p => ({ ...p, children: build(p.id) }))
  }
  return build(null)
}

// `respectHideChildren` prunes the children of any page carrying the
// `hideChildrenInNav` flag — used by the PUBLISHED nav so a page can list its
// own galleries elsewhere (e.g. a page-links block) while keeping them out of
// the sub-nav. The editor omits the flag so the tree stays fully editable.
export function buildNavTree(pages, { respectHideChildren = false } = {}) {
  const tree = buildTree(pages, p => p.showInNav)
  if (!respectHideChildren) return tree
  const prune = (nodes) => nodes.map(n => (
    n.hideChildrenInNav ? { ...n, children: [] } : { ...n, children: prune(n.children) }
  ))
  return prune(tree)
}

// The Hidden section is also a nestable tree (pages can be nested under a hidden parent).
export function buildHiddenTree(pages) {
  return buildTree(pages, p => !p.showInNav)
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
  // Was the page hidden before this move? (Used to distinguish a visible→hidden
  // transition from a move within the Hidden section.)
  const wasHidden = !pages.find(p => p.id === pageId)?.showInNav

  // 1. Apply field updates to the moving page
  const draft = pages.map(p => {
    if (p.id !== pageId) return p
    const merged = { ...p }
    if ('showInNav' in patch) merged.showInNav = patch.showInNav
    if ('parentId' in patch) merged.parentId = patch.parentId
    // A hidden page with no explicit parent goes to the Hidden root; but nesting
    // under a hidden parent (parentId provided) is allowed.
    if (merged.showInNav === false && !('parentId' in patch)) merged.parentId = null
    if ('sortOrder' in patch) merged.sortOrder = patch.sortOrder
    return merged
  })

  // 2. When a page TRANSITIONS from visible → hidden, orphan its children (they stay
  //    in the nav). Moves within Hidden keep their nested children.
  let next = draft
  if (patch.showInNav === false && !wasHidden) {
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
