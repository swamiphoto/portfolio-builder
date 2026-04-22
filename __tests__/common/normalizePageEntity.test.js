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
    expect(p.cover).toEqual({ imageUrl: 'https://x/c.jpg', height: 'full', overlayText: '', variant: 'showcase', primaryCta: null, secondaryCta: null })
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

  it('defaults cover.variant to "showcase" when absent', () => {
    const p = normalizePageEntity({ cover: { imageUrl: 'x' }, blocks: [] })
    expect(p.cover.variant).toBe('showcase')
  })

  it('preserves cover.variant="cover"', () => {
    const p = normalizePageEntity({ cover: { imageUrl: 'x', variant: 'cover' }, blocks: [] })
    expect(p.cover.variant).toBe('cover')
  })

  it('clamps unknown cover.variant to "showcase"', () => {
    const p = normalizePageEntity({ cover: { imageUrl: 'x', variant: 'banner' }, blocks: [] })
    expect(p.cover.variant).toBe('showcase')
  })

  it('defaults primaryCta and secondaryCta to null when absent', () => {
    const p = normalizePageEntity({ cover: { imageUrl: 'x' }, blocks: [] })
    expect(p.cover.primaryCta).toBeNull()
    expect(p.cover.secondaryCta).toBeNull()
  })

  it('preserves primaryCta and secondaryCta with label and href', () => {
    const p = normalizePageEntity({
      cover: {
        imageUrl: 'x',
        variant: 'cover',
        primaryCta: { label: 'View', href: '/portfolio' },
        secondaryCta: { label: 'Contact', href: '#contact' },
      },
      blocks: [],
    })
    expect(p.cover.primaryCta).toEqual({ label: 'View', href: '/portfolio' })
    expect(p.cover.secondaryCta).toEqual({ label: 'Contact', href: '#contact' })
  })

  it('normalizes partial CTA (label only) to { label, href: "" }', () => {
    const p = normalizePageEntity({
      cover: { imageUrl: 'x', primaryCta: { label: 'Click' } },
      blocks: [],
    })
    expect(p.cover.primaryCta).toEqual({ label: 'Click', href: '' })
  })
})
