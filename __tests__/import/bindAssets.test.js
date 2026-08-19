/** @jest-environment node */
import { bindAssets } from '@/common/import/composer'

const asset = (id, sourceUrl) => ({ assetId: id, publicUrl: `https://gcs/${id}.jpg`, source: { sourceUrl } })

it('resolves a photo ref to the imported asset imageUrl and keeps the caption', () => {
  const outline = [{ kind: 'image', ref: 'img-1', src: 'https://x.com/a.jpg', caption: 'c' }]
  const blocks = [{ type: 'photo', ref: 'img-1', caption: 'c' }]
  const assets = [asset('a', 'https://x.com/a.jpg')]
  expect(bindAssets(blocks, outline, assets)).toEqual([{ type: 'photo', imageUrl: 'https://gcs/a.jpg', caption: 'c' }])
})

it('matches by image identity across CDN size variants', () => {
  const outline = [{ kind: 'image', ref: 'img-1', src: 'https://cdn/i-abc/S/photo.jpg', caption: '' }]
  const blocks = [{ type: 'photo', ref: 'img-1', caption: '' }]
  const assets = [asset('a', 'https://cdn/i-abc/O/photo.jpg')] // larger variant, same identity
  const [b] = bindAssets(blocks, outline, assets)
  expect(b.imageUrl).toBe('https://gcs/a.jpg')
})

it('fills a photos block images/imageUrls from refs, dropping unresolved refs', () => {
  const outline = [
    { kind: 'image', ref: 'img-1', src: 'https://x.com/a.jpg', caption: '' },
    { kind: 'image', ref: 'img-2', src: 'https://x.com/b.jpg', caption: '' },
    { kind: 'image', ref: 'img-3', src: 'https://x.com/missing.jpg', caption: '' },
  ]
  const blocks = [{ type: 'photos', refs: ['img-1', 'img-2', 'img-3'], layout: 'stacked' }]
  const assets = [asset('a', 'https://x.com/a.jpg'), asset('b', 'https://x.com/b.jpg')]
  const [b] = bindAssets(blocks, outline, assets)
  expect(b.imageUrls).toEqual(['https://gcs/a.jpg', 'https://gcs/b.jpg'])
  expect(b.images).toEqual([{ url: 'https://gcs/a.jpg', assetId: 'a' }, { url: 'https://gcs/b.jpg', assetId: 'b' }])
  expect(b.refs).toBeUndefined()
})

it('collapses a photos block to a single photo block when only one ref survives binding', () => {
  const outline = [
    { kind: 'image', ref: 'img-1', src: 'https://x.com/a.jpg', caption: '' },
    { kind: 'image', ref: 'img-2', src: 'https://x.com/missing.jpg', caption: '' },
  ]
  const blocks = [{ type: 'photos', refs: ['img-1', 'img-2'], layout: 'stacked' }]
  const assets = [asset('a', 'https://x.com/a.jpg')]
  const result = bindAssets(blocks, outline, assets)
  expect(result).toEqual([{ type: 'photo', imageUrl: 'https://gcs/a.jpg', caption: '' }])
})

it('drops a photo whose ref resolves to nothing', () => {
  const outline = [{ kind: 'image', ref: 'img-1', src: 'https://x.com/gone.jpg', caption: '' }]
  const blocks = [{ type: 'photo', ref: 'img-1', caption: '' }]
  expect(bindAssets(blocks, outline, [])).toEqual([])
})

it('binds a testimonial avatar ref and passes text blocks through untouched', () => {
  const outline = [{ kind: 'image', ref: 'img-1', src: 'https://x.com/face.jpg', caption: '' }]
  const blocks = [
    { type: 'testimonial', text: 'Great', name: 'Naga', ref: 'img-1' },
    { type: 'text', variant: 1, content: 'Recent Work' },
  ]
  const [t, txt] = bindAssets(blocks, outline, [asset('f', 'https://x.com/face.jpg')])
  expect(t).toEqual({ type: 'testimonial', text: 'Great', name: 'Naga', imageUrl: 'https://gcs/f.jpg', variant: 1 })
  expect(txt).toEqual({ type: 'text', variant: 1, content: 'Recent Work' })
})
