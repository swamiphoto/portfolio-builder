// common/fulfillment/router.js
// Selects a lab adapter. Returns the real Prodigi adapter when PRODIGI_API_KEY
// is configured (Prodigi ships worldwide); otherwise the deterministic mock so
// dev/test work offline. WHCC (US) can be added later behind the same interface.
import { mockLabAdapter } from './mockLabAdapter'
import { prodigiAdapter } from './prodigi'

export function getAdapterForCountry(_country) {
  return process.env.PRODIGI_API_KEY ? prodigiAdapter : mockLabAdapter
}
