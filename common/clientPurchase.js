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
    packages,
  }
}

function norm(email) {
  return String(email || '').trim().toLowerCase()
}

function deviceIdsForEmail(data, emailLower) {
  const ids = []
  for (const [deviceId, person] of Object.entries(data.people || {})) {
    if (norm(person?.email) === emailLower) ids.push(deviceId)
  }
  return new Set(ids)
}

// Distinct photo URLs this person (all devices sharing the email) has downloaded.
function unlockedUrlSet(data, emailLower) {
  const ids = deviceIdsForEmail(data, emailLower)
  const set = new Set()
  for (const d of (data.downloads || [])) {
    if (ids.has(d.deviceId)) set.add(d.photoUrl)
  }
  return set
}

export function resolveDownloadAccess({ data, email, photoUrl, freeAllowance }) {
  const emailLower = norm(email)
  if (!emailLower) return { allowed: false, reason: 'no-email' }
  const unlocked = unlockedUrlSet(data, emailLower)
  if (unlocked.has(photoUrl)) return { allowed: true, reason: 'already-unlocked' }
  const ent = (data.entitlements || {})[emailLower]
  if (ent?.all) return { allowed: true, reason: 'entitled-all' }
  const ceiling = Math.max(0, Math.floor(freeAllowance || 0)) + (ent?.credits || 0)
  if (unlocked.size < ceiling) return { allowed: true, reason: 'within-ceiling' }
  return { allowed: false, reason: 'paywall' }
}

export function grantEntitlement(data, { email, credits, orderId }) {
  const emailLower = norm(email)
  if (!emailLower) return data
  const entitlements = { ...(data.entitlements || {}) }
  const prev = entitlements[emailLower] || { credits: 0, all: false, orders: [], updatedAt: 0 }
  if (orderId && prev.orders.includes(orderId)) return data // idempotent replay
  const next = {
    credits: prev.credits + (credits === 'all' ? 0 : Math.max(0, Math.floor(credits || 0))),
    all: prev.all || credits === 'all',
    orders: orderId ? [...prev.orders, orderId] : prev.orders,
    updatedAt: Date.now(),
  }
  entitlements[emailLower] = next
  return { ...data, entitlements }
}

export function viewerPurchaseState({ data, email, freeAllowance }) {
  const emailLower = norm(email)
  const unlocked = emailLower ? unlockedUrlSet(data, emailLower) : new Set()
  const ent = emailLower ? (data.entitlements || {})[emailLower] : null
  const all = !!ent?.all
  const ceiling = Math.max(0, Math.floor(freeAllowance || 0)) + (ent?.credits || 0)
  return {
    unlockedUrls: [...unlocked],
    unlockedCount: unlocked.size,
    ceiling,
    all,
    remaining: all ? null : Math.max(0, ceiling - unlocked.size),
  }
}
