// pages/api/admin/domain/index.js
import { withAuth } from '../../../../common/withAuth'
import { removeDomain } from '../../../../common/vercel'
import { readSiteConfig, writeSiteConfig } from '../../../../common/siteConfig'
import { deleteFile } from '../../../../common/gcsClient'
import { getDomainLookupPath } from '../../../../common/gcsUser'
import { normalizeCustomDomain, wwwHostFor } from '../../../../common/domainUtils'

export async function handler(req, res, user) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  const config = await readSiteConfig(user.id)
  const cd = normalizeCustomDomain(config?.customDomain)
  if (!cd) return res.status(200).json({ ok: true })

  try { await removeDomain(cd.name) } catch (err) { console.error('vercel removeDomain error:', err) }
  // Also drop the www.<apex> alias registered alongside the apex (no-op for subdomains).
  const www = wwwHostFor(cd.name)
  if (www) { try { await removeDomain(www) } catch (err) { console.error('vercel removeDomain (www) error:', err) } }
  try { await deleteFile(getDomainLookupPath(cd.name)) } catch (err) { console.error('pointer deleteFile error:', err) }

  config.customDomain = null
  await writeSiteConfig(user.id, config)
  return res.status(200).json({ ok: true })
}

export default withAuth(handler)
