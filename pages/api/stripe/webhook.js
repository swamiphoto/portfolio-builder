// pages/api/stripe/webhook.js
import { getStripe } from '../../../common/stripe/client'
import { getOrder, saveOrder } from '../../../common/orders'
import { readSiteConfig } from '../../../common/siteConfig'
import { readUserProfile } from '../../../common/userProfile'
import { placeOrderForPaidOrder } from '../../../common/fulfillment/placeOrderForPaidOrder'

// IMPORTANT: print checkouts are DIRECT CHARGES on the photographer's connected
// account, so `checkout.session.completed` fires on the CONNECTED account — not
// the platform. This endpoint must be registered as a CONNECT-scoped webhook
// (Dashboard: "Listen to events on Connected accounts"). Locally, forward Connect
// events: `stripe listen --forward-connect-to localhost:3000/api/stripe/webhook`.
// A normal account-only endpoint will never receive these events and every paid
// order will stay stuck at `pending`.

export const config = { api: { bodyParser: false } }

async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return res.status(500).json({ error: 'STRIPE_WEBHOOK_SECRET not configured' })

  let event
  try {
    const raw = await readRawBody(req)
    event = getStripe().webhooks.constructEvent(raw, req.headers['stripe-signature'], secret)
  } catch (err) {
    console.error('stripe webhook signature failed', err.message)
    return res.status(400).json({ error: `Webhook signature verification failed` })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const { orderId, userId } = session.metadata || {}
      if (orderId && userId) {
        const order = await getOrder(userId, orderId)
        if (order && order.status === 'pending') {
          order.status = 'paid'
          if (!order.stripe) order.stripe = {}
          order.stripe.paymentIntentId = session.payment_intent || null
          await saveOrder(userId, order)

          // Resolve where to notify the photographer, then place the lab order.
          const [config, profile] = await Promise.all([
            readSiteConfig(userId).catch(() => null),
            readUserProfile(userId).catch(() => null),
          ])
          const photographerEmail =
            config?.clientDefaults?.notificationEmail ||
            config?.contact?.email ||
            profile?.email ||
            null
          const siteName = config?.siteName || 'your portfolio'
          await placeOrderForPaidOrder(order, { photographerEmail, siteName })
        }
      }
    }
    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('stripe webhook handler error', err)
    return res.status(500).json({ error: 'Webhook handler error' })
  }
}
