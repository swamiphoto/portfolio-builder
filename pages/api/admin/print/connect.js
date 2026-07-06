// pages/api/admin/print/connect.js
import { withAuth } from '../../../../common/withAuth'
import { readSiteConfig, writeSiteConfig, createDefaultSiteConfig, normalizePrintStore } from '../../../../common/siteConfig'
import { getStripe } from '../../../../common/stripe/client'

async function handler(req, res, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const stripe = getStripe()
    let config = normalizePrintStore((await readSiteConfig(user.id)) || createDefaultSiteConfig(user.id))
    let accountId = config.printStore.stripeConnectAccountId

    if (!accountId) {
      const account = await stripe.accounts.create({ type: 'express', metadata: { userId: user.id } })
      accountId = account.id
      config = { ...config, printStore: { ...config.printStore, stripeConnectAccountId: accountId } }
      await writeSiteConfig(user.id, config)
    }

    const origin = req.headers.origin || `https://${req.headers.host}`
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/admin?connect=refresh`,
      return_url: `${origin}/admin?connect=return`,
      type: 'account_onboarding',
    })
    return res.status(200).json({ url: link.url })
  } catch (err) {
    console.error('print connect error', err)
    return res.status(500).json({ error: err.message })
  }
}

export default withAuth(handler)
