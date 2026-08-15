/** @jest-environment node */
//
// Handler-level test: asserts the upload-file response includes EXIF `capture`
// metadata alongside the existing storeImageBuffer result. storeImageBuffer
// itself is mocked (it talks to R2); extractCapture runs for real against a
// fixture buffer with known EXIF, mirroring __tests__/import/fetchBatch.route.test.js's
// mocking style for the sibling import route.

import fs from 'fs'
import path from 'path'

const mockStore = jest.fn()
jest.mock('../../common/storeImage', () => ({
  storeImageBuffer: (...a) => mockStore(...a),
}))

import { handler } from '../../pages/api/admin/upload-file'

const FIXTURES = path.join(__dirname, '..', 'fixtures')
const WITH_EXIF = fs.readFileSync(path.join(FIXTURES, 'with-exif.jpg'))
const NO_EXIF = fs.readFileSync(path.join(FIXTURES, 'no-exif.jpg'))
const USER = { id: 'u1' }

function mockReq({ buffer, query }) {
  return {
    method: 'POST',
    query,
    [Symbol.asyncIterator]: async function* () { yield buffer },
  }
}

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
}

describe('POST /api/admin/upload-file', () => {
  beforeEach(() => {
    mockStore.mockReset()
    mockStore.mockResolvedValue({ gcsUrl: 'https://cdn/u/photos/library/a.jpg', objectPath: 'u/photos/library/a.jpg', width: 8, height: 8, hash: 'etag123' })
  })

  it('includes extracted EXIF capture metadata in the response', async () => {
    const req = mockReq({ buffer: WITH_EXIF, query: { filename: 'a.jpg', contentType: 'image/jpeg' } })
    const res = mockRes()
    await handler(req, res, USER)

    expect(res.status).toHaveBeenCalledWith(200)
    const payload = res.json.mock.calls[0][0]
    expect(payload.gcsUrl).toBe('https://cdn/u/photos/library/a.jpg')
    expect(payload.capture).toEqual(
      expect.objectContaining({
        cameraMake: 'Canon',
        cameraModel: 'EOS R5',
        aperture: 'f/2.8',
        shutterSpeed: '1/200s',
        iso: 400,
      })
    )
  })

  it('returns capture: null for an image with no EXIF, without failing the upload', async () => {
    const req = mockReq({ buffer: NO_EXIF, query: { filename: 'b.jpg', contentType: 'image/jpeg' } })
    const res = mockRes()
    await handler(req, res, USER)

    expect(res.status).toHaveBeenCalledWith(200)
    const payload = res.json.mock.calls[0][0]
    expect(payload.capture).toBeNull()
  })

  it('skips EXIF extraction for non-image content types', async () => {
    const req = mockReq({ buffer: Buffer.from('irrelevant'), query: { filename: 'x.pdf', contentType: 'application/pdf' } })
    const res = mockRes()
    await handler(req, res, USER)

    expect(res.status).toHaveBeenCalledWith(200)
    const payload = res.json.mock.calls[0][0]
    expect(payload.capture).toBeNull()
  })

  it('400 when filename or contentType is missing', async () => {
    const req = mockReq({ buffer: Buffer.alloc(0), query: {} })
    const res = mockRes()
    await handler(req, res, USER)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('405 for non-POST methods', async () => {
    const res = mockRes()
    await handler({ method: 'GET' }, res, USER)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('500 when storeImageBuffer fails, and never throws out of the handler', async () => {
    mockStore.mockRejectedValue(new Error('r2 down'))
    const req = mockReq({ buffer: WITH_EXIF, query: { filename: 'a.jpg', contentType: 'image/jpeg' } })
    const res = mockRes()
    await handler(req, res, USER)
    expect(res.status).toHaveBeenCalledWith(500)
  })
})
