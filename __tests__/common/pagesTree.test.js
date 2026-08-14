import { buildNavTree, buildHiddenTree, flattenForOtherPages, movePage } from '../../common/pagesTree'

const pages = [
  { id: 'home',  title: 'Home',    parentId: null, showInNav: true,  sortOrder: 0 },
  { id: 'port',  title: 'Portfolio', parentId: null, showInNav: true, sortOrder: 1 },
  { id: 'land',  title: 'Landscapes', parentId: 'port', showInNav: true, sortOrder: 0 },
  { id: 'port2', title: 'Portraits', parentId: 'port', showInNav: true, sortOrder: 1 },
  { id: 'about', title: 'About',   parentId: null, showInNav: true, sortOrder: 2 },
  { id: 'bts',   title: 'Behind',  parentId: null, showInNav: false, sortOrder: 0 },
]

describe('hidden section nesting', () => {
  const withHidden = [
    { id: 'h1', title: 'Draft A', parentId: null, showInNav: false, sortOrder: 0 },
    { id: 'h2', title: 'Draft B', parentId: null, showInNav: false, sortOrder: 1 },
    ...pages,
  ]

  it('buildHiddenTree nests hidden pages under a hidden parent', () => {
    const nested = movePage(withHidden, 'h2', { showInNav: false, parentId: 'h1', position: 'end' })
    expect(nested.find(p => p.id === 'h2').parentId).toBe('h1') // parentId is kept, not nulled
    const tree = buildHiddenTree(nested)
    const h1 = tree.find(n => n.id === 'h1')
    expect(h1.children.map(c => c.id)).toEqual(['h2'])
    // the visible nav tree is unaffected
    expect(buildNavTree(nested).map(n => n.id)).toEqual(['home', 'port', 'about'])
  })

  it('reordering within Hidden keeps nested children (no orphaning)', () => {
    const nested = movePage(withHidden, 'h2', { showInNav: false, parentId: 'h1', position: 'end' })
    // move h1 (already hidden, has child h2) — h2 stays its child
    const reordered = movePage(nested, 'h1', { showInNav: false, position: 'end' })
    expect(reordered.find(p => p.id === 'h2').parentId).toBe('h1')
  })
})

describe('buildNavTree', () => {
  it('returns roots in sortOrder with nested children', () => {
    const tree = buildNavTree(pages)
    expect(tree.map(n => n.id)).toEqual(['home', 'port', 'about'])
    expect(tree[1].children.map(n => n.id)).toEqual(['land', 'port2'])
  })

  it('keeps children by default even when hideChildrenInNav is set (editor view)', () => {
    const withFlag = pages.map(p => p.id === 'port' ? { ...p, hideChildrenInNav: true } : p)
    const tree = buildNavTree(withFlag)
    expect(tree[1].children.map(n => n.id)).toEqual(['land', 'port2'])
  })

  it('prunes children of a hideChildrenInNav page when respectHideChildren', () => {
    const withFlag = pages.map(p => p.id === 'port' ? { ...p, hideChildrenInNav: true } : p)
    const tree = buildNavTree(withFlag, { respectHideChildren: true })
    const port = tree.find(n => n.id === 'port')
    expect(port.children).toEqual([])
    // the page itself still appears in the nav
    expect(tree.map(n => n.id)).toEqual(['home', 'port', 'about'])
  })

  it('skips pages with showInNav=false', () => {
    const tree = buildNavTree(pages)
    expect(tree.find(n => n.id === 'bts')).toBeUndefined()
  })

  it('treats orphans (parentId not in nav) as roots', () => {
    const orphan = [...pages, { id: 'x', title: 'Orphan', parentId: 'missing', showInNav: true, sortOrder: 99 }]
    const tree = buildNavTree(orphan)
    expect(tree.map(n => n.id)).toContain('x')
  })
})

describe('flattenForOtherPages', () => {
  it('returns showInNav=false pages as a flat list', () => {
    const list = flattenForOtherPages(pages)
    expect(list.map(p => p.id)).toEqual(['bts'])
  })
})

describe('movePage', () => {
  it('promotes a page out of nav and clears parentId', () => {
    const result = movePage(pages, 'land', { showInNav: false })
    const land = result.find(p => p.id === 'land')
    expect(land.showInNav).toBe(false)
    expect(land.parentId).toBeNull()
  })

  it('reparents a page within nav', () => {
    const result = movePage(pages, 'port2', { parentId: 'about' })
    expect(result.find(p => p.id === 'port2').parentId).toBe('about')
  })

  it('sets sortOrder when provided', () => {
    const result = movePage(pages, 'about', { sortOrder: 0 })
    expect(result.find(p => p.id === 'about').sortOrder).toBe(0)
  })

  it('does not force children to follow parent out of nav', () => {
    const result = movePage(pages, 'port', { showInNav: false })
    expect(result.find(p => p.id === 'land').showInNav).toBe(true)
    expect(result.find(p => p.id === 'land').parentId).toBeNull() // parent gone from nav, child orphaned
  })
})
