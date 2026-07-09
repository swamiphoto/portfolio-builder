// Curated placeholder catalog with representative costs. Plan 3 replaces the
// data source with live WHCC/Prodigi catalogs behind the same shape.

export const SEED_CATALOG = {
  currency: 'USD',
  finishes: [
    { id: 'lustre', label: 'Lustre paper' },
    { id: 'matte', label: 'Matte paper' },
    { id: 'metal', label: 'Metal' },
  ],
  sizes: [
    { id: '8x10', label: '8 × 10 in', wIn: 8, hIn: 10, cost: { lustre: 6, matte: 6, metal: 24 } },
    { id: '11x14', label: '11 × 14 in', wIn: 11, hIn: 14, cost: { lustre: 10, matte: 10, metal: 40 } },
    { id: '16x20', label: '16 × 20 in', wIn: 16, hIn: 20, cost: { lustre: 18, matte: 18, metal: 70 } },
    { id: '16x24', label: '16 × 24 in', wIn: 16, hIn: 24, cost: { lustre: 22, matte: 22, metal: 85 } },
    { id: '24x36', label: '24 × 36 in', wIn: 24, hIn: 36, cost: { lustre: 40, matte: 40, metal: 150 } },
  ],
  frames: [
    { id: 'none', label: 'No frame', colors: [], cost: 0 },
    { id: 'wood', label: 'Wood frame', colors: ['black', 'white', 'natural', 'walnut'], cost: 35 },
    { id: 'metal', label: 'Metal frame', colors: ['black', 'silver'], cost: 45 },
  ],
  matte: { available: true, cost: 8 },
}
