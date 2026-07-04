// Pure functions — no I/O. Determine which print sizes an image can render
// sharply given its pixel dimensions and a DPI floor.

function edges(px1, px2) {
  return px1 >= px2 ? [px1, px2] : [px2, px1]
}

export function sizeFitsResolution(size, imgWidth, imgHeight, minDpi = 240) {
  if (!size || !imgWidth || !imgHeight) return false
  const [pxLong, pxShort] = edges(imgWidth, imgHeight)
  const [inLong, inShort] = edges(size.wIn, size.hIn)
  const dpi = Math.min(pxLong / inLong, pxShort / inShort)
  return dpi >= minDpi
}

export function availableSizes(imgWidth, imgHeight, sizes, minDpi = 240) {
  return (sizes || [])
    .filter((s) => sizeFitsResolution(s, imgWidth, imgHeight, minDpi))
    .map((s) => s.id)
}

export function maxSharpSize(imgWidth, imgHeight, sizes, minDpi = 240) {
  const fitting = (sizes || []).filter((s) =>
    sizeFitsResolution(s, imgWidth, imgHeight, minDpi)
  )
  if (fitting.length === 0) return null
  return fitting.reduce((best, s) =>
    s.wIn * s.hIn > best.wIn * best.hIn ? s : best
  ).id
}
