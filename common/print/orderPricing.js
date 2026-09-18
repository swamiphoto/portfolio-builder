// Pure money math for one print order. All amounts are integer minor units (cents).
export function buildAmounts({ retail, printCost, shippingCost, platformFeePct = 0, currency = 'USD', freeShipping = false, shippingBuffer = 0 }) {
  const platformFee = Math.round(retail * (platformFeePct / 100))
  if (freeShipping) {
    // Buffer folds into the price; the buyer sees no shipping line, but Prodigi
    // still bills the real shipping, so it stays in the application fee.
    const total = retail + shippingBuffer
    const applicationFee = printCost + shippingCost + platformFee
    const profit = total - applicationFee
    if (applicationFee > total) throw new Error('markup too low: application fee exceeds the buyer charge')
    return { retail, printCost, shippingCost: 0, actualShippingCost: shippingCost, shippingBuffer, shippingFree: true, platformFee, applicationFee, profit, total, currency }
  }
  const total = retail + shippingCost
  const applicationFee = printCost + shippingCost + platformFee
  const profit = retail - printCost - platformFee
  if (applicationFee > total) throw new Error('markup too low: application fee exceeds the buyer charge')
  return { retail, printCost, shippingCost, platformFee, applicationFee, profit, total, currency, shippingFree: false }
}
