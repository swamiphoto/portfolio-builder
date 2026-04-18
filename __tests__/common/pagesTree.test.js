import { buildNavTree, flattenForOtherPages, movePage } from '../../common/pagesTree'

const pages = [
  { id: 'home',  title: 'Home',    parentId: null, showInNav: true,  sortOrder: 0 },
  { id: 'port',  title: 'Portfolio', parentId: null, showInNav: true, sortOrder: 1 },
  { id: 'land',  title: 'Landscapes', parentId: 'port', showInNav: true, sortOrder: 0 },
  { id: 'port2', title: 'Portraits', parentId: 'port', showInNav: true, sortOrder: 1 },
  { id: 'about', title: 'About',   parentId: null, showInNav: true, sortOrder: 2 },
  { id: 'bts',   title: 'Behind',  parentId: null, showInNav: false, sortOrder: 0 },
]

describe('buildNavTree', () => {
  it('returns roots in sortOrder with nested children', () => {
    const tree = buildNavTree(pages)
    expect(tree.map(n => n.id)).toEqual(['home', 'port', 'about'])
    expect(tree[1].children.map(n => n.id)).toEqual(['land', 'port2'])
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
