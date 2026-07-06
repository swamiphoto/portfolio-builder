// pages/api/admin/print/connect/status.js
import { withAuth } from '../../../../../common/withAuth'
import { readSiteConfig, writeSiteConfig, createDefaultSiteConfig, normalizePrintStore } from '../../../../../common/siteConfig'
import { getStripe } from '../../../../../common/stripe/client'

async function handler(req, res, user) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    let config = normalizePrintStore((await readSiteConfig(user.id)) || createDefaultSiteConfig(user.id))
    const accountId = config.printStore.stripeConnectAccountId
    if (!accountId) return res.status(200).json({ connected: false, chargesEnabled: false })

    const account = await getStripe().accounts.retrieve(accountId)
    const chargesEnabled = !!account.charges_enabled
    if (chargesEnabled !== config.printStore.chargesEnabled) {
      config = { ...config, printStore: { ...config.printStore, chargesEnabled } }
      await writeSiteConfig(user.id, config)
    }
    return res.status(200).json({ connected: true, chargesEnabled })
  } catch (err) {
    console.error('print connect status error', err)
    return res.status(500).json({ error: err.message })
  }
}

export default withAuth(handler)
