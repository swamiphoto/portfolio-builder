import { buildCheckoutSessionParams } from '../../common/stripe/checkout'

const order = {
  id: 'ord_1', userId: 'u1',
  buyer: { email: 'b@x.com' },
  spec: { size: '16x24' },
  amounts: { retail: 17000, shippingCost: 1200, applicationFee: 9400, currency: 'USD' },
}

it('builds a Connect checkout session params object', () => {
  const p = buildCheckoutSessionParams({ order, successUrl: 'https://s/print/confirmation', cancelUrl: 'https://s/x' })
  expect(p.mode).toBe('payment')
  expect(p.line_items).toHaveLength(2)
  expect(p.line_items[0].price_data.unit_amount).toBe(17000)
  expect(p.line_items[1].price_data.unit_amount).toBe(1200)
  expect(p.line_items[0].price_data.currency).toBe('usd')
  expect(p.payment_intent_data.application_fee_amount).toBe(9400)
  expect(p.customer_email).toBe('b@x.com')
  expect(p.metadata).toEqual({ orderId: 'ord_1', userId: 'u1' })
  expect(p.success_url).toBe('https://s/print/confirmation?session_id={CHECKOUT_SESSION_ID}')
  expect(p.cancel_url).toBe('https://s/x')
})
