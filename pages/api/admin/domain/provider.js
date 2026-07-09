// Resolve a domain's nameservers and map them to a known DNS provider,
// so the UI can show provider-specific "where to add the record" guidance.
import { promises as dns } from 'dns'
import { withAuth } from '../../../../common/withAuth'
import { detectProvider, registrableDomain } from '../../../../common/dnsProviders'

const UNKNOWN = { id: 'unknown', name: null, dnsUrl: null }

export async function handler(req, res) {
  const name = String(req.query.name || '')
    .trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  const apex = registrableDomain(name)
  if (!apex) return res.status(200).json({ provider: UNKNOWN })
  try {
    const ns = await dns.resolveNs(apex)
    return res.status(200).json({ provider: detectProvider(ns, apex), nameservers: ns })
  } catch {
    return res.status(200).json({ provider: UNKNOWN })
  }
}

export default withAuth(handler)
