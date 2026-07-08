// __tests__/import/discover.route.test.js
//
// Test-mechanic notes:
// 1. Brief used top-level `await import(...)` to load the handler after mocks.
//    This project's Jest (SWC/CJS transform) does not support top-level await in
//    test files. Replaced with a regular static import — jest.mock() is hoisted
//    above all imports by SWC, so mocks are in place before any import runs.
//
// 2. Brief used `discoverMock` as the mock fn variable name. SWC's jest-hoist only
//    permits out-of-scope references whose name starts with "mock". Renamed to
//    `mockDiscover` so the hoisted factory can reference it without a TDZ error.
//
// 3. Using CJS-style jest globals (no `import { jest }`) to match the pattern
//    established in other tests in this project (e.g. withAuth.test.js).
//
// All four behaviors from the brief are verified.

// Must mock withAuth's transitive deps to prevent next-auth/jose ESM parse errors.
jest.mock('@/common/withAuth', () => ({
  withAuth: (h) => (req, res) => h(req, res, { id: 'u1' }),
}))

const mockDiscover = jest.fn()
jest.mock('@/common/import/adapters', () => ({
  PROVIDERS: { SMUGMUG: 'smugmug', GENERIC: 'generic' },
  detectAdapter: () => ({ id: 'generic', enabled: true, discover: mockDiscover }),
  getAdapter: () => ({ id: 'generic', enabled: true, discover: mockDiscover }),
}))

import handler from '@/pages/api/admin/import/discover'

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
}

describe('POST /api/admin/import/discover', () => {
  beforeEach(() => mockDiscover.mockReset())

  it('400 on empty input', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: {} }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns the discovery tree with a total count', async () => {
    mockDiscover.mockResolvedValue({
      site: { title: 'Joe', url: 'https://joe.com/' },
      collections: [{ id: 'travel', name: 'Travel', assetRefs: [{ remoteUrl: 'x' }, { remoteUrl: 'y' }] }],
    })
    const res = mockRes()
    await handler({ method: 'POST', body: { input: 'joe.com' } }, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ provider: 'generic', totalAssets: 2 }))
  })

  it('422 when nothing found', async () => {
    mockDiscover.mockResolvedValue({ site: { title: 'x', url: 'x' }, collections: [] })
    const res = mockRes()
    await handler({ method: 'POST', body: { input: 'joe.com' } }, res)
    expect(res.status).toHaveBeenCalledWith(422)
  })

  it('405 for non-POST methods', async () => {
    const res = mockRes()
    await handler({ method: 'GET', body: {} }, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })
})
