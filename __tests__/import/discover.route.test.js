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
const mockGenericDiscover = jest.fn()

let mockDetectAdapter = jest.fn(() => ({ id: 'generic', enabled: true, discover: mockDiscover }))
let mockGetAdapter = jest.fn((id) =>
  id === 'generic'
    ? { id: 'generic', enabled: true, discover: mockGenericDiscover }
    : { id: 'generic', enabled: true, discover: mockDiscover }
)

jest.mock('@/common/import/adapters', () => ({
  PROVIDERS: { SMUGMUG: 'smugmug', GENERIC: 'generic' },
  get detectAdapter() { return mockDetectAdapter },
  get getAdapter() { return mockGetAdapter },
}))

// discover.js tries smugmugWeb before falling through to the generic adapter.
// Default: reject with the typed "not SmugMug" signal so every existing
// generic-path test below falls straight through to its generic mock exactly
// as before. Tests that care about the smugmugWeb-succeeds path override this.
class FakeNotSmugMugError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotSmugMugError'
  }
}
const mockSmugmugWebDiscover = jest.fn()
jest.mock('@/common/import/adapters/smugmugWeb', () => ({
  __esModule: true,
  default: { id: 'smugmug', get discover() { return mockSmugmugWebDiscover } },
}))

import handler from '@/pages/api/admin/import/discover'

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
}

describe('POST /api/admin/import/discover', () => {
  beforeEach(() => {
    mockDiscover.mockReset()
    mockGenericDiscover.mockReset()
    mockDetectAdapter.mockClear()
    mockGetAdapter.mockClear()
    mockSmugmugWebDiscover.mockReset()
    mockSmugmugWebDiscover.mockRejectedValue(new FakeNotSmugMugError('not smugmug'))
  })

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

  it('502 when discovery throws', async () => {
    mockDiscover.mockRejectedValue(new Error('network timeout'))
    const res = mockRes()
    await handler({ method: 'POST', body: { input: 'joe.com' } }, res)
    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'discovery_failed' })
    )
  })

  it('falls back to the generic adapter when a non-generic adapter throws (e.g. SmugMug API key dead/unset)', async () => {
    mockDetectAdapter.mockReturnValueOnce({ id: 'smugmug', enabled: true, discover: mockDiscover })
    mockDiscover.mockRejectedValue(new Error('SMUGMUG_API_KEY not configured'))
    mockGenericDiscover.mockResolvedValue({
      site: { title: 'Sam', url: 'https://sam.smugmug.com/' },
      collections: [{ id: 'home', name: 'Home', assetRefs: [{ remoteUrl: 'x' }] }],
    })
    const res = mockRes()
    await handler({ method: 'POST', body: { input: 'sam.smugmug.com' } }, res)
    expect(mockGetAdapter).toHaveBeenCalledWith('generic')
    expect(mockGenericDiscover).toHaveBeenCalledWith('sam.smugmug.com')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ provider: 'generic', totalAssets: 1 }))
  })

  it('502 when the non-generic adapter AND the generic fallback both throw', async () => {
    mockDetectAdapter.mockReturnValueOnce({ id: 'smugmug', enabled: true, discover: mockDiscover })
    mockDiscover.mockRejectedValue(new Error('SMUGMUG_API_KEY not configured'))
    mockGenericDiscover.mockRejectedValue(new Error('network timeout'))
    const res = mockRes()
    await handler({ method: 'POST', body: { input: 'sam.smugmug.com' } }, res)
    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'discovery_failed' }))
  })

  it('keyless SmugMug routing: a smugmug.com URL with no SMUGMUG_API_KEY resolves via detectAdapter to generic, and the route tries smugmugWeb before the generic crawler', async () => {
    // With SMUGMUG_API_KEY unset, smugmug.enabled is false, so the real
    // detectAdapter registry never selects it — it falls through to generic
    // (see adapters.test.js). Simulate that resolution here and prove the route
    // still gets a full SmugMug import via smugmugWeb, never touching the
    // generic crawler.
    mockDetectAdapter.mockReturnValueOnce({ id: 'generic', enabled: true, discover: mockDiscover })
    mockSmugmugWebDiscover.mockResolvedValue({
      site: { title: 'sam', url: 'https://sam.smugmug.com/' },
      collections: [{ id: 'Qh7WPB', name: 'USA Landscape', assetRefs: [{ remoteUrl: 'x' }, { remoteUrl: 'y' }] }],
    })
    const res = mockRes()
    await handler({ method: 'POST', body: { input: 'sam.smugmug.com' } }, res)
    expect(mockSmugmugWebDiscover).toHaveBeenCalledWith('sam.smugmug.com')
    expect(mockDiscover).not.toHaveBeenCalled()
    expect(mockGenericDiscover).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ provider: 'smugmug', totalAssets: 2 }))
  })

  it('400 when adapter is disabled', async () => {
    mockDetectAdapter.mockReturnValueOnce({ id: 'generic', enabled: false, discover: mockDiscover })
    const res = mockRes()
    await handler({ method: 'POST', body: { input: 'joe.com' } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'unsupported_source' })
    )
  })
})
