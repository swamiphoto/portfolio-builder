// common/fulfillment/prodigiClient.js
// Thin Prodigi REST client (server-side only). Base URL by env; X-API-Key auth.

export function prodigiBaseUrl() {
  if (process.env.PRODIGI_BASE_URL) return process.env.PRODIGI_BASE_URL
  return process.env.PRODIGI_ENV === 'live'
    ? 'https://api.prodigi.com'
    : 'https://api.sandbox.prodigi.com'
}

export async function prodigiFetch(path, { method = 'GET', body } = {}) {
  const key = process.env.PRODIGI_API_KEY
  if (!key) throw new Error('PRODIGI_API_KEY not configured')

  const res = await fetch(`${prodigiBaseUrl()}${path}`, {
    method,
    headers: {
      'X-API-Key': key,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!res.ok) {
    let detail = ''
    try { detail = await res.text() } catch (_) { /* ignore */ }
    throw new Error(`prodigi ${res.status}: ${detail}`)
  }
  return res.json()
}
