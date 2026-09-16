import { withAuth } from '../../../../common/withAuth'
import { getDomain, getDomainConfig, addWwwRedirect } from '../../../../common/vercel'
import { readSiteConfig, writeSiteConfig } from '../../../../common/siteConfig'
import { normalizeCustomDomain, deriveStatus, isApex, ensureWwwRecord, wwwHostFor } from '../../../../common/domainUtils'

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
    // Self-healing backfill: apex domains connected before www-redirect support
    // have no www alias in Vercel and no www CNAME in their instructions. Add it
    // once (guarded by wwwAddedAt) so every existing site gets www working too.
    if (isApex(cd.name) && !cd.wwwAddedAt && (await addWwwRedirect(cd.name))) {
      cd.wwwAddedAt = new Date().toISOString()
      cd.verification = ensureWwwRecord(cd.name, cd.verification)
    }
    // Verify the www redirect itself so we never claim "connected" while www is
    // still broken. Only check until it goes active (its own DNS/cert can lag the
    // apex), and keep it non-fatal — apex status must not depend on the www probe.
    if (isApex(cd.name) && cd.wwwAddedAt && cd.wwwStatus !== 'active') {
      try {
        const www = wwwHostFor(cd.name)
        const [wDomain, wConf] = await Promise.all([getDomain(www), getDomainConfig(www)])
        cd.wwwStatus = deriveStatus({ verified: wDomain.verified, misconfigured: wConf.misconfigured })
      } catch (err) {
        console.error('www status check error:', err)
      }
    }
    config.customDomain = cd
    await writeSiteConfig(user.id, config)
    return res.status(200).json({ customDomain: cd })
  } catch (err) {
    console.error('GET /api/admin/domain/status error:', err)
    return res.status(200).json({ customDomain: cd })
  }
}

export default withAuth(handler)
