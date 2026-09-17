// Turn a live lab quote (price + shipping) into an amounts split (cents).
// Retail is derived from the real lab cost so the markup — and Sepia's fee —
// track the true cost per size + destination.
import { computeRetail } from './pricing'
import { buildAmounts } from './orderPricing'

const toCents = (n) => Math.round(n * 100)

export async function quoteOrder({ spec, markup, platformFeePct = 0, currency = 'USD', adapter, address, shippingMethod = 'standard', freeShipping = false, shippingBuffer = 0, rounding = 'nearest5' }) {
  const q = await adapter.getQuote(spec, address, shippingMethod)
  const printCost = toCents(q.cost)
  const shippingCost = toCents(q.shipping)
  const retail = toCents(computeRetail(q.cost, markup, { rounding }))
  const amounts = buildAmounts({ retail, printCost, shippingCost, platformFeePct, currency: q.currency || currency, freeShipping, shippingBuffer })
  // Echo the method the adapter actually used (it may have fallen back).
  return { ...amounts, shippingMethod: q.shippingMethod || shippingMethod }
}
