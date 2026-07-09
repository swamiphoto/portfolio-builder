// common/print/sellAsset.js
// Pure: given an asset + catalog + markup, produce its updated print object
// and a price-preview matrix. No I/O.
import { availableSizes, maxSharpSize } from './printSizeResolver'
import { buildPriceMatrix } from './pricing'

export function resolveSellableAsset(asset, catalog, markup, sellable = true) {
  const prevPrint = asset.print || {}
  const minDpi = prevPrint.minDpi ?? 240
  const width = prevPrint.masterWidth || asset.width
  const height = prevPrint.masterHeight || asset.height

  if (!sellable) {
    return {
      print: { ...prevPrint, sellable: false, minDpi, availableSizes: [], maxSharpSize: null },
      priceMatrix: [],
    }
  }

  const sizes = availableSizes(width, height, catalog.sizes, minDpi)
  const max = maxSharpSize(width, height, catalog.sizes, minDpi)
  return {
    print: { ...prevPrint, sellable: true, minDpi, availableSizes: sizes, maxSharpSize: max },
    priceMatrix: buildPriceMatrix(catalog, sizes, markup),
  }
}
