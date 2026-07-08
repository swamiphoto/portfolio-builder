import fetch from 'node-fetch'
import { lookup } from 'dns/promises'
import net from 'net'

const MAX_REDIRECTS = 5

export function isPrivateIp(ip) {
  const kind = net.isIP(ip)
  if (kind === 4) {
    const p = ip.split('.').map(Number)
    if (p[0] === 127) return true                       // loopback
    if (p[0] === 10) return true                        // 10/8
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true // 172.16/12
    if (p[0] === 192 && p[1] === 168) return true       // 192.168/16
    if (p[0] === 169 && p[1] === 254) return true       // link-local / metadata
    if (p[0] === 0) return true                         // 0.0.0.0/8
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true // CGNAT 100.64/10
    return false
  }
  if (kind === 6) {
    const lower = ip.toLowerCase()
    if (lower === '::1' || lower === '::') return true
    if (lower.startsWith('fe80')) return true           // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true // ULA fc00::/7
    const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isPrivateIp(mapped[1])
    return false
  }
  return true // not a parseable IP → treat as unsafe
}

export function assertHttpUrl(rawUrl) {
  let u
  try {
    u = new URL(rawUrl)
  } catch {
    throw new Error('invalid URL')
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error(`blocked URL scheme: ${u.protocol}`)
  }
  return u
}

async function assertResolvesPublic(hostname) {
  let addrs
  try {
    addrs = await lookup(hostname, { all: true })
  } catch {
    throw new Error(`cannot resolve host: ${hostname}`)
  }
  if (!addrs.length) throw new Error(`no DNS records for ${hostname}`)
  for (const a of addrs) {
    if (isPrivateIp(a.address)) throw new Error(`blocked private address for host ${hostname}`)
  }
}

// Fetch a public URL with SSRF protection: validates scheme + resolved IP is public,
// and re-validates on every redirect hop (redirect:'manual' defeats input-only checks).
export async function safeFetch(rawUrl, opts = {}) {
  let current = rawUrl
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const u = assertHttpUrl(current)
    await assertResolvesPublic(u.hostname)
    const res = await fetch(current, { ...opts, redirect: 'manual' })
    const status = res.status
    if (status >= 300 && status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location'), current).toString()
      continue
    }
    return res
  }
  throw new Error('too many redirects')
}
