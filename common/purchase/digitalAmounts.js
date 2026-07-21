// common/purchase/digitalAmounts.js
// Pure: split a digital (download) sale into Stripe amounts. Unlike a print,
// there is no lab cost and no shipping, so applicationFee == platformFee and
// total == retail. All values are integer cents.
export function buildDigitalAmounts({ price, platformFeePct = 0, currency = 'USD' }) {
  const retail = Math.max(0, Math.round(price))
  const platformFee = Math.round(retail * (Number(platformFeePct) || 0) / 100)
  return {
    retail,
    platformFee,
    applicationFee: platformFee,
    total: retail,
    profit: retail - platformFee,
    currency,
  }
}
