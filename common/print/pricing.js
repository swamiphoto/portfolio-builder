// Pure pricing math. Turns lab cost + a single markup into retail prices.

export function roundPrice(n) {
  return Math.ceil(n / 5) * 5
}

export function computeRetail(labCost, markup) {
  return roundPrice(labCost * markup)
}

export function lineCost(catalog, spec) {
  const size = catalog.sizes.find((s) => s.id === spec.size)
  if (!size) throw new Error(`unknown size: ${spec.size}`)
  const finishCost = size.cost[spec.finish]
  if (typeof finishCost !== 'number') throw new Error(`unknown finish: ${spec.finish}`)
  const frame = catalog.frames.find((f) => f.id === spec.frame)
  if (!frame) throw new Error(`unknown frame: ${spec.frame}`)
  const framed = frame.id !== 'none'
  const matteCost = framed && spec.matte && catalog.matte.available ? catalog.matte.cost : 0
  return finishCost + frame.cost + matteCost
}

export function buildPriceMatrix(catalog, availableSizeIds, markup) {
  const rows = []
  for (const sizeId of availableSizeIds) {
    for (const finish of catalog.finishes) {
      for (const frame of catalog.frames) {
        const matteOptions = frame.id === 'none' ? [false] : [false, true]
        for (const matte of matteOptions) {
          const spec = { size: sizeId, finish: finish.id, frame: frame.id, matte }
          const labCost = lineCost(catalog, spec)
          rows.push({ ...spec, labCost, retail: computeRetail(labCost, markup) })
        }
      }
    }
  }
  return rows
}
