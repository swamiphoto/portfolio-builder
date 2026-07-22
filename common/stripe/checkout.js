// Pure: build the Stripe Checkout Session params for a print order. The connected
// account id is passed by the route as a request option, not here.
export function buildCheckoutSessionParams({ order, successUrl, cancelUrl }) {
  const { amounts, spec, id, userId, buyer } = order
  const currency = (amounts.currency || 'USD').toLowerCase()
  return {
    mode: 'payment',
    line_items: [
      { price_data: { currency, unit_amount: amounts.retail, product_data: { name: `Fine art print — ${spec.size}` } }, quantity: 1 },
      { price_data: { currency, unit_amount: amounts.shippingCost, product_data: { name: 'Shipping' } }, quantity: 1 },
    ],
    payment_intent_data: { application_fee_amount: amounts.applicationFee },
    customer_email: buyer?.email,
    metadata: { orderId: id, userId },
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
  }
}

// Pure: build the Stripe Checkout Session params for a digital (download)
// purchase. One line item, no shipping. The connected account id is passed by
// the route as a request option, not here. success/cancel URLs are fully
// formed by the route (they already carry any query the return handler needs).
export function buildDigitalCheckoutSessionParams({ order, successUrl, cancelUrl }) {
  const { amounts, id, userId, pageId, label, buyer } = order
  const currency = (amounts.currency || 'USD').toLowerCase()
  return {
    mode: 'payment',
    line_items: [
      { price_data: { currency, unit_amount: amounts.retail, product_data: { name: label } }, quantity: 1 },
    ],
    payment_intent_data: { application_fee_amount: amounts.applicationFee },
    customer_email: buyer?.email,
    metadata: { orderId: id, userId, pageId, email: buyer?.email, type: 'digital' },
    success_url: successUrl,
    cancel_url: cancelUrl,
  }
}
