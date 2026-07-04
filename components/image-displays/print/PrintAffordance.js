// components/image-displays/print/PrintAffordance.js
import React from 'react'
import { SEED_CATALOG } from '../../../common/fulfillment/seedCatalog'
import { startingPrice } from '../../../common/print/buyerPricing'

export default function PrintAffordance({ print, printStore, onOpen }) {
  const from = printStore?.showPriceOnImage
    ? startingPrice(SEED_CATALOG, print?.availableSizes || [], printStore?.markup || 3)
    : null
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-3 text-white/70 hover:text-white text-sm tracking-wide underline underline-offset-4 decoration-white/30"
    >
      Available as a print{from != null ? ` · from $${from}` : ''}
    </button>
  )
}
