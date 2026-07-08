// pages/api/print/checkout.js
import { lookupUserByUsername } from '../../../common/userProfile'
import { readSiteConfig } from '../../../common/siteConfig'
import { normalizePrintStore } from '../../../common/siteConfig'
import { readLibraryConfig } from '../../../common/adminConfig'
import { publicPrintForAsset, printImageRef } from '../../../common/print/publicPrint'
import { getAdapterForCountry } from '../../../common/fulfillment/router'
import { SEED_CATALOG } from '../../../common/fulfillment/seedCatalog'
import { quoteOrder } from '../../../common/print/quoteOrder'
import { newOrderId, saveOrder } from '../../../common/orders'
import { getStripe } from '../../../common/stripe/client'
import { buildCheckoutSessionParams } from '../../../common/stripe/checkout'
import { siteUrlFor } from '../../../common/domainUtils'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { username, assetId, spec, buyer } = req.body || {}
    if (!username || !assetId || !spec || !buyer?.email || !buyer?.address?.country) {
      return res.status(400).json({ error: 'username, assetId, spec, buyer.email, buyer.address.country required' })
    }
    const lookup = await lookupUserByUsername(username)
    if (!lookup) return res.status(404).json({ error: 'not found' })

    const rawConfig = await readSiteConfig(lookup.userId)
    const config = normalizePrintStore(rawConfig || {})
    const ps = config.printStore
    if (!ps.enabled || !ps.chargesEnabled || !ps.stripeConnectAccountId) {
      return res.status(403).json({ error: 'store not ready for checkout' })
    }

    const libraryConfig = await readLibraryConfig(lookup.userId).catch(() => ({ assets: {} }))
    const asset = Object.values(libraryConfig?.assets || {}).find((a) => a.assetId === assetId)
    const print = publicPrintForAsset(asset)
    if (!print || !print.availableSizes.includes(spec.size)) return res.status(400).json({ error: 'unavailable size' })

    const adapter = getAdapterForCountry(buyer.address.country)
    const amounts = quoteOrder({
      catalog: SEED_CATALOG, spec, markup: ps.markup, platformFeePct: ps.platformFeePct, currency: ps.currency, adapter, address: buyer.address,
    })

    const order = {
      id: newOrderId(),
      userId: lookup.userId,
      status: 'pending',
      assetId,
      spec,
      print: printImageRef(asset),
      buyer,
      amounts,
      stripe: { sessionId: null, paymentIntentId: null, connectedAccountId: ps.stripeConnectAccountId },
      fulfillment: { lab: 'prodigi', labOrderId: null, status: 'none', tracking: null },
      createdAt: new Date().toISOString(),
    }

    // Return the buyer to wherever they were shopping — localhost in dev, the
    // published domain in prod — rather than a hardcoded configured site URL.
    const base = req.headers.origin || siteUrlFor(config, username, process.env.NEXT_PUBLIC_ROOT_DOMAIN)
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create(
      buildCheckoutSessionParams({ order, successUrl: `${base}/print/confirmation`, cancelUrl: `${base}` }),
      { stripeAccount: ps.stripeConnectAccountId },
    )

    order.stripe.sessionId = session.id
    await saveOrder(lookup.userId, order)
    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('checkout error', err)
    return res.status(500).json({ error: 'Checkout failed' })
  }
}
