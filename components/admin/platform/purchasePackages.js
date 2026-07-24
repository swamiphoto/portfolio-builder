// components/admin/platform/purchasePackages.js
// Pure helpers for the admin packages editor. Prices are integer cents.
let seq = 0
function newId() {
  seq += 1
  return `pkg_${Date.now().toString(36)}_${seq}`
}

export function dollarsToCents(v) {
  if (v === '' || v == null) return 0
  return Math.max(0, Math.round(parseFloat(v) * 100)) || 0
}

export function centsToDollars(cents) {
  const n = (cents || 0) / 100
  return String(n)
}

export function addPackage(list) {
  return [...(list || []), { id: newId(), label: '', credits: 10, price: 0, featured: false }]
}

// Mark one package as the featured "Best value" and clear the flag on all others
// (single-select — only one badge shows in the client drawer).
export function setFeatured(list, id) {
  return (list || []).map(p => ({ ...p, featured: p.id === id ? !p.featured : false }))
}

export function updatePackage(list, id, patch) {
  return (list || []).map(p => (p.id === id ? { ...p, ...patch } : p))
}

export function removePackage(list, id) {
  return (list || []).filter(p => p.id !== id)
}
