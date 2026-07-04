// Selects a lab adapter by destination country. Plan 3 will route
// US -> WHCC and everything else -> Prodigi. v1 always returns the mock.
import { mockLabAdapter } from './mockLabAdapter'

export function getAdapterForCountry(_country) {
  return mockLabAdapter
}
