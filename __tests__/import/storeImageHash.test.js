/**
 * @jest-environment node
 */

// Mock gcsClient before any imports (hoisted by SWC/babel-jest).
// The original-object PutObject resolves with an ETag (R2 returns the object's
// MD5); storeImageBuffer returns it dequoted as the content hash.
jest.mock('@/common/gcsClient', () => ({
  s3: { send: jest.fn().mockResolvedValue({ ETag: '"9a0364b9e99bb480dd25e1f0284c8555"' }) },
  BUCKET: 'test-bucket',
  PUBLIC_URL: 'https://cdn.test',
}))

import { storeImageBuffer } from '@/common/storeImage'
import sharp from 'sharp'
import * as gcsClient from '@/common/gcsClient'

describe('storeImageBuffer hash', () => {
  const getSend = () => gcsClient.s3.send

  beforeEach(() => getSend().mockClear())

  it('returns the dequoted ETag (object MD5) as the content hash', async () => {
    const buffer = await sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 9, g: 9, b: 9 } } }).png().toBuffer()
    const out = await storeImageBuffer('u', { buffer, filename: 'a.png', contentType: 'image/png', folder: 'photos/import' })
    expect(out.hash).toBe('9a0364b9e99bb480dd25e1f0284c8555')
  })

  it('returns null hash when the store did not return an ETag', async () => {
    getSend().mockResolvedValueOnce({}) // original PUT: no ETag
    const buffer = await sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 1, g: 2, b: 3 } } }).png().toBuffer()
    const out = await storeImageBuffer('u', { buffer, filename: 'b.png', contentType: 'image/png', folder: 'photos/import' })
    expect(out.hash).toBeNull()
  })
})
