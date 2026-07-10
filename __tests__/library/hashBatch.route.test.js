// __tests__/library/hashBatch.route.test.js
//
// Test-mechanic notes (deviations from brief):
// 1. Brief used `import { jest } from '@jest/globals'` — not used here; CJS-style Jest globals
//    match every other test in this project (e.g. discover.route.test.js, fetchBatch.route.test.js).
// 2. Brief used top-level `await import(...)` to load the handler after mocks. SWC/CJS Jest
//    does not support top-level await in test files. Replaced with a regular static import —
//    jest.mock() is hoisted above all imports by SWC, so mocks are in place before import runs.
// 3. All mock fn variables already use the "mock" prefix (mockSafeFetch) so SWC hoist works correctly.

jest.mock('@/common/withAuth', () => ({
  withAuth: (h) => (req, res) => h(req, res, { id: 'u1' }),
}))

const mockSafeFetch = jest.fn()
jest.mock('@/common/import/safeFetch', () => ({ safeFetch: (...a) => mockSafeFetch(...a) }))

import handler from '@/pages/api/admin/dedup/hash-batch'

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
}

describe('POST /api/admin/dedup/hash-batch', () => {
  beforeEach(() => mockSafeFetch.mockReset())

  it('hashes each item and isolates failures', async () => {
    mockSafeFetch
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer })
      .mockRejectedValueOnce(new Error('boom'))
    const res = mockRes()
    await handler({ method: 'POST', body: { items: [{ assetId: 'a', url: 'https://x/a.jpg' }, { assetId: 'b', url: 'https://x/b.jpg' }] } }, res)
    expect(res.status).toHaveBeenCalledWith(200)
    const p = res.json.mock.calls[0][0]
    expect(p.hashed).toHaveLength(1)
    expect(p.hashed[0]).toMatchObject({ assetId: 'a' })
    expect(p.hashed[0].hash).toMatch(/^[0-9a-f]{64}$/)
    expect(p.failed).toEqual([{ assetId: 'b', reason: 'boom' }])
  })

  it('400 on oversized batch', async () => {
    const items = Array.from({ length: 51 }, (_, i) => ({ assetId: String(i), url: 'x' }))
    const res = mockRes()
    await handler({ method: 'POST', body: { items } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })
})
