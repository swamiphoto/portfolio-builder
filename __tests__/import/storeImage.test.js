/**
 * @jest-environment node
 */

// Mock gcsClient before any imports (hoisted by SWC/babel-jest).
// We can't reference `send` in the factory due to TDZ, so we define the mock
// inline and retrieve the spy via jest.mocked after import.
jest.mock('@/common/gcsClient', () => ({
  s3: { send: jest.fn().mockResolvedValue({}) },
  BUCKET: 'test-bucket',
  PUBLIC_URL: 'https://cdn.test',
}))

import { storeImageBuffer } from '@/common/storeImage'
import sharp from 'sharp'
import * as gcsClient from '@/common/gcsClient'

describe('storeImageBuffer', () => {
  // Grab the mock spy from the mocked module
  const getSend = () => gcsClient.s3.send

  beforeEach(() => getSend().mockClear())

  it('uploads original + thumbnail and returns url/dimensions', async () => {
    const buffer = await sharp({
      create: { width: 20, height: 10, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .jpeg()
      .toBuffer()

    const out = await storeImageBuffer('user123', {
      buffer,
      filename: 'my photo.jpg',
      contentType: 'image/jpeg',
      folder: 'photos/import',
    })

    expect(out.objectPath).toBe('users/user123/photos/import/my_photo.jpg')
    expect(out.gcsUrl).toBe('https://cdn.test/users/user123/photos/import/my_photo.jpg')
    expect(out.width).toBe(20)
    expect(out.height).toBe(10)
    // original + thumbnail + display = 3 puts
    expect(getSend()).toHaveBeenCalledTimes(3)
  })

  it('uploads a display (1800px) variant alongside the thumbnail so the lightbox and galleries resolve', async () => {
    const buffer = await sharp({
      create: { width: 20, height: 10, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .jpeg()
      .toBuffer()

    await storeImageBuffer('user123', {
      buffer,
      filename: 'my photo.jpg',
      contentType: 'image/jpeg',
      folder: 'photos/import',
    })

    const keys = getSend().mock.calls.map((c) => c[0].input.Key)
    expect(keys).toContain('users/user123/photos/import/my_photo.jpg')
    expect(keys).toContain('users/user123/thumbnails/import/my_photo.jpg')
    expect(keys).toContain('users/user123/display/import/my_photo.jpg')

    // the display variant is a jpeg
    const displayPut = getSend().mock.calls.find((c) => c[0].input.Key.includes('/display/'))
    expect(displayPut[0].input.ContentType).toBe('image/jpeg')
  })
})
