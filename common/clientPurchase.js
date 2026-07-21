// common/clientPurchase.js
// Pure entitlement logic for the client digital-purchase (upsell) feature.
// Counting unit is the distinct photo URL; entitlements are keyed by
// normalized email. No I/O here so every rule is unit-testable.

function toInt(v, min = 0) {
  const n = Math.floor(Number(v))
  return Number.isFinite(n) && n >= min ? n : min
}

function normalizePackage(pkg, index) {
  if (!pkg || typeof pkg !== 'object') return null
  const label = String(pkg.label || '').trim()
  const rawPrice = Number(pkg.price)
  if (!Number.isFinite(rawPrice) || rawPrice < 0) return null
  const price = Math.floor(rawPrice)
  let credits
  if (pkg.credits === 'all') credits = 'all'
  else {
    const n = Math.floor(Number(pkg.credits))
    if (!Number.isFinite(n) || n < 1) return null
    credits = n
  }
  if (!label) return null
  const id = String(pkg.id || `pkg_${index}`)
  return { id, label, credits, price }
}

export function normalizePurchaseConfig(purchase) {
  const p = purchase || {}
  const packages = (Array.isArray(p.packages) ? p.packages : [])
    .map((pkg, i) => normalizePackage(pkg, i))
    .filter(Boolean)
  return {
    enabled: p.enabled ?? false,
    freeAllowance: toInt(p.freeAllowance, 0),
    currency: p.currency || 'USD',
    packages,
  }
}
