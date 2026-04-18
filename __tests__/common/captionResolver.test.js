import { resolveCaption, isCaptionOverridden } from '../../common/captionResolver'

describe('resolveCaption', () => {
  const assetsByUrl = {
    'https://cdn/1.jpg': { assetId: 'a1', caption: 'Library caption' },
    'https://cdn/2.jpg': { assetId: 'a2', caption: '' },
  }

  test('returns ref caption when defined', () => {
    expect(resolveCaption({ url: 'https://cdn/1.jpg', caption: 'Override' }, assetsByUrl))
      .toBe('Override')
  })

  test('returns ref caption even if empty string (explicit override)', () => {
    expect(resolveCaption({ url: 'https://cdn/1.jpg', caption: '' }, assetsByUrl))
      .toBe('')
  })

  test('falls back to library caption when ref caption undefined', () => {
    expect(resolveCaption({ url: 'https://cdn/1.jpg' }, assetsByUrl))
      .toBe('Library caption')
  })

  test('returns empty string when neither defined', () => {
    expect(resolveCaption({ url: 'https://cdn/missing.jpg' }, assetsByUrl))
      .toBe('')
  })
})

describe('isCaptionOverridden', () => {
  test('returns true when ref.caption is a non-empty string', () => {
    expect(isCaptionOverridden({ url: 'u', caption: 'x' })).toBe(true)
  })

  test('returns true when ref.caption is empty string (explicit override)', () => {
    expect(isCaptionOverridden({ url: 'u', caption: '' })).toBe(true)
  })

  test('returns false when ref has no caption property', () => {
    expect(isCaptionOverridden({ url: 'u' })).toBe(false)
  })

  test('returns false for null ref', () => {
    expect(isCaptionOverridden(null)).toBe(false)
  })
})
