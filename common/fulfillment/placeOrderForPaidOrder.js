// common/fulfillment/placeOrderForPaidOrder.js
// Idempotent: place a paid order with the lab, persist, notify the photographer.
// Never throws — the buyer already paid; failures are recorded for retry.
import { getAdapterForCountry } from './router'
import { saveOrder } from '../orders'
import { sendMail } from '../email/mailer'
import { photographerSaleEmail } from '../email/templates'

export async function placeOrderForPaidOrder(order, { photographerEmail, siteName } = {}) {
  if (order.fulfillment && order.fulfillment.labOrderId) return order // already placed

  const adapter = getAdapterForCountry(order.buyer?.address?.country)
  try {
    const { labOrderId, status } = await adapter.placeOrder(order)
    order.status = 'placed'
    order.fulfillment = { ...(order.fulfillment || {}), lab: 'prodigi', labOrderId, status: status || 'placed' }
    await saveOrder(order.userId, order)
    if (photographerEmail) {
      try {
        const msg = photographerSaleEmail({ order, siteName: siteName || 'your portfolio' })
        await sendMail({ to: photographerEmail, ...msg })
      } catch (mailErr) {
        console.error('photographer email failed', mailErr.message)
      }
    }
    return order
  } catch (err) {
    console.error('prodigi placement failed', err.message)
    order.status = 'fulfillment_failed'
    order.fulfillment = { ...(order.fulfillment || {}), status: 'failed', error: err.message }
    await saveOrder(order.userId, order)
    return order
  }
}
