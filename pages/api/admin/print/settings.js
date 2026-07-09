// pages/api/admin/print/settings.js
import { withAuth } from '../../../../common/withAuth'
import {
  readSiteConfig,
  writeSiteConfig,
  createDefaultSiteConfig,
  normalizePrintStore,
} from '../../../../common/siteConfig'

async function handler(req, res, user) {
  let config = await readSiteConfig(user.id)
  if (!config) {
    config = createDefaultSiteConfig(user.id)
    await writeSiteConfig(user.id, config)
  }
  config = normalizePrintStore(config)

  if (req.method === 'GET') {
    return res.status(200).json({ printStore: config.printStore })
  }

  if (req.method === 'PUT') {
    const { enabled, markup, showPriceOnImage } = req.body || {}
    if (markup !== undefined && !(typeof markup === 'number' && markup > 0)) {
      return res.status(400).json({ error: 'markup must be a positive number' })
    }
    const printStore = {
      ...config.printStore,
      ...(enabled !== undefined ? { enabled: !!enabled } : {}),
      ...(markup !== undefined ? { markup } : {}),
      ...(showPriceOnImage !== undefined ? { showPriceOnImage: !!showPriceOnImage } : {}),
    }
    await writeSiteConfig(user.id, { ...config, printStore })
    return res.status(200).json({ printStore })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
