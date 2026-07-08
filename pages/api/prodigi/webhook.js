// pages/api/prodigi/webhook.js
// Prodigi status/tracking callback. Locate the order via merchantReference
// ("userId:orderId"), apply status + tracking, email the buyer once on ship.
// Optional shared-secret gate: register the callback URL with ?token=<secret>.
import { getOrder, saveOrder } from '../../../common/orders'
import { sendMail } from '../../../common/email/mailer'
import { readSiteConfig } from '../../../common/siteConfig'
import { buyerShippedEmail } from '../../../common/email/templates'

function mapStage(stage) {
  if (stage === 'Complete' || stage === 'Shipped') return 'shipped'
  if (stage === 'Cancelled') return 'canceled'
  return 'placed'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secret = process.env.PRODIGI_WEBHOOK_SECRET
  if (!secret && process.env.NODE_ENV === 'production') {
    return res.status(500).json({ error: 'PRODIGI_WEBHOOK_SECRET not configured' })
  }
  if (secret && req.query.token !== secret) return res.status(401).json({ error: 'unauthorized' })

  try {
    const pOrder = req.body?.order || {}
    const ref = pOrder.merchantReference || ''
    const [userId, orderId] = ref.split(':')
    if (!userId || !orderId) return res.status(200).json({ received: true, ignored: 'no merchantReference' })

    const order = await getOrder(userId, orderId)
    if (!order || order.status === 'shipped' || order.status === 'canceled') {
      return res.status(200).json({ received: true }) // unknown or terminal → idempotent no-op
    }

    const status = mapStage(pOrder.status?.stage)
    if (status !== 'shipped') {
      return res.status(200).json({ received: true }) // not shipped yet
    }

    const shipment = (pOrder.shipments || [])[0]
    const tracking = shipment
      ? { carrier: shipment.carrier?.name || null, number: shipment.tracking?.number || null, url: shipment.tracking?.url || null }
      : null

    order.status = 'shipped'
    order.fulfillment = { ...(order.fulfillment || {}), status: 'shipped', tracking }
    await saveOrder(userId, order)

    const config = await readSiteConfig(userId).catch(() => null)
    if (order.buyer?.email) {
      try {
        const msg = buyerShippedEmail({ order, tracking, siteName: config?.siteName || 'the shop' })
        await sendMail({ to: order.buyer.email, ...msg })
      } catch (mailErr) {
        console.error('buyerShippedEmail failed', mailErr.message)
      }
    }
    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('prodigi webhook handler error', err)
    return res.status(500).json({ error: 'Webhook handler error' })
  }
}
