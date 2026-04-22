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

  it('normalizes cover when present, defaulting height/buttonStyle and buttons to []', () => {
    const p = normalizePageEntity({ cover: { imageUrl: 'https://x/c.jpg' }, blocks: [] })
    expect(p.cover).toEqual({
      imageUrl: 'https://x/c.jpg',
      height: 'full',
      overlayText: '',
      variant: 'showcase',
      buttons: [],
      buttonStyle: 'solid',
    })
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

  it('defaults cover.buttons to [] when absent', () => {
    const p = normalizePageEntity({ cover: { imageUrl: 'x' }, blocks: [] })
    expect(p.cover.buttons).toEqual([])
  })

  it('defaults cover.buttonStyle to "solid" when absent', () => {
    const p = normalizePageEntity({ cover: { imageUrl: 'x' }, blocks: [] })
    expect(p.cover.buttonStyle).toBe('solid')
  })

  it('preserves valid cover.buttonStyle', () => {
    const p = normalizePageEntity({ cover: { imageUrl: 'x', buttonStyle: 'outline' }, blocks: [] })
    expect(p.cover.buttonStyle).toBe('outline')
  })

  it('clamps unknown cover.buttonStyle to "solid"', () => {
    const p = normalizePageEntity({ cover: { imageUrl: 'x', buttonStyle: 'fancy' }, blocks: [] })
    expect(p.cover.buttonStyle).toBe('solid')
  })

  it('preserves cover.buttons array with typed buttons', () => {
    const p = normalizePageEntity({
      cover: {
        imageUrl: 'x',
        variant: 'cover',
        buttons: [
          { type: 'url', label: 'View', href: '/portfolio' },
          { type: 'slideshow', label: 'Start Slideshow', href: '' },
          { type: 'client-login', label: 'Client Login', href: '#client-login' },
        ],
      },
      blocks: [],
    })
    expect(p.cover.buttons).toEqual([
      { type: 'url', label: 'View', href: '/portfolio' },
      { type: 'slideshow', label: 'Start Slideshow', href: '' },
      { type: 'client-login', label: 'Client Login', href: '#client-login' },
    ])
  })

  it('defaults unknown button type to "url"', () => {
    const p = normalizePageEntity({
      cover: { imageUrl: 'x', buttons: [{ label: 'Click', href: '/x' }] },
      blocks: [],
    })
    expect(p.cover.buttons).toEqual([{ type: 'url', label: 'Click', href: '/x' }])
  })

  it('normalizes button with missing href', () => {
    const p = normalizePageEntity({
      cover: { imageUrl: 'x', buttons: [{ type: 'url', label: 'Click' }] },
      blocks: [],
    })
    expect(p.cover.buttons).toEqual([{ type: 'url', label: 'Click', href: '' }])
  })

  it('filters out buttons with no label', () => {
    const p = normalizePageEntity({
      cover: {
        imageUrl: 'x',
        buttons: [
          { type: 'url', label: '', href: '/x' },
          { type: 'url', label: 'Keep', href: '' },
        ],
      },
      blocks: [],
    })
    expect(p.cover.buttons).toEqual([{ type: 'url', label: 'Keep', href: '' }])
  })

  it('migrates legacy primaryCta/secondaryCta to url buttons array', () => {
    const p = normalizePageEntity({
      cover: {
        imageUrl: 'x',
        variant: 'cover',
        primaryCta: { label: 'View', href: '/portfolio' },
        secondaryCta: { label: 'Contact', href: '#contact' },
      },
      blocks: [],
    })
    expect(p.cover.buttons).toEqual([
      { type: 'url', label: 'View', href: '/portfolio' },
      { type: 'url', label: 'Contact', href: '#contact' },
    ])
    expect(p.cover.primaryCta).toBeUndefined()
    expect(p.cover.secondaryCta).toBeUndefined()
  })

  it('migrates legacy primaryCta only (no secondaryCta)', () => {
    const p = normalizePageEntity({
      cover: { imageUrl: 'x', primaryCta: { label: 'Click' } },
      blocks: [],
    })
    expect(p.cover.buttons).toEqual([{ type: 'url', label: 'Click', href: '' }])
  })

  it('ignores legacy CTAs when buttons array already present', () => {
    const p = normalizePageEntity({
      cover: {
        imageUrl: 'x',
        buttons: [{ type: 'url', label: 'New', href: '/new' }],
        primaryCta: { label: 'Old', href: '/old' },
      },
      blocks: [],
    })
    expect(p.cover.buttons).toEqual([{ type: 'url', label: 'New', href: '/new' }])
  })

  it('treats cover.buttons=null as empty (does not trigger legacy migration)', () => {
    const p = normalizePageEntity({
      cover: { imageUrl: 'x', buttons: null, primaryCta: { label: 'Old', href: '/old' } },
      blocks: [],
    })
    expect(p.cover.buttons).toEqual([])
  })

  it('passes through an explicitly empty buttons array without triggering migration', () => {
    const p = normalizePageEntity({
      cover: { imageUrl: 'x', buttons: [], primaryCta: { label: 'Old', href: '/old' } },
      blocks: [],
    })
    expect(p.cover.buttons).toEqual([])
  })
})
