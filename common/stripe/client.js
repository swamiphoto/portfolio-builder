// Lazy platform Stripe client (server-side only).
import Stripe from 'stripe'

let _stripe = null
export function getStripe() {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
    _stripe = new Stripe(key, { apiVersion: '2024-06-20' })
  }
  return _stripe
}
