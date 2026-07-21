// Client-side identity for gallery visitors ("identity-lite"): asked once,
// stored per site in localStorage. Access control is the page password —
// this is only attribution.
const storageKey = (username) => `sepia:client-identity:${username}`

function makeDeviceId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function getClientIdentity(username) {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(storageKey(username))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.deviceId || !parsed?.name) return null
    return { deviceId: parsed.deviceId, name: parsed.name, email: parsed.email || '' }
  } catch {
    return null
  }
}

export function saveClientIdentity(username, { name, email }) {
  const existing = getClientIdentity(username)
  const identity = {
    deviceId: existing?.deviceId || makeDeviceId(),
    name: String(name || '').trim(),
    email: String(email || '').trim(),
  }
  try { localStorage.setItem(storageKey(username), JSON.stringify(identity)) } catch {}
  return identity
}

export function clearClientIdentity(username) {
  try { localStorage.removeItem(storageKey(username)) } catch {}
}
