// Creates a single-use Stripe Express dashboard login link so the photographer
// can jump straight to their payouts/balance. Generated on demand (links expire).
import { withAuth } from '../../../../../common/withAuth'
import { readSiteConfig, normalizePrintStore, createDefaultSiteConfig } from '../../../../../common/siteConfig'
import { getStripe } from '../../../../../common/stripe/client'

async function handler(req, res, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const config = normalizePrintStore((await readSiteConfig(user.id)) || createDefaultSiteConfig(user.id))
    const accountId = config.printStore.stripeConnectAccountId
    if (!accountId) return res.status(400).json({ error: 'No connected account' })
    const link = await getStripe().accounts.createLoginLink(accountId)
    return res.status(200).json({ url: link.url })
  } catch (err) {
    console.error('print login-link error', err)
    return res.status(500).json({ error: 'Could not create dashboard link' })
  }
}

export default withAuth(handler)
