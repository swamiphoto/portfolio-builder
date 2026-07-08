import { mapSpecToProdigi } from '../../common/fulfillment/prodigiSkuMap'

describe('mapSpecToProdigi', () => {
  it('maps an unframed matte print to the fine-art (EMA) SKU, no attributes', () => {
    const out = mapSpecToProdigi({ size: '16x20', finish: 'matte', frame: 'none' })
    expect(out.sku).toBe('GLOBAL-FAP-16X20')
    expect(out.copies).toBe(1)
    expect(out.sizing).toBe('fillPrintArea')
    expect(out.attributes).toEqual({})
  })

  it('maps an unframed lustre print to the photographic (LPP) SKU', () => {
    const out = mapSpecToProdigi({ size: '11x14', finish: 'lustre', frame: 'none' })
    expect(out.sku).toBe('GLOBAL-PAP-11X14')
    expect(out.attributes).toEqual({})
  })

  it('maps an unframed metal print to the metal SKU with a finish attribute', () => {
    const out = mapSpecToProdigi({ size: '16x20', finish: 'metal', frame: 'none' })
    expect(out.sku).toBe('GLOBAL-MET-16X20')
    expect(out.attributes.finish).toBe('satin')
  })

  it('maps a wood-framed mounted print to the mounted classic-frame SKU with colour', () => {
    const out = mapSpecToProdigi({ size: '16x20', finish: 'matte', frame: 'wood', frameColor: 'black', matte: true })
    expect(out.sku).toBe('GLOBAL-CFPM-16X20')
    expect(out.attributes).toEqual({ color: 'black' })
  })

  it('maps a wood-framed unmounted print to the no-mount classic-frame SKU', () => {
    const out = mapSpecToProdigi({ size: '16x20', finish: 'matte', frame: 'wood', frameColor: 'walnut', matte: false })
    expect(out.sku).toBe('GLOBAL-CFP-16X20')
    expect(out.attributes).toEqual({ color: 'brown' }) // walnut -> Prodigi 'brown'
  })

  it('throws on an unmapped size', () => {
    expect(() => mapSpecToProdigi({ size: '99x99', finish: 'lustre', frame: 'none' }))
      .toThrow(/unmapped prodigi spec: size=99x99/)
  })

  it('throws on an unmapped frame', () => {
    expect(() => mapSpecToProdigi({ size: '16x20', finish: 'lustre', frame: 'gilded' }))
      .toThrow(/unmapped prodigi spec: frame=gilded/)
  })

  it('throws on an unmapped unframed finish', () => {
    expect(() => mapSpecToProdigi({ size: '16x20', finish: 'canvas', frame: 'none' }))
      .toThrow(/unmapped prodigi spec: finish=canvas/)
  })

  it('throws on an unmapped frame colour', () => {
    expect(() => mapSpecToProdigi({ size: '16x20', finish: 'matte', frame: 'wood', frameColor: 'teal' }))
      .toThrow(/unmapped prodigi spec: frameColor=teal/)
  })
})
