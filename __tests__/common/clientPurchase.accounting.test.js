// __tests__/common/clientPurchase.accounting.test.js
import { resolveDownloadAccess, grantEntitlement, viewerPurchaseState } from '@/common/clientPurchase'

// Two devices belong to the same person (same email, different case).
const baseData = () => ({
  people: {
    d1: { name: 'Mia', email: 'Mia@x.com' },
    d2: { name: 'Mia', email: 'mia@x.com' },
    dz: { name: 'Other', email: 'z@x.com' },
  },
  downloads: [
    { photoUrl: 'a.jpg', deviceId: 'd1', quality: 'display', ts: 1 },
    { photoUrl: 'a.jpg', deviceId: 'd1', quality: 'original', ts: 2 }, // same photo, other quality
    { photoUrl: 'b.jpg', deviceId: 'd2', quality: 'display', ts: 3 },  // cross-device, same email
    { photoUrl: 'q.jpg', deviceId: 'dz', quality: 'display', ts: 4 },  // someone else
  ],
  entitlements: {},
})

describe('resolveDownloadAccess', () => {
  it('re-download of an already-unlocked photo is always allowed', () => {
    const r = resolveDownloadAccess({ data: baseData(), email: 'mia@x.com', photoUrl: 'a.jpg', freeAllowance: 0 })
    expect(r).toEqual({ allowed: true, reason: 'already-unlocked' })
  })

  it('counts distinct photos across devices sharing an email (a.jpg + b.jpg = 2 used)', () => {
    // freeAllowance 2, both already used -> a NEW photo is blocked
    const r = resolveDownloadAccess({ data: baseData(), email: 'mia@x.com', photoUrl: 'c.jpg', freeAllowance: 2 })
    expect(r).toEqual({ allowed: false, reason: 'paywall' })
  })

  it('allows a new photo while under the ceiling', () => {
    const r = resolveDownloadAccess({ data: baseData(), email: 'mia@x.com', photoUrl: 'c.jpg', freeAllowance: 3 })
    expect(r).toEqual({ allowed: true, reason: 'within-ceiling' })
  })

  it('purchased credits raise the ceiling', () => {
    const data = baseData()
    data.entitlements['mia@x.com'] = { credits: 5, all: false, orders: ['o1'], updatedAt: 1 }
    const r = resolveDownloadAccess({ data, email: 'mia@x.com', photoUrl: 'c.jpg', freeAllowance: 0 })
    expect(r.allowed).toBe(true) // ceiling 5, 2 used
  })

  it('an "all" entitlement unlocks any new photo', () => {
    const data = baseData()
    data.entitlements['mia@x.com'] = { credits: 0, all: true, orders: ['o1'], updatedAt: 1 }
    const r = resolveDownloadAccess({ data, email: 'mia@x.com', photoUrl: 'zzz.jpg', freeAllowance: 0 })
    expect(r).toEqual({ allowed: true, reason: 'entitled-all' })
  })

  it('blocks when there is no email', () => {
    const r = resolveDownloadAccess({ data: baseData(), email: '', photoUrl: 'c.jpg', freeAllowance: 5 })
    expect(r).toEqual({ allowed: false, reason: 'no-email' })
  })
})

describe('grantEntitlement', () => {
  it('adds numeric credits and records the order', () => {
    const d = grantEntitlement(baseData(), { email: 'Mia@x.com', credits: 10, orderId: 'o1' })
    expect(d.entitlements['mia@x.com']).toMatchObject({ credits: 10, all: false, orders: ['o1'] })
  })

  it('stacks credits across purchases', () => {
    let d = grantEntitlement(baseData(), { email: 'mia@x.com', credits: 10, orderId: 'o1' })
    d = grantEntitlement(d, { email: 'mia@x.com', credits: 10, orderId: 'o2' })
    expect(d.entitlements['mia@x.com'].credits).toBe(20)
  })

  it('an "all" grant overrides the numeric count', () => {
    const d = grantEntitlement(baseData(), { email: 'mia@x.com', credits: 'all', orderId: 'o1' })
    expect(d.entitlements['mia@x.com'].all).toBe(true)
  })

  it('is idempotent by orderId', () => {
    let d = grantEntitlement(baseData(), { email: 'mia@x.com', credits: 10, orderId: 'o1' })
    d = grantEntitlement(d, { email: 'mia@x.com', credits: 10, orderId: 'o1' }) // replay
    expect(d.entitlements['mia@x.com'].credits).toBe(10)
    expect(d.entitlements['mia@x.com'].orders).toEqual(['o1'])
  })
})

describe('viewerPurchaseState', () => {
  it('summarizes unlocked photos + remaining for the viewer', () => {
    const data = baseData()
    data.entitlements['mia@x.com'] = { credits: 5, all: false, orders: ['o1'], updatedAt: 1 }
    const s = viewerPurchaseState({ data, email: 'mia@x.com', freeAllowance: 0 })
    expect(s.unlockedUrls.sort()).toEqual(['a.jpg', 'b.jpg'])
    expect(s.unlockedCount).toBe(2)
    expect(s.ceiling).toBe(5)
    expect(s.all).toBe(false)
    expect(s.remaining).toBe(3)
  })

  it('reports remaining Infinity-like via all=true', () => {
    const data = baseData()
    data.entitlements['mia@x.com'] = { credits: 0, all: true, orders: ['o1'], updatedAt: 1 }
    const s = viewerPurchaseState({ data, email: 'mia@x.com', freeAllowance: 2 })
    expect(s.all).toBe(true)
    expect(s.remaining).toBe(null) // null == unlimited
  })
})
