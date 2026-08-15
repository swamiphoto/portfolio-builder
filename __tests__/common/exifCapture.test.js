/** @jest-environment node */
import fs from 'fs'
import path from 'path'
import { extractCapture, formatShutterSpeed, formatAperture } from '../../common/exifCapture'

const FIXTURES = path.join(__dirname, '..', 'fixtures')
const WITH_EXIF = fs.readFileSync(path.join(FIXTURES, 'with-exif.jpg'))
const NO_EXIF = fs.readFileSync(path.join(FIXTURES, 'no-exif.jpg'))

describe('extractCapture', () => {
  it('maps a real image buffer with EXIF to the capture shape', async () => {
    const capture = await extractCapture(WITH_EXIF)
    expect(capture).toEqual({
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
    })
  })

  it('returns null for a valid image with no EXIF data', async () => {
    const capture = await extractCapture(NO_EXIF)
    expect(capture).toBeNull()
  })

  it('never throws on a corrupt / non-image buffer, and returns null', async () => {
    await expect(extractCapture(Buffer.from('not an image at all'))).resolves.toBeNull()
  })

  it('never throws on an empty buffer', async () => {
    await expect(extractCapture(Buffer.alloc(0))).resolves.toBeNull()
  })
})

describe('formatShutterSpeed', () => {
  it('formats sub-second exposures as a fraction', () => {
    expect(formatShutterSpeed(0.005)).toBe('1/200s')
  })

  it('formats exposures of 1 second or longer as a decimal', () => {
    expect(formatShutterSpeed(1.5)).toBe('1.5s')
  })

  it('returns null for falsy input', () => {
    expect(formatShutterSpeed(0)).toBeNull()
    expect(formatShutterSpeed(null)).toBeNull()
    expect(formatShutterSpeed(undefined)).toBeNull()
  })
})

describe('formatAperture', () => {
  it('prefixes the f-number with f/', () => {
    expect(formatAperture(2.8)).toBe('f/2.8')
  })

  it('returns null for falsy input', () => {
    expect(formatAperture(0)).toBeNull()
    expect(formatAperture(null)).toBeNull()
    expect(formatAperture(undefined)).toBeNull()
  })
})
