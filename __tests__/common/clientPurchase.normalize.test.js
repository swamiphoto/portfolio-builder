// __tests__/common/clientPurchase.normalize.test.js
import { normalizePurchaseConfig } from '@/common/clientPurchase'

describe('normalizePurchaseConfig', () => {
  it('fills defaults from empty/undefined', () => {
    expect(normalizePurchaseConfig(undefined)).toEqual({
      enabled: false, freeAllowance: 0, packages: [],
    })
  })

  it('coerces freeAllowance to a non-negative integer', () => {
    expect(normalizePurchaseConfig({ freeAllowance: 3.9 }).freeAllowance).toBe(3)
    expect(normalizePurchaseConfig({ freeAllowance: -5 }).freeAllowance).toBe(0)
    expect(normalizePurchaseConfig({ freeAllowance: 'x' }).freeAllowance).toBe(0)
  })

  it('keeps well-formed packages and preserves ids', () => {
    const p = normalizePurchaseConfig({
      enabled: true,
      packages: [
        { id: 'pkg_a', label: '10 more', credits: 10, price: 4000 },
        { id: 'pkg_b', label: 'Everything', credits: 'all', price: 15000 },
      ],
    })
    expect(p.enabled).toBe(true)
    expect(p.packages).toEqual([
      { id: 'pkg_a', label: '10 more', credits: 10, price: 4000 },
      { id: 'pkg_b', label: 'Everything', credits: 'all', price: 15000 },
    ])
  })

  it('drops malformed packages and coerces types', () => {
    const p = normalizePurchaseConfig({
      packages: [
        { id: 'ok', label: 'Ten', credits: '10', price: '4000' }, // stringy -> coerced
        { label: 'no id', credits: 5, price: 100 },                // missing id -> pkg_1 fallback
        { id: 'bad1', label: 'zero credits', credits: 0, price: 100 },   // invalid
        { id: 'bad2', label: 'neg price', credits: 2, price: -1 },       // invalid
        { id: 'bad3', label: 'weird credits', credits: 'lots', price: 100 }, // invalid
      ],
    })
    expect(p.packages).toEqual([
      { id: 'ok', label: 'Ten', credits: 10, price: 4000 },
      { id: 'pkg_1', label: 'no id', credits: 5, price: 100 },
    ])
  })
})
