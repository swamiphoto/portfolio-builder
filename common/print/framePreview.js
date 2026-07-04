// Pure: maps a frame spec to concrete style ratios/colors for the CSS preview.
// This is the v1 renderer's data source; a photoreal renderer would replace
// FramedImage, not this contract.

const WOOD = { black: '#2b2b2b', white: '#f2efe9', natural: '#c8a87a', walnut: '#5a3d2b' }
const METAL = { black: '#3a3a3a', silver: '#c9ccce' }

export function frameColorToCss(frame, color) {
  if (frame === 'wood') return WOOD[color] || WOOD.natural
  if (frame === 'metal') return METAL[color] || METAL.silver
  return null
}

export function frameStyles(spec = {}) {
  const { frame = 'none', frameColor, matte = false } = spec
  if (frame === 'none') {
    return { framed: false, bandColor: null, bandRatio: 0, matted: false, matRatio: 0, matColor: null }
  }
  const matted = !!matte
  return {
    framed: true,
    bandColor: frameColorToCss(frame, frameColor),
    bandRatio: 0.055,
    matted,
    matRatio: matted ? 0.06 : 0,
    matColor: matted ? '#f7f4ee' : null,
  }
}
