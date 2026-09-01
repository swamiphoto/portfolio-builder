// pages/api/admin/print/orders/retry.js
// Owner-triggered retry of a paid order whose lab placement failed. The buyer
// has already paid and been emailed, so we only re-attempt placement.
import { withAuth } from '../../../../../common/withAuth'
import { getOrder } from '../../../../../common/orders'
import { readSiteConfig } from '../../../../../common/siteConfig'
import { readUserProfile } from '../../../../../common/userProfile'
import { placeOrderForPaidOrder } from '../../../../../common/fulfillment/placeOrderForPaidOrder'

async function handler(req, res, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { orderId } = req.body || {}
    if (!orderId) return res.status(400).json({ error: 'orderId required' })

    const order = await getOrder(user.id, orderId)
    if (!order) return res.status(404).json({ error: 'Order not found' })
    if (order.fulfillment?.labOrderId) return res.status(200).json({ order }) // already placed
    if (order.status !== 'fulfillment_failed' && order.status !== 'paid') {
      return res.status(409).json({ error: `Order is ${order.status}, nothing to retry` })
    }

    const [config, profile] = await Promise.all([
      readSiteConfig(user.id).catch(() => null),
      readUserProfile(user.id).catch(() => null),
    ])
    const photographerEmail =
      config?.clientDefaults?.notificationEmail || config?.contact?.email || profile?.email || null
    const siteName = config?.siteName || 'your portfolio'

    const updated = await placeOrderForPaidOrder(order, { photographerEmail, siteName, skipBuyerEmail: true })
    if (updated.status === 'fulfillment_failed') {
      return res.status(502).json({ order: updated, error: updated.fulfillment?.error || 'Lab placement failed again.' })
    }
    return res.status(200).json({ order: updated })
  } catch (err) {
    console.error('order retry error', err)
    return res.status(500).json({ error: 'Could not retry the order' })
  }
}

export default withAuth(handler)
