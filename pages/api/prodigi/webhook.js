// pages/api/prodigi/webhook.js
// Prodigi status/tracking callback. Locate the order via merchantReference
// ("userId:orderId"), apply status + tracking, email the buyer once on ship.
// Optional shared-secret gate: register the callback URL with ?token=<secret>.
import { getOrder, saveOrder } from '../../../common/orders'
import { sendMail } from '../../../common/email/mailer'
import { readSiteConfig } from '../../../common/siteConfig'
import { buyerShippedEmail } from '../../../common/email/templates'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secret = process.env.PRODIGI_WEBHOOK_SECRET
  if (!secret && process.env.NODE_ENV === 'production') {
    return res.status(500).json({ error: 'PRODIGI_WEBHOOK_SECRET not configured' })
  }
  if (secret && req.query.token !== secret) return res.status(401).json({ error: 'unauthorized' })

  try {
    // Prodigi sends CloudEvents callbacks, so the order lives at data.order.
    // (Older/flat `body.order` kept as a fallback so nothing breaks if a payload
    // ever arrives unwrapped.)
    const pOrder = req.body?.data?.order || req.body?.order || {}
    const ref = pOrder.merchantReference || ''
    const [userId, orderId] = ref.split(':')
    if (!userId || !orderId) return res.status(200).json({ received: true, ignored: 'no merchantReference' })

    const order = await getOrder(userId, orderId)
    if (!order || order.status === 'shipped' || order.status === 'canceled') {
      return res.status(200).json({ received: true }) // unknown or terminal → idempotent no-op
    }

    const stage = pOrder.status?.stage
    const shipments = pOrder.shipments || []
    // Prodigi reports dispatch as a stage change carrying an updated shipments
    // array. A single-shipment order flips straight to 'Complete'; a multi-shipment
    // order can still read 'InProgress' with a dispatched shipment — treat either
    // as shipped so the status advances and the buyer gets their tracking email.
    const dispatched = shipments.some((s) => s?.dispatchDate || s?.tracking?.number)
    const isShipped = stage === 'Complete' || stage === 'Shipped' || dispatched
    const isCanceled = stage === 'Cancelled'

    if (isCanceled) {
      order.status = 'canceled'
      order.fulfillment = { ...(order.fulfillment || {}), status: 'canceled' }
      await saveOrder(userId, order)
      return res.status(200).json({ received: true })
    }

    if (!isShipped) {
      return res.status(200).json({ received: true }) // still in production
    }

    const shipment = shipments[0]
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
