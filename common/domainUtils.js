// Pure helpers for custom domains. Safe to import from server or client.

const APEX_IP = '76.76.21.21'
const CNAME_TARGET = 'cname.vercel-dns.com'

export function isApex(name) {
  if (!name) return false
  return name.split('.').filter(Boolean).length <= 2
}

export function dnsRecordsFor(name) {
  if (!name) return []
  if (isApex(name)) return [{ type: 'A', name: '@', value: APEX_IP }]
  return [{ type: 'CNAME', name: name.split('.')[0], value: CNAME_TARGET }]
}

export function deriveStatus({ verified, misconfigured } = {}) {
  return verified && !misconfigured ? 'active' : 'pending'
}

export function normalizeCustomDomain(value) {
  if (!value) return null
  if (typeof value === 'string') {
    return {
      name: value, status: 'pending', verification: dnsRecordsFor(value),
      addedAt: null, verifiedAt: null, lastError: null,
    }
  }
  return {
    name: value.name,
    status: value.status || 'pending',
    verification: value.verification || dnsRecordsFor(value.name),
    addedAt: value.addedAt || null,
    verifiedAt: value.verifiedAt || null,
    lastError: value.lastError || null,
  }
}

/**
 * Display host for a tenant subdomain, derived from the configured root domain
 * (port stripped). Use instead of hardcoding the platform domain so the UI is
 * correct in every environment (lvh.me in dev, sepia.photo in prod).
 */
export function subdomainHost(subdomain, rootDomain) {
  const root = (rootDomain || 'localhost:3000').replace(/:\d+$/, '')
  return `${subdomain}.${root}`
}

export function siteUrlFor(siteConfig, username, rootDomain) {
  const cd = normalizeCustomDomain(siteConfig?.customDomain)
  if (cd && cd.status === 'active') return `https://${cd.name}`
  const root = (rootDomain || 'localhost:3000').replace(/:\d+$/, '')
  return `https://${username}.${root}`
}

export function parseHost(host, rootDomain) {
  const h = (host || '').replace(/^https?:\/\//, '')
  const root = (rootDomain || '').replace(/^https?:\/\//, '')
  if (!root) return { kind: 'custom', subdomain: null }

  // Strip ports for comparison — domain relationships are port-agnostic.
  // This lets dev subdomains (e.g. swamiphoto.lvh.me:3001) match the configured
  // root domain (lvh.me:3000) even when the server is on a different port.
  const hBare = h.replace(/:\d+$/, '')
  const rootBare = root.replace(/:\d+$/, '')

  if (hBare === rootBare || hBare === `www.${rootBare}`) return { kind: 'root', subdomain: null }
  if (hBare.endsWith(`.${rootBare}`)) {
    const sub = hBare.slice(0, hBare.length - rootBare.length - 1)
    if (sub === 'www') return { kind: 'root', subdomain: null }
    return { kind: 'subdomain', subdomain: sub }
  }
  return { kind: 'custom', subdomain: null }
}

/**
 * The URL prefix the public site should use for internal links, given the
 * request host. On a site host (subdomain or custom domain) links are clean
 * (`/{slug}`, prefix ''); on the root domain or localhost the site is served
 * at the literal `/sites/{username}` path, so that prefix is used.
 */
export function basePathFor(host, rootDomain, username) {
  const bare = (host || '').replace(/^https?:\/\//, '').split(':')[0].toLowerCase()
  const isLocal = !bare || bare === 'localhost' || bare === '127.0.0.1' || /^\d{1,3}(\.\d{1,3}){3}$/.test(bare)
  if (isLocal || parseHost(host, rootDomain).kind === 'root') return `/sites/${username}`
  return ''
}
