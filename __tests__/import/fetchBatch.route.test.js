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
//    Renamed to `mockStore` and `mockSafeFetch`.
// 4. Route now calls safeFetch (from @/common/import/safeFetch), not node-fetch directly.

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

const mockSafeFetch = jest.fn()
jest.mock('@/common/import/safeFetch', () => ({ safeFetch: (...a) => mockSafeFetch(...a) }))

const mockExtractCapture = jest.fn()
jest.mock('@/common/exifCapture', () => ({ extractCapture: (...a) => mockExtractCapture(...a) }))

import handler from '@/pages/api/admin/import/fetch-batch'

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
}

function okImage() {
  return {
    ok: true,
    headers: { get: (h) => (h === 'content-type' ? 'image/jpeg' : h === 'content-length' ? '1000' : null) },
    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
  }
}

describe('POST /api/admin/import/fetch-batch', () => {
  beforeEach(() => {
    mockStore.mockReset()
    mockSafeFetch.mockReset()
    mockDownload.mockReset()
    mockDownload.mockResolvedValue({ assets: {} })
    mockExtractCapture.mockReset()
    mockExtractCapture.mockResolvedValue(null)
  })

  it('downloads, stores, and returns imported assets; isolates failures', async () => {
    mockSafeFetch.mockResolvedValueOnce(okImage()).mockRejectedValueOnce(new Error('boom'))
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

  it('extracts EXIF capture from the downloaded bytes and persists it on the imported asset', async () => {
    const capture = {
      capturedAt: '2024-06-15T21:30:00.000Z',
      timezone: null,
      cameraMake: 'Canon',
      cameraModel: 'EOS R5',
      lens: 'RF 24-70mm F2.8',
      focalLengthMm: 50,
      aperture: 'f/2.8',
      shutterSpeed: '1/200s',
      iso: 400,
      locationName: null,
      latitude: null,
      longitude: null,
    }
    mockExtractCapture.mockResolvedValue(capture)
    mockSafeFetch.mockResolvedValue(okImage())
    mockStore.mockResolvedValue({ gcsUrl: 'https://cdn/u/photos/import/exif.jpg', width: 100, height: 50 })

    const res = mockRes()
    await handler(
      {
        method: 'POST',
        body: {
          provider: 'generic',
          assetRefs: [{ remoteUrl: 'https://remote/exif.jpg' }],
        },
      },
      res
    )

    expect(res.status).toHaveBeenCalledWith(200)
    expect(mockExtractCapture).toHaveBeenCalledTimes(1)
    expect(Buffer.isBuffer(mockExtractCapture.mock.calls[0][0])).toBe(true)
    const payload = res.json.mock.calls[0][0]
    expect(payload.imported).toHaveLength(1)
    expect(payload.imported[0].capture).toEqual(capture)
  })

  it('skips refs whose remoteUrl already exists in the library config', async () => {
    // Simulate an existing asset with a known sourceUrl
    mockDownload.mockResolvedValue({
      assets: {
        'asset-1': { source: { sourceUrl: 'https://remote/existing.jpg' } },
      },
    })
    mockSafeFetch.mockResolvedValue(okImage())
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
    expect(mockSafeFetch).toHaveBeenCalledTimes(1)
  })

  it('skips a ref whose downloaded bytes hash-match an existing library asset', async () => {
    mockDownload.mockResolvedValue({
      assets: {
        'asset-1': { source: { sourceUrl: 'https://remote/other-url.jpg' }, hashes: { exact: 'dup-hash' } },
      },
    })
    mockSafeFetch.mockResolvedValue(okImage())
    mockStore.mockResolvedValue({ gcsUrl: 'https://cdn/u/photos/import/new.jpg', width: 200, height: 100, hash: 'dup-hash' })

    const res = mockRes()
    await handler(
      {
        method: 'POST',
        body: {
          provider: 'generic',
          assetRefs: [{ remoteUrl: 'https://remote/variant.jpg' }],
        },
      },
      res
    )

    expect(res.status).toHaveBeenCalledWith(200)
    const payload = res.json.mock.calls[0][0]
    expect(payload.imported).toHaveLength(0)
    expect(payload.skipped).toEqual(['https://remote/variant.jpg'])
  })

  it('skips the second ref in the same batch when its bytes hash-match an already-imported ref', async () => {
    mockDownload.mockResolvedValue({ assets: {} })
    mockSafeFetch.mockResolvedValue(okImage())
    mockStore.mockResolvedValue({ gcsUrl: 'https://cdn/u/photos/import/same.jpg', width: 200, height: 100, hash: 'same-hash' })

    const res = mockRes()
    await handler(
      {
        method: 'POST',
        body: {
          provider: 'generic',
          assetRefs: [
            { remoteUrl: 'https://remote/variant-a.jpg' },
            { remoteUrl: 'https://remote/variant-b.jpg' },
          ],
        },
      },
      res
    )

    expect(res.status).toHaveBeenCalledWith(200)
    const payload = res.json.mock.calls[0][0]
    expect(payload.imported).toHaveLength(1)
    expect(payload.imported[0].source.sourceUrl).toBe('https://remote/variant-a.jpg')
    expect(payload.skipped).toEqual(['https://remote/variant-b.jpg'])
  })

  it('imports by remoteUrl even when the ref carries a thumbUrl — thumbUrl is UI-only and is never fetched', async () => {
    mockSafeFetch.mockResolvedValue(okImage())
    mockStore.mockResolvedValue({ gcsUrl: 'https://cdn/u/photos/import/full.jpg', width: 100, height: 50 })

    const res = mockRes()
    await handler(
      {
        method: 'POST',
        body: {
          provider: 'generic',
          assetRefs: [{ remoteUrl: 'https://remote/full.jpg', thumbUrl: 'https://remote/thumb.jpg' }],
        },
      },
      res
    )

    expect(res.status).toHaveBeenCalledWith(200)
    // fetchImage is only ever called with remoteUrl (plus originalUrlCandidates
    // guesses derived from it) — thumbUrl must never reach safeFetch.
    expect(mockSafeFetch).toHaveBeenCalledWith('https://remote/full.jpg')
    expect(mockSafeFetch).not.toHaveBeenCalledWith('https://remote/thumb.jpg')
    const payload = res.json.mock.calls[0][0]
    expect(payload.imported).toHaveLength(1)
    expect(payload.imported[0].source.sourceUrl).toBe('https://remote/full.jpg')
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

  it('400 when assetRefs exceeds MAX_BATCH (51 refs)', async () => {
    const assetRefs = Array.from({ length: 51 }, (_, i) => ({ remoteUrl: `https://remote/${i}.jpg` }))
    const res = mockRes()
    await handler({ method: 'POST', body: { provider: 'generic', assetRefs } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
    const payload = res.json.mock.calls[0][0]
    expect(payload.error).toBe('batch too large')
  })

  it('puts oversized image in failed (content-length exceeds MAX_IMPORT_BYTES)', async () => {
    mockSafeFetch.mockResolvedValue({
      ok: true,
      headers: { get: (h) => (h === 'content-type' ? 'image/jpeg' : h === 'content-length' ? '999999999' : null) },
      arrayBuffer: async () => new Uint8Array([1]).buffer,
    })
    mockStore.mockResolvedValue({ gcsUrl: 'https://cdn/u/photos/import/big.jpg', width: 100, height: 50 })

    const res = mockRes()
    await handler(
      {
        method: 'POST',
        body: {
          provider: 'generic',
          assetRefs: [{ remoteUrl: 'https://remote/big.jpg' }],
        },
      },
      res
    )

    expect(res.status).toHaveBeenCalledWith(200)
    const payload = res.json.mock.calls[0][0]
    expect(payload.imported).toHaveLength(0)
    expect(payload.failed).toHaveLength(1)
    expect(payload.failed[0].reason).toMatch(/image too large/)
  })
})
