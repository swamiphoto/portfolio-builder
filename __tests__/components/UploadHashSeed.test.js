import { seedUploadedAsset } from '@/common/import/uploadedAsset'

describe('seedUploadedAsset', () => {
  it('builds an asset record carrying the content hash', () => {
    const a = seedUploadedAsset({ url: 'https://cdn/p.jpg', width: 20, height: 10, hash: 'deadbeef', now: '2026-07-09T00:00:00Z' }, {})
    expect(a.publicUrl).toBe('https://cdn/p.jpg')
    expect(a.orientation).toBe('landscape')
    expect(a.aspectRatio).toBe(2)
    expect(a.hashes).toEqual({ exact: 'deadbeef', perceptual: null })
  })
  it('preserves an existing asset and null hash when absent', () => {
    const a = seedUploadedAsset({ url: 'https://cdn/q.jpg', now: '2026-07-09T00:00:00Z' }, { caption: 'keep' })
    expect(a.caption).toBe('keep')
    expect(a.hashes).toEqual({ exact: null, perceptual: null })
  })
})
