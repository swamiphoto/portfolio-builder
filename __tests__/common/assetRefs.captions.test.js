import { normalizeImageRefs, buildMultiImageFields } from '../../common/assetRefs'

describe('caption semantics', () => {
  test('normalizeImageRefs preserves undefined caption', () => {
    const result = normalizeImageRefs([{ assetId: 'a1', url: 'u1' }])
    expect(result[0]).toEqual({ assetId: 'a1', url: 'u1' })
    expect(result[0].caption).toBeUndefined()
  })

  test('normalizeImageRefs preserves explicit empty caption as override', () => {
    const result = normalizeImageRefs([{ assetId: 'a1', url: 'u1', caption: '' }])
    expect(result[0]).toEqual({ assetId: 'a1', url: 'u1', caption: '' })
    expect('caption' in result[0]).toBe(true)
  })

  test('normalizeImageRefs preserves defined caption', () => {
    const result = normalizeImageRefs([{ assetId: 'a1', url: 'u1', caption: 'hi' }])
    expect(result[0]).toEqual({ assetId: 'a1', url: 'u1', caption: 'hi' })
  })

  test('normalizeImageRefs accepts bare string URLs without caption', () => {
    const result = normalizeImageRefs(['u1'])
    expect(result[0]).toEqual({ assetId: null, url: 'u1' })
    expect(result[0].caption).toBeUndefined()
  })

  test('buildMultiImageFields preserves undefined caption per ref', () => {
    const refs = [{ assetId: 'a1', url: 'u1' }, { assetId: 'a2', url: 'u2', caption: 'two' }]
    const fields = buildMultiImageFields(refs)
    expect(fields.images[0].caption).toBeUndefined()
    expect(fields.images[1].caption).toBe('two')
  })
})
