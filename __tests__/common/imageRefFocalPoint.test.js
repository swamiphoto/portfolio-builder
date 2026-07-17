import { normalizeImageRef, normalizeImageRefs } from '../../common/assetRefs'

describe('normalizeImageRef focalPoint passthrough', () => {
  it('preserves a valid focalPoint', () => {
    const ref = normalizeImageRef({ url: 'https://x/a.jpg', focalPoint: { x: 0.25, y: 0.75 } })
    expect(ref.focalPoint).toEqual({ x: 0.25, y: 0.75 })
  })

  it('clamps out-of-range focalPoint values', () => {
    const ref = normalizeImageRef({ url: 'https://x/a.jpg', focalPoint: { x: 1.5, y: -0.3 } })
    expect(ref.focalPoint).toEqual({ x: 1, y: 0 })
  })

  it('normalizes an invalid focalPoint to null', () => {
    const ref = normalizeImageRef({ url: 'https://x/a.jpg', focalPoint: { x: 'nope', y: 0.5 } })
    expect(ref.focalPoint).toBeNull()
  })

  it('leaves a ref without a focalPoint untouched', () => {
    const ref = normalizeImageRef({ url: 'https://x/a.jpg' })
    expect(ref).not.toHaveProperty('focalPoint')
  })

  it('preserves focalPoint through normalizeImageRefs', () => {
    const refs = normalizeImageRefs([
      { url: 'https://x/a.jpg', focalPoint: { x: 0.1, y: 0.9 } },
      { url: 'https://x/b.jpg' },
    ])
    expect(refs[0].focalPoint).toEqual({ x: 0.1, y: 0.9 })
    expect(refs[1]).not.toHaveProperty('focalPoint')
  })
})
