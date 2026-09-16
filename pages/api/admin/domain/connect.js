// pages/api/admin/domain/connect.js
import { withAuth } from '../../../../common/withAuth'
import { addDomain, addWwwRedirect, getDomain, getDomainConfig } from '../../../../common/vercel'
import { readSiteConfig, writeSiteConfig } from '../../../../common/siteConfig'
import { uploadJSON } from '../../../../common/gcsClient'
import { getDomainLookupPath } from '../../../../common/gcsUser'
import { dnsRecordsFor, deriveStatus, isApex, stripWww } from '../../../../common/domainUtils'

const HOST_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/

export async function handler(req, res, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Strip a leading www so www.janedoe.com connects the apex janedoe.com (with
  // www redirecting to it) rather than a broken "subdomain" whose apex is unset.
  const name = stripWww(String(req.body?.name || '')
    .trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
  if (!HOST_RE.test(name)) {
    return res.status(400).json({ error: 'Enter a valid domain like photos.yourname.com' })
  }

  const config = await readSiteConfig(user.id)
  if (!config) return res.status(400).json({ error: 'Site not set up yet' })
  if (!user.username) return res.status(400).json({ error: 'Set your site URL before adding a custom domain' })

  async function finalize(domainObj) {
    const { misconfigured } = await getDomainConfig(name)
    const status = deriveStatus({ verified: domainObj.verified, misconfigured })
    const verification = [
      ...dnsRecordsFor(name),
      ...((domainObj.verification || []).map((v) => ({ type: v.type, name: v.domain, value: v.value }))),
    ]
    // Register www.<apex> as a 308 redirect to the apex. Best-effort: a failed
    // www add still leaves the apex fully connected. wwwAddedAt records that we
    // tried, so the status poll doesn't keep retrying an already-added alias.
    let wwwAddedAt = null
    if (isApex(name) && (await addWwwRedirect(name))) wwwAddedAt = new Date().toISOString()
    const now = new Date().toISOString()
    const customDomain = {
      name, status, verification, addedAt: now,
      verifiedAt: status === 'active' ? now : null, lastError: null, wwwAddedAt,
    }
    config.customDomain = customDomain
    await writeSiteConfig(user.id, config)
    await uploadJSON(getDomainLookupPath(name), { username: user.username, userId: user.id })
    return res.status(200).json({ customDomain })
  }

  try {
    const added = await addDomain(name)
    return await finalize(added)
  } catch (err) {
    if (err.status === 409 || err.code === 'domain_already_in_use') {
      try {
        const existing = await getDomain(name)
        if (existing) return await finalize(existing)
      } catch (_) {
        // getDomain threw — domain belongs to another project
      }
      return res.status(409).json({ error: 'That domain is already connected to another site.' })
    }
    console.error('POST /api/admin/domain/connect error:', err)
    return res.status(500).json({ error: err.message || 'Could not connect domain' })
  }
}

export default withAuth(handler)
