/** @jest-environment node */

import { originalUrlCandidates, imageIdentity, preferLargerVariant } from '@/common/import/originalUrl'

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

describe('imageIdentity', () => {
  it('keys SmugMug URLs by the i-<ImageKey> path segment, ignoring size', () => {
    const m = 'https://photos.smugmug.com/Travel/i-AbC123x/0/M/sunset-M.jpg'
    const xl = 'https://photos.smugmug.com/Travel/i-AbC123x/0/XL/sunset-XL.jpg'
    expect(imageIdentity(m)).toBe(imageIdentity(xl))
  })
  it('keeps distinct SmugMug image keys distinct', () => {
    const a = 'https://photos.smugmug.com/Travel/i-AAA111/0/M/one-M.jpg'
    const b = 'https://photos.smugmug.com/Travel/i-BBB222/0/M/two-M.jpg'
    expect(imageIdentity(a)).not.toBe(imageIdentity(b))
  })
  it('collapses WordPress size-suffixed URLs onto the stripped/original form', () => {
    expect(imageIdentity('https://site.com/wp-content/uploads/2024/01/photo-1024x683.jpg')).toBe(
      imageIdentity('https://site.com/wp-content/uploads/2024/01/photo.jpg')
    )
  })
  it('collapses squarespace format query params', () => {
    expect(imageIdentity('https://images.squarespace-cdn.com/content/abc/photo.jpg?format=1500w')).toBe(
      imageIdentity('https://images.squarespace-cdn.com/content/abc/photo.jpg?format=original')
    )
  })
  it('leaves unrecognized URLs keyed by themselves (no collapse)', () => {
    expect(imageIdentity('https://cdn.example.com/x/photo-a.jpg')).not.toBe(
      imageIdentity('https://cdn.example.com/x/photo-b.jpg')
    )
    expect(imageIdentity('https://cdn.example.com/x/photo.jpg')).toBe('https://cdn.example.com/x/photo.jpg')
  })
})

describe('preferLargerVariant', () => {
  it('orders SmugMug size codes smallest to largest', () => {
    const th = 'https://photos.smugmug.com/g/i-K/0/Th/n-Th.jpg'
    const m = 'https://photos.smugmug.com/g/i-K/0/M/n-M.jpg'
    const x3 = 'https://photos.smugmug.com/g/i-K/0/X3/n-X3.jpg'
    expect(preferLargerVariant(m, th)).toBe(m)
    expect(preferLargerVariant(x3, m)).toBe(x3)
    expect(preferLargerVariant(th, x3)).toBe(x3)
  })
  it('O (original) beats every other SmugMug size code', () => {
    const o = 'https://photos.smugmug.com/g/i-K/0/O/n-O.jpg'
    const x5 = 'https://photos.smugmug.com/g/i-K/0/X5/n-X5.jpg'
    expect(preferLargerVariant(o, x5)).toBe(o)
    expect(preferLargerVariant(x5, o)).toBe(o)
  })
  it('an unrecognized SmugMug size code loses to a known larger one', () => {
    const weird = 'https://photos.smugmug.com/g/i-K/0/Weird/n-Weird.jpg'
    const l = 'https://photos.smugmug.com/g/i-K/0/L/n-L.jpg'
    expect(preferLargerVariant(weird, l)).toBe(l)
    expect(preferLargerVariant(l, weird)).toBe(l)
  })
  it('prefers the stripped/original form over a WordPress size-suffixed variant', () => {
    const orig = 'https://site.com/wp-content/uploads/photo.jpg'
    const small = 'https://site.com/wp-content/uploads/photo-300x200.jpg'
    expect(preferLargerVariant(orig, small)).toBe(orig)
    expect(preferLargerVariant(small, orig)).toBe(orig)
  })
  it('prefers the larger dimensions when both are WordPress size-suffixed', () => {
    const small = 'https://site.com/wp-content/uploads/photo-300x200.jpg'
    const big = 'https://site.com/wp-content/uploads/photo-1024x683.jpg'
    expect(preferLargerVariant(big, small)).toBe(big)
    expect(preferLargerVariant(small, big)).toBe(big)
  })
})
