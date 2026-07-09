import { withAuth } from '../../../../common/withAuth'
import { getDomain, getDomainConfig } from '../../../../common/vercel'
import { readSiteConfig, writeSiteConfig } from '../../../../common/siteConfig'
import { normalizeCustomDomain, deriveStatus } from '../../../../common/domainUtils'

export async function handler(req, res, user) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const config = await readSiteConfig(user.id)
  const cd = normalizeCustomDomain(config?.customDomain)
  if (!cd) return res.status(200).json({ customDomain: null })

  try {
    const [domain, conf] = await Promise.all([getDomain(cd.name), getDomainConfig(cd.name)])
    const status = deriveStatus({ verified: domain.verified, misconfigured: conf.misconfigured })
    cd.status = status
    if (status === 'active' && !cd.verifiedAt) cd.verifiedAt = new Date().toISOString()
    cd.lastError = null
    config.customDomain = cd
    await writeSiteConfig(user.id, config)
    return res.status(200).json({ customDomain: cd })
  } catch (err) {
    console.error('GET /api/admin/domain/status error:', err)
    return res.status(200).json({ customDomain: cd })
  }
}

export default withAuth(handler)
