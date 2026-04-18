import { normalizeBlockImageFields, pageDisplayThumbnail } from '../../common/assetRefs'

describe('normalizeBlockImageFields — clientOnly reserved', () => {
  it('defaults clientOnly to false on a photo block when missing', () => {
    const out = normalizeBlockImageFields({ id: 'b1', type: 'photo', imageUrl: 'x' })
    expect(out.clientOnly).toBe(false)
  })

  it('preserves clientOnly=true when present on a photo block', () => {
    const out = normalizeBlockImageFields({ id: 'b1', type: 'photo', imageUrl: 'x', clientOnly: true })
    expect(out.clientOnly).toBe(true)
  })

  it('defaults clientOnly to false on a stacked block', () => {
    const out = normalizeBlockImageFields({ id: 'b2', type: 'stacked', imageUrls: ['a', 'b'] })
    expect(out.clientOnly).toBe(false)
  })

  it('defaults clientOnly to false on a text block', () => {
    const out = normalizeBlockImageFields({ id: 'b3', type: 'text', text: 'hello' })
    expect(out.clientOnly).toBe(false)
  })

  it('defaults clientOnly to false on a video block', () => {
    const out = normalizeBlockImageFields({ id: 'b4', type: 'video', youtubeUrl: 'https://y/v' })
    expect(out.clientOnly).toBe(false)
  })
})

describe('pageDisplayThumbnail', () => {
  it('returns cover url when useCover is true', () => {
    expect(pageDisplayThumbnail({ thumbnail: { useCover: true }, cover: { imageUrl: 'C' } })).toBe('C')
  })
  it('falls back to explicit thumbnail when useCover is false', () => {
    expect(pageDisplayThumbnail({ thumbnail: { useCover: false, imageUrl: 'T' }, cover: { imageUrl: 'C' } })).toBe('T')
  })
  it('returns empty string when nothing is set', () => {
    expect(pageDisplayThumbnail({ thumbnail: { useCover: true }, cover: null })).toBe('')
  })
})
