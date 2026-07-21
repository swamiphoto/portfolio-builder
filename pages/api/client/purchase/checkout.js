// pages/api/client/purchase/checkout.js
import { lookupUserByUsername } from '../../../../common/userProfile'
import { readSiteConfig, normalizePrintStore } from '../../../../common/siteConfig'
import { newOrderId, saveOrder } from '../../../../common/orders'
import { getStripe } from '../../../../common/stripe/client'
import { buildDigitalAmounts } from '../../../../common/purchase/digitalAmounts'
import { buildDigitalCheckoutSessionParams } from '../../../../common/stripe/checkout'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { username, pageId, packageId, buyer, returnPath } = req.body || {}
    if (!username || !pageId || !packageId || !buyer?.email) {
      return res.status(400).json({ error: 'username, pageId, packageId, buyer.email required' })
    }
    const lookup = await lookupUserByUsername(username)
    if (!lookup) return res.status(404).json({ error: 'not found' })

    const config = normalizePrintStore((await readSiteConfig(lookup.userId)) || {})
    const ps = config.printStore
    if (!ps.enabled || !ps.chargesEnabled || !ps.stripeConnectAccountId) {
      return res.status(403).json({ error: 'store not ready for checkout' })
    }

    const page = (config.pages || []).find(p => p.id === pageId || p.slug === pageId)
    const purchase = page?.clientFeatures?.purchase
    if (!page?.clientFeatures?.enabled || !page?.clientFeatures?.downloads?.enabled || !purchase?.enabled) {
      return res.status(403).json({ error: 'purchase not enabled' })
    }
    const pkg = (purchase.packages || []).find(p => p.id === packageId)
    if (!pkg) return res.status(400).json({ error: 'unknown package' })

    const platformFeePct = Number(
      process.env.NEXT_PUBLIC_PLATFORM_FEE_PCT ?? process.env.PLATFORM_FEE_PCT ?? ps.platformFeePct ?? 0
    ) || 0
    const amounts = buildDigitalAmounts({ price: pkg.price, platformFeePct, currency: ps.currency })

    const order = {
      id: newOrderId(),
      userId: lookup.userId,
      type: 'digital',
      status: 'pending',
      pageId: page.id,
      packageId: pkg.id,
      credits: pkg.credits,
      label: pkg.label,
      buyer: { email: String(buyer.email).trim(), name: buyer.name || '' },
      amounts,
      stripe: { sessionId: null, paymentIntentId: null, connectedAccountId: ps.stripeConnectAccountId },
      createdAt: new Date().toISOString(),
    }

    // Return the buyer to the gallery they were on. returnPath is a same-site
    // path supplied by the client; only accept a leading-slash path.
    const base = req.headers.origin || ''
    const safePath = typeof returnPath === 'string' && returnPath.startsWith('/') ? returnPath.split('?')[0] : '/'
    const session = await getStripe().checkout.sessions.create(
      buildDigitalCheckoutSessionParams({
        order,
        successUrl: `${base}${safePath}?purchase=success`,
        cancelUrl: `${base}${safePath}`,
      }),
      { stripeAccount: ps.stripeConnectAccountId },
    )

    order.stripe.sessionId = session.id
    await saveOrder(lookup.userId, order)
    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('[client/purchase/checkout]', err)
    return res.status(500).json({ error: 'Checkout failed' })
  }
}
