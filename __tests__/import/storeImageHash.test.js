/**
 * @jest-environment node
 */

// Mock gcsClient before any imports (hoisted by SWC/babel-jest).
// Define the mock inline and retrieve the spy via jest.mocked after import.
jest.mock('@/common/gcsClient', () => ({
  s3: { send: jest.fn().mockResolvedValue({}) },
  BUCKET: 'test-bucket',
  PUBLIC_URL: 'https://cdn.test',
}))

import { storeImageBuffer } from '@/common/storeImage'
import sharp from 'sharp'
import crypto from 'crypto'
import * as gcsClient from '@/common/gcsClient'

describe('storeImageBuffer hash', () => {
  const getSend = () => gcsClient.s3.send

  beforeEach(() => getSend().mockClear())

  it('returns the lowercase hex sha256 of the buffer', async () => {
    const buffer = await sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 9, g: 9, b: 9 } } }).png().toBuffer()
    const out = await storeImageBuffer('u', { buffer, filename: 'a.png', contentType: 'image/png', folder: 'photos/import' })
    expect(out.hash).toBe(crypto.createHash('sha256').update(buffer).digest('hex'))
    expect(out.hash).toMatch(/^[0-9a-f]{64}$/)
  })
})
