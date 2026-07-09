import { quoteOrder } from '../../common/print/quoteOrder'
import { SEED_CATALOG } from '../../common/fulfillment/seedCatalog'
import { computeRetail, lineCost } from '../../common/print/pricing'
import { mockLabAdapter } from '../../common/fulfillment/mockLabAdapter'

it('assembles amounts in cents from a live-style getQuote (seed-backed)', async () => {
  const spec = { size: '16x24', finish: 'lustre', frame: 'none', matte: false }
  const a = await quoteOrder({ spec, markup: 3, platformFeePct: 0, currency: 'USD', adapter: mockLabAdapter, address: { country: 'US' } })
  const printCents = Math.round(lineCost(SEED_CATALOG, spec) * 100)
  const retailCents = Math.round(computeRetail(lineCost(SEED_CATALOG, spec), 3) * 100)
  expect(a.printCost).toBe(printCents)
  expect(a.shippingCost).toBe(1200)
  expect(a.retail).toBe(retailCents)
  expect(a.total).toBe(retailCents + 1200)
})

it('derives retail and print cost from the adapter quote, and applies the platform fee', async () => {
  // A stub adapter returning real-ish quote numbers ($15 cost, $7 shipping).
  const adapter = { getQuote: async () => ({ cost: 15, shipping: 7, currency: 'USD' }) }
  const a = await quoteOrder({ spec: { size: '16x20', finish: 'matte', frame: 'none' }, markup: 3, platformFeePct: 15, currency: 'USD', adapter, address: { country: 'US' } })
  expect(a.printCost).toBe(1500)
  expect(a.shippingCost).toBe(700)
  expect(a.retail).toBe(Math.round(computeRetail(15, 3) * 100)) // 15*3=45 -> round up to 45 -> $45
  expect(a.platformFee).toBe(Math.round(a.retail * 0.15))
  // Sepia's application fee = printCost + shipping + platformFee
  expect(a.applicationFee).toBe(a.printCost + a.shippingCost + a.platformFee)
})
