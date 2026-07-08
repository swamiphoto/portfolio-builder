// __tests__/import/fetchBatch.route.test.js
//
// Test-mechanic notes (deviations from brief):
// 1. Brief used `import { jest } from '@jest/globals'` — not used here; CJS-style Jest globals
//    match every other test in this project (e.g. discover.route.test.js, withAuth.test.js).
// 2. Brief used top-level `await import(...)` to load the handler after mocks. SWC/CJS Jest
//    does not support top-level await in test files. Replaced with a regular static import —
//    jest.mock() is hoisted above all imports by SWC, so mocks are in place before import runs.
// 3. Brief named mock fns `storeMock` and `fetchMock` (outside jest.mock factories). SWC hoist
//    only permits out-of-scope references whose name starts with "mock" to avoid TDZ errors.
//    Renamed to `mockStore` and `mockFetch`.
// 4. node-fetch v2 is CommonJS; mocked as `{ __esModule: true, default: (...a) => mockFetch(...a) }`.
//
// All assertions and behaviors from the brief are preserved.

jest.mock('@/common/withAuth', () => ({
  withAuth: (h) => (req, res) => h(req, res, { id: 'u1' }),
}))

const mockDownload = jest.fn().mockResolvedValue({ assets: {} })
jest.mock('@/common/gcsClient', () => ({
  downloadJSON: (...a) => mockDownload(...a),
}))

const mockStore = jest.fn()
jest.mock('@/common/storeImage', () => ({
  storeImageBuffer: (...a) => mockStore(...a),
}))

const mockFetch = jest.fn()
jest.mock('node-fetch', () => ({ __esModule: true, default: (...a) => mockFetch(...a) }))

import handler from '@/pages/api/admin/import/fetch-batch'

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
}

function okImage() {
  return {
    ok: true,
    headers: { get: () => 'image/jpeg' },
    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
  }
}

describe('POST /api/admin/import/fetch-batch', () => {
  beforeEach(() => {
    mockStore.mockReset()
    mockFetch.mockReset()
    mockDownload.mockReset()
    mockDownload.mockResolvedValue({ assets: {} })
  })

  it('downloads, stores, and returns imported assets; isolates failures', async () => {
    mockFetch.mockResolvedValueOnce(okImage()).mockRejectedValueOnce(new Error('boom'))
    mockStore.mockResolvedValue({ gcsUrl: 'https://cdn/u/photos/import/a.jpg', width: 100, height: 50 })

    const res = mockRes()
    await handler(
      {
        method: 'POST',
        body: {
          importBatchId: 'imp_x',
          provider: 'generic',
          label: 'joe.com',
          assetRefs: [
            { remoteUrl: 'https://remote/a.jpg', caption: 'A' },
            { remoteUrl: 'https://remote/b.jpg' },
          ],
        },
      },
      res
    )

    expect(res.status).toHaveBeenCalledWith(200)
    const payload = res.json.mock.calls[0][0]
    expect(payload.imported).toHaveLength(1)
    expect(payload.imported[0].source.provider).toBe('generic')
    expect(payload.failed).toEqual([{ remoteUrl: 'https://remote/b.jpg', reason: 'boom' }])
  })

  it('skips refs whose remoteUrl already exists in the library config', async () => {
    // Simulate an existing asset with a known sourceUrl
    mockDownload.mockResolvedValue({
      assets: {
        'asset-1': { source: { sourceUrl: 'https://remote/existing.jpg' } },
      },
    })
    mockFetch.mockResolvedValue(okImage())
    mockStore.mockResolvedValue({ gcsUrl: 'https://cdn/u/photos/import/new.jpg', width: 200, height: 100 })

    const res = mockRes()
    await handler(
      {
        method: 'POST',
        body: {
          importBatchId: 'imp_x',
          provider: 'generic',
          label: 'joe.com',
          assetRefs: [
            { remoteUrl: 'https://remote/existing.jpg' },
            { remoteUrl: 'https://remote/new.jpg' },
          ],
        },
      },
      res
    )

    expect(res.status).toHaveBeenCalledWith(200)
    const payload = res.json.mock.calls[0][0]
    expect(payload.imported).toHaveLength(1)
    expect(payload.skipped).toEqual(['https://remote/existing.jpg'])
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('400 when assetRefs is missing or not an array', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: { provider: 'generic' } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('400 when provider is missing', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: { assetRefs: [] } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('405 for non-POST methods', async () => {
    const res = mockRes()
    await handler({ method: 'GET', body: {} }, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })
})
