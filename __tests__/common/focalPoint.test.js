import {
  normalizeFocalPoint,
  focalPointToObjectPosition,
  applyFocalPointToPage,
  normalizePageEntity,
} from '../../common/assetRefs'

describe('normalizeFocalPoint', () => {
  it('returns null for missing/invalid input', () => {
    expect(normalizeFocalPoint(null)).toBeNull()
    expect(normalizeFocalPoint(undefined)).toBeNull()
    expect(normalizeFocalPoint('x')).toBeNull()
    expect(normalizeFocalPoint({ x: 'a', y: 1 })).toBeNull()
  })

  it('passes through a valid point', () => {
    expect(normalizeFocalPoint({ x: 0.25, y: 0.75 })).toEqual({ x: 0.25, y: 0.75 })
  })

  it('clamps out-of-range values to [0,1]', () => {
    expect(normalizeFocalPoint({ x: -0.5, y: 2 })).toEqual({ x: 0, y: 1 })
  })
})

describe('focalPointToObjectPosition', () => {
  it('defaults to center when null/invalid', () => {
    expect(focalPointToObjectPosition(null)).toBe('50% 50%')
    expect(focalPointToObjectPosition({ x: 'a' })).toBe('50% 50%')
  })

  it('maps a point to a percentage string', () => {
    expect(focalPointToObjectPosition({ x: 0.25, y: 0.75 })).toBe('25% 75%')
  })
})

describe('applyFocalPointToPage', () => {
  it('sets focalPoint while preserving other thumbnail fields', () => {
    const page = { id: 'p1', thumbnail: { imageUrl: 'u', useCover: false } }
    const out = applyFocalPointToPage(page, { x: 0.2, y: 0.3 })
    expect(out.thumbnail).toEqual({ imageUrl: 'u', useCover: false, focalPoint: { x: 0.2, y: 0.3 } })
    expect(page.thumbnail.focalPoint).toBeUndefined() // does not mutate input
  })

  it('clears focalPoint when passed null', () => {
    const page = { id: 'p1', thumbnail: { imageUrl: 'u', useCover: false, focalPoint: { x: 0.2, y: 0.3 } } }
    const out = applyFocalPointToPage(page, null)
    expect(out.thumbnail.focalPoint).toBeNull()
  })

  it('defaults a missing thumbnail object', () => {
    const out = applyFocalPointToPage({ id: 'p1' }, { x: 0.5, y: 0.5 })
    expect(out.thumbnail).toEqual({ imageUrl: '', useCover: true, focalPoint: { x: 0.5, y: 0.5 } })
  })
})

describe('normalizePageEntity — focalPoint', () => {
  it('defaults focalPoint to null when absent', () => {
    const p = normalizePageEntity({ thumbnail: { imageUrl: 'u', useCover: false }, blocks: [] })
    expect(p.thumbnail.focalPoint).toBeNull()
  })

  it('preserves and clamps a provided focalPoint', () => {
    const p = normalizePageEntity({ thumbnail: { imageUrl: 'u', useCover: false, focalPoint: { x: 2, y: 0.4 } }, blocks: [] })
    expect(p.thumbnail.focalPoint).toEqual({ x: 1, y: 0.4 })
  })
})
