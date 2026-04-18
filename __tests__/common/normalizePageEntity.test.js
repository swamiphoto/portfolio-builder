import { normalizePageEntity } from '../../common/assetRefs'

describe('normalizePageEntity — back-compat migration', () => {
  it('migrates legacy thumbnail image-ref to { imageUrl, useCover: false }', () => {
    const p = normalizePageEntity({
      thumbnail: { assetId: 'ast_1', url: 'https://x/t.jpg' },
      blocks: [],
    })
    expect(p.thumbnail).toEqual({ imageUrl: 'https://x/t.jpg', useCover: false })
    expect(p.thumbnailUrl).toBe('https://x/t.jpg')
  })

  it('migrates legacy thumbnail=null + thumbnailUrl=string', () => {
    const p = normalizePageEntity({
      thumbnail: null,
      thumbnailUrl: 'https://x/t.jpg',
      blocks: [],
    })
    expect(p.thumbnail).toEqual({ imageUrl: 'https://x/t.jpg', useCover: false })
  })

  it('preserves the new thumbnail shape', () => {
    const p = normalizePageEntity({
      thumbnail: { imageUrl: 'https://x/t.jpg', useCover: false },
      blocks: [],
    })
    expect(p.thumbnail).toEqual({ imageUrl: 'https://x/t.jpg', useCover: false })
  })

  it('defaults useCover=true when nothing is set', () => {
    const p = normalizePageEntity({ blocks: [] })
    expect(p.thumbnail).toEqual({ imageUrl: '', useCover: true })
  })

  it('defaults parentId, showInNav, sortOrder, password on legacy data', () => {
    const p = normalizePageEntity({ id: 'old', title: 'Old', blocks: [] })
    expect(p.parentId).toBeNull()
    expect(p.showInNav).toBe(true)
    expect(p.sortOrder).toBe(0)
    expect(p.password).toBe('')
  })

  it('normalizes cover when present, defaulting height to "full"', () => {
    const p = normalizePageEntity({ cover: { imageUrl: 'https://x/c.jpg' }, blocks: [] })
    expect(p.cover).toEqual({ imageUrl: 'https://x/c.jpg', height: 'full', overlayText: '' })
  })

  it('clamps unknown cover.height values to "full"', () => {
    const p = normalizePageEntity({ cover: { imageUrl: 'x', height: 'weird' }, blocks: [] })
    expect(p.cover.height).toBe('full')
  })

  it('preserves cover.height="partial"', () => {
    const p = normalizePageEntity({ cover: { imageUrl: 'x', height: 'partial' }, blocks: [] })
    expect(p.cover.height).toBe('partial')
  })

  it('leaves cover null when absent', () => {
    const p = normalizePageEntity({ blocks: [] })
    expect(p.cover).toBeNull()
  })
})
