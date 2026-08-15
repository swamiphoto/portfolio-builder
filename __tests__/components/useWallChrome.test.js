// __tests__/components/useWallChrome.test.js
// Pure decision logic for the Amsterdam wall's adaptive chrome: which column's
// horizontal span covers the viewport's center X. jsdom can't produce real
// layout rects, so the scroll-driven hook itself isn't exercised here — just
// the exported pure helper. Render-level assertions (data-surface tagging,
// default data-chrome="paper") live in AmsterdamWall.test.js / AmsterdamColumn.test.js.
import { dominantSurface } from '@/components/image-displays/themes/amsterdam/useWallChrome'

describe('dominantSurface', () => {
  const columns = [
    { left: 0, right: 100, surface: 'ink' },
    { left: 100, right: 300, surface: 'image' },
    { left: 400, right: 600, surface: 'paper' },
  ]

  it('returns the surface of the column covering the center', () => {
    expect(dominantSurface(columns, 50)).toBe('ink')
    expect(dominantSurface(columns, 200)).toBe('image')
    expect(dominantSurface(columns, 500)).toBe('paper')
  })

  it('falls back to paper when the center sits in a gap between columns', () => {
    expect(dominantSurface(columns, 350)).toBe('paper')
  })

  it('falls back to paper when the center is outside every column', () => {
    expect(dominantSurface(columns, -50)).toBe('paper')
    expect(dominantSurface(columns, 9999)).toBe('paper')
  })

  it('is inclusive at a column\'s left boundary', () => {
    expect(dominantSurface(columns, 0)).toBe('ink')
    expect(dominantSurface(columns, 400)).toBe('paper')
  })

  it('is inclusive at a column\'s right boundary', () => {
    expect(dominantSurface(columns, 600)).toBe('paper')
  })

  it('resolves adjacent-touching columns to the first match (left column wins its shared edge)', () => {
    expect(dominantSurface(columns, 100)).toBe('ink')
  })

  it('falls back to paper with no columns at all', () => {
    expect(dominantSurface([], 100)).toBe('paper')
  })
})
