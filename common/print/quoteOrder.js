// Pure: turn catalog + adapter quotes into an amounts split (cents).
import { computeRetail, lineCost } from './pricing'
import { buildAmounts } from './orderPricing'

const toCents = (n) => Math.round(n * 100)

export function quoteOrder({ catalog, spec, markup, platformFeePct = 0, currency = 'USD', adapter, address }) {
  const printCost = toCents(adapter.getCost(spec).cost)
  const shippingCost = toCents(adapter.getShippingQuote(spec, address).cost)
  const retail = toCents(computeRetail(lineCost(catalog, spec), markup))
  return buildAmounts({ retail, printCost, shippingCost, platformFeePct, currency })
}
