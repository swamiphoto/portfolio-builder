// Pure money math for one print order. All amounts are integer minor units (cents).
export function buildAmounts({ retail, printCost, shippingCost, platformFeePct = 0, currency = 'USD' }) {
  const platformFee = Math.round(retail * (platformFeePct / 100))
  const total = retail + shippingCost
  const applicationFee = printCost + shippingCost + platformFee
  const profit = retail - printCost - platformFee
  if (applicationFee > total) throw new Error('markup too low: application fee exceeds the buyer charge')
  return { retail, printCost, shippingCost, platformFee, applicationFee, profit, total, currency }
}
