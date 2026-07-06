import { quoteOrder } from '../../common/print/quoteOrder'
import { SEED_CATALOG } from '../../common/fulfillment/seedCatalog'
import { computeRetail, lineCost } from '../../common/print/pricing'

const adapter = {
  getCost: (spec) => ({ cost: lineCost(SEED_CATALOG, spec), currency: 'USD' }),
  getShippingQuote: () => ({ cost: 12, currency: 'USD', etaDays: 5 }),
}

it('assembles amounts in cents from catalog + adapter quotes', () => {
  const spec = { size: '16x24', finish: 'lustre', frame: 'none', matte: false }
  const a = quoteOrder({ catalog: SEED_CATALOG, spec, markup: 3, platformFeePct: 0, currency: 'USD', adapter, address: { country: 'US' } })
  const printCents = Math.round(lineCost(SEED_CATALOG, spec) * 100)
  const retailCents = Math.round(computeRetail(lineCost(SEED_CATALOG, spec), 3) * 100)
  expect(a.printCost).toBe(printCents)
  expect(a.shippingCost).toBe(1200)
  expect(a.retail).toBe(retailCents)
  expect(a.total).toBe(retailCents + 1200)
})
