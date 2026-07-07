// common/fulfillment/prodigi.js
// Real Prodigi adapter. Pricing (getCost/getShippingQuote/getCatalog) delegates
// to the seed catalog for deterministic, offline-safe quotes — identical to the
// mock. Wiring live Prodigi quotes is a GO-LIVE gate (needs confirmed catalog
// pricing). placeOrder/getTracking hit the live sandbox API.
import { mockLabAdapter } from './mockLabAdapter'
import { mapSpecToProdigi } from './prodigiSkuMap'
import { prodigiFetch } from './prodigiClient'

// Prodigi shipment stage -> our fulfillment status.
function mapStage(stage) {
  if (stage === 'Complete' || stage === 'Shipped') return 'shipped'
  if (stage === 'Cancelled') return 'canceled'
  return 'placed'
}

function toRecipient(buyer) {
  const a = buyer.address || {}
  return {
    name: buyer.name || '',
    email: buyer.email || '',
    address: {
      line1: a.line1 || '',
      line2: a.line2 || '',
      postalOrZipCode: a.postalCode || '',
      countryCode: (a.country || 'US').toUpperCase(),
      townOrCity: a.townOrCity || a.city || '',
      stateOrCounty: a.stateOrCounty || a.region || '',
    },
  }
}

export const prodigiAdapter = {
  getCatalog: (...args) => mockLabAdapter.getCatalog(...args),
  getCost: (...args) => mockLabAdapter.getCost(...args),
  getShippingQuote: (...args) => mockLabAdapter.getShippingQuote(...args),

  async placeOrder(order) {
    const mapped = mapSpecToProdigi(order.spec)
    const body = {
      merchantReference: `${order.userId}:${order.id}`,
      shippingMethod: 'Standard',
      recipient: toRecipient(order.buyer),
      items: [
        {
          sku: mapped.sku,
          copies: mapped.copies,
          sizing: mapped.sizing,
          attributes: mapped.attributes,
          assets: [{ printArea: 'default', url: order.print?.imageUrl }],
        },
      ],
    }
    const out = await prodigiFetch('/v4.0/Orders', { method: 'POST', body })
    return { labOrderId: out.order.id, status: 'placed' }
  },

  async getTracking(labOrderId) {
    const out = await prodigiFetch(`/v4.0/Orders/${labOrderId}`)
    const order = out.order || {}
    const status = mapStage(order.status?.stage)
    const shipment = (order.shipments || [])[0]
    const tracking = shipment
      ? {
          carrier: shipment.carrier?.name || null,
          number: shipment.tracking?.number || null,
          url: shipment.tracking?.url || null,
        }
      : null
    return { status, tracking }
  },
}
