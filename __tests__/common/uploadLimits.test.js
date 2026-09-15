import { isAcceptedUploadType, MAX_UPLOAD_BYTES, ACCEPTED_SHARP_FORMATS } from '../../common/uploadLimits'

describe('isAcceptedUploadType', () => {
  it('accepts web image types', () => {
    for (const t of ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']) {
      expect(isAcceptedUploadType(t)).toBe(true)
    }
  })

  it('is case-insensitive and ignores parameters', () => {
    expect(isAcceptedUploadType('IMAGE/JPEG')).toBe(true)
    expect(isAcceptedUploadType('image/jpeg; charset=binary')).toBe(true)
  })

  it('rejects RAW / TIFF / PSD and unknown types', () => {
    for (const t of ['image/tiff', 'image/x-canon-cr2', 'image/x-nikon-nef', 'image/x-sony-arw', 'image/vnd.adobe.photoshop', 'application/octet-stream', '', undefined, null]) {
      expect(isAcceptedUploadType(t)).toBe(false)
    }
  })
})

describe('upload limits', () => {
  it('caps uploads at 50MB', () => {
    expect(MAX_UPLOAD_BYTES).toBe(50 * 1024 * 1024)
  })

  it('accepted decoded formats are web-only (no tiff/gif/svg)', () => {
    expect(ACCEPTED_SHARP_FORMATS.has('jpeg')).toBe(true)
    expect(ACCEPTED_SHARP_FORMATS.has('heif')).toBe(true)
    expect(ACCEPTED_SHARP_FORMATS.has('tiff')).toBe(false)
    expect(ACCEPTED_SHARP_FORMATS.has('gif')).toBe(false)
    expect(ACCEPTED_SHARP_FORMATS.has('svg')).toBe(false)
  })
})
