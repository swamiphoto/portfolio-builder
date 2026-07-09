// Pure buyer-facing price helpers built on the shared pricing module.
import { lineCost, computeRetail } from './pricing'

export function optionPrice(catalog, spec, markup) {
  return computeRetail(lineCost(catalog, spec), markup)
}

export function startingPrice(catalog, availableSizeIds, markup) {
  if (!availableSizeIds || availableSizeIds.length === 0) return null
  let min = Infinity
  for (const size of availableSizeIds) {
    for (const finish of catalog.finishes) {
      const p = optionPrice(catalog, { size, finish: finish.id, frame: 'none', matte: false }, markup)
      if (p < min) min = p
    }
  }
  return min === Infinity ? null : min
}
