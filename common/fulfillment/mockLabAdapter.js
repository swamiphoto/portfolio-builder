// Implements the fulfillment adapter contract against the seed catalog.
// Order placement / tracking are intentionally unimplemented until Plan 3.
import { SEED_CATALOG } from './seedCatalog'
import { lineCost } from '../print/pricing'

export const mockLabAdapter = {
  getCatalog() {
    return SEED_CATALOG
  },
  getCost(spec) {
    return { cost: lineCost(SEED_CATALOG, spec), currency: SEED_CATALOG.currency }
  },
  getShippingQuote(spec, address) {
    const domestic = (address?.country || 'US').toUpperCase() === 'US'
    return domestic
      ? { cost: 12, currency: SEED_CATALOG.currency, etaDays: 5 }
      : { cost: 30, currency: SEED_CATALOG.currency, etaDays: 12 }
  },
  placeOrder() {
    throw new Error('placeOrder not implemented in v1 foundation')
  },
  getTracking() {
    throw new Error('getTracking not implemented in v1 foundation')
  },
}
