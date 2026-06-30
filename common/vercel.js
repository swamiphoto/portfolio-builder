// common/vercel.js
// Server-side only — thin wrapper over the Vercel REST API. Never import from client code.

const API = 'https://api.vercel.com'

function cfg() {
  const token = process.env.VERCEL_API_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  const teamId = process.env.VERCEL_TEAM_ID || ''
  if (!token || !projectId) throw new Error('Vercel API not configured (set VERCEL_API_TOKEN and VERCEL_PROJECT_ID)')
  return { token, projectId, teamId }
}

function withTeam(url, teamId) {
  if (!teamId) return url
  return url + (url.includes('?') ? '&' : '?') + `teamId=${teamId}`
}

async function vfetch(path, { method = 'GET', body } = {}) {
  const { token, teamId } = cfg()
  const res = await fetch(withTeam(`${API}${path}`, teamId), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(json?.error?.message || `Vercel API error (${res.status})`)
    err.status = res.status
    err.code = json?.error?.code
    throw err
  }
  return json
}

export async function addDomain(name) {
  const { projectId } = cfg()
  return vfetch(`/v10/projects/${projectId}/domains`, { method: 'POST', body: { name } })
}

export async function getDomain(name) {
  const { projectId } = cfg()
  return vfetch(`/v9/projects/${projectId}/domains/${name}`)
}

export async function getDomainConfig(name) {
  return vfetch(`/v6/domains/${name}/config`)
}

export async function removeDomain(name) {
  const { projectId } = cfg()
  return vfetch(`/v9/projects/${projectId}/domains/${name}`, { method: 'DELETE' })
}

export async function checkAvailability(name) {
  const r = await vfetch(`/v4/domains/status?name=${encodeURIComponent(name)}`)
  return !!r.available
}

export async function getPrice(name) {
  const r = await vfetch(`/v4/domains/price?name=${encodeURIComponent(name)}`)
  return { price: r.price, period: r.period }
}
