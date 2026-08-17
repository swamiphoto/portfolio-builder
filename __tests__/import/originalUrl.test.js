/** @jest-environment node */

import { originalUrlCandidates } from '@/common/import/originalUrl'

describe('originalUrlCandidates', () => {
  it('rewrites squarespace CDN urls to format=original', () => {
    expect(originalUrlCandidates('https://images.squarespace-cdn.com/content/abc/photo.jpg?format=1500w'))
      .toEqual(['https://images.squarespace-cdn.com/content/abc/photo.jpg?format=original'])
  })
  it('strips wordpress size suffixes and -scaled', () => {
    expect(originalUrlCandidates('https://site.com/wp-content/uploads/2024/01/photo-1024x683.jpg'))
      .toEqual(['https://site.com/wp-content/uploads/2024/01/photo.jpg'])
    expect(originalUrlCandidates('https://site.com/wp-content/uploads/photo-scaled.jpg'))
      .toEqual(['https://site.com/wp-content/uploads/photo.jpg'])
  })
  it('returns no candidates for unrecognized urls', () => {
    expect(originalUrlCandidates('https://cdn.example.com/x/photo.jpg')).toEqual([])
    expect(originalUrlCandidates('not a url')).toEqual([])
  })
})
