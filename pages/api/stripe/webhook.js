// pages/api/stripe/webhook.js
import { getStripe } from '../../../common/stripe/client'
import { getOrder, saveOrder } from '../../../common/orders'

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
        }
      }
    }
    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('stripe webhook handler error', err)
    return res.status(500).json({ error: err.message })
  }
}
