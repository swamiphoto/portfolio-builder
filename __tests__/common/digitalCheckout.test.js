// __tests__/common/digitalCheckout.test.js
import { buildDigitalCheckoutSessionParams } from '@/common/stripe/checkout'

const order = {
  id: 'ord_1', userId: 'u1', pageId: 'p1', label: 'Entire gallery',
  amounts: { retail: 15000, applicationFee: 1500, currency: 'USD' },
  buyer: { email: 'mia@x.com' },
}

it('builds a single-line-item digital session with the platform fee + metadata', () => {
  const params = buildDigitalCheckoutSessionParams({
    order, successUrl: 'https://site/gallery?purchase=success', cancelUrl: 'https://site/gallery',
  })
  expect(params.mode).toBe('payment')
  expect(params.line_items).toEqual([
    { price_data: { currency: 'usd', unit_amount: 15000, product_data: { name: 'Entire gallery' } }, quantity: 1 },
  ])
  expect(params.payment_intent_data).toEqual({ application_fee_amount: 1500 })
  expect(params.customer_email).toBe('mia@x.com')
  expect(params.metadata).toEqual({ orderId: 'ord_1', userId: 'u1', pageId: 'p1', email: 'mia@x.com', type: 'digital' })
  expect(params.success_url).toBe('https://site/gallery?purchase=success')
  expect(params.cancel_url).toBe('https://site/gallery')
})
