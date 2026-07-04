// __tests__/common/framePreview.test.js
import { frameStyles, frameColorToCss } from '../../common/print/framePreview'

describe('frameColorToCss', () => {
  it('maps wood + metal colors, falling back per material', () => {
    expect(frameColorToCss('wood', 'walnut')).toBe('#5a3d2b')
    expect(frameColorToCss('wood', 'nope')).toBe('#c8a87a') // natural fallback
    expect(frameColorToCss('metal', 'silver')).toBe('#c9ccce')
    expect(frameColorToCss('none', 'black')).toBe(null)
  })
})

describe('frameStyles', () => {
  it('returns an unframed descriptor for frame=none', () => {
    expect(frameStyles({ frame: 'none' })).toEqual({
      framed: false, bandColor: null, bandRatio: 0, matted: false, matRatio: 0, matColor: null,
    })
  })

  it('returns a framed descriptor for wood with a color', () => {
    const s = frameStyles({ frame: 'wood', frameColor: 'black' })
    expect(s.framed).toBe(true)
    expect(s.bandColor).toBe('#2b2b2b')
    expect(s.bandRatio).toBeGreaterThan(0)
    expect(s.matted).toBe(false)
  })

  it('adds a mat when matte is true (only when framed)', () => {
    const s = frameStyles({ frame: 'metal', frameColor: 'silver', matte: true })
    expect(s.matted).toBe(true)
    expect(s.matRatio).toBeGreaterThan(0)
    expect(s.matColor).toBe('#f7f4ee')
    // matte on an unframed print is ignored
    expect(frameStyles({ frame: 'none', matte: true }).matted).toBe(false)
  })
})
