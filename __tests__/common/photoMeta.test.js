import { formatCaptureMeta, publicCaptureForAsset } from '@/common/photoMeta'

const capture = {
  capturedAt: '2024-03-12T10:30:00Z',
  cameraMake: 'Nikon', cameraModel: 'Nikon Z6',
  lens: 'NIKKOR Z 50mm f/1.8 S',
  focalLengthMm: 50, aperture: 'f/1.8', shutterSpeed: '1/250', iso: 400,
}

describe('formatCaptureMeta', () => {
  it('returns empty for off / no data', () => {
    expect(formatCaptureMeta(capture, 'off')).toBe('')
    expect(formatCaptureMeta(null, 'exif')).toBe('')
    expect(formatCaptureMeta({}, 'date')).toBe('')
  })

  it('date mode shows the capture date', () => {
    expect(formatCaptureMeta(capture, 'date')).toBe('March 12, 2024')
  })

  it('date mode falls back to the upload date when no capturedAt', () => {
    expect(formatCaptureMeta({}, 'date', '2023-01-05T12:00:00Z')).toBe('January 5, 2023')
  })

  it('exif mode builds date + gear + exposure lines, skipping missing fields', () => {
    const out = formatCaptureMeta(capture, 'exif')
    expect(out).toBe('March 12, 2024\nNikon Z6 · NIKKOR Z 50mm f/1.8 S\n50mm · f/1.8 · 1/250s · ISO 400')
  })

  it('formats aperture/shutter/focal that arrive un-prefixed', () => {
    const out = formatCaptureMeta({ focalLengthMm: 35, aperture: '2.8', shutterSpeed: '1/60', iso: 100 }, 'exif')
    expect(out).toContain('35mm · f/2.8 · 1/60s · ISO 100')
  })

  it('publicCaptureForAsset trims to present fields, null when empty', () => {
    expect(publicCaptureForAsset({ capture: capture })).toMatchObject({ cameraModel: 'Nikon Z6', iso: 400 })
    expect(publicCaptureForAsset({ capture: { capturedAt: null, iso: null } })).toBeNull()
    expect(publicCaptureForAsset({})).toBeNull()
  })
})
