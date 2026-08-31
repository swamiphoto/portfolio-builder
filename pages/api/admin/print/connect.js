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

    async function createAccount() {
      const account = await stripe.accounts.create({
        type: 'express',
        metadata: { userId: user.id },
        // Direct charges on the connected account require these capabilities.
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })
      accountId = account.id
      config = { ...config, printStore: { ...config.printStore, stripeConnectAccountId: accountId } }
      await writeSiteConfig(user.id, config)
    }

    if (!accountId) await createAccount()

    const origin = req.headers.origin || `https://${req.headers.host}`
    const linkArgs = () => ({
      account: accountId,
      refresh_url: `${origin}/admin?connect=refresh`,
      return_url: `${origin}/admin?connect=return`,
      type: 'account_onboarding',
    })

    let link
    try {
      link = await stripe.accountLinks.create(linkArgs())
    } catch (err) {
      // A stored account id can become unusable: a test-mode account id
      // persisted before switching to live keys, a deleted account, or a switch
      // between Stripe accounts. Discard it and start fresh so the button can
      // always recover instead of failing forever.
      if (err?.code === 'resource_missing') {
        await createAccount()
        link = await stripe.accountLinks.create(linkArgs())
      } else {
        throw err
      }
    }
    return res.status(200).json({ url: link.url })
  } catch (err) {
    console.error('print connect error', err)
    return res.status(500).json({ error: 'Could not start Stripe onboarding' })
  }
}

export default withAuth(handler)
