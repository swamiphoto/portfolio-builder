import { mapSpecToProdigi } from '../../common/fulfillment/prodigiSkuMap'

describe('mapSpecToProdigi', () => {
  it('maps an unframed lustre print to a global fine-art SKU with copies and sizing', () => {
    const out = mapSpecToProdigi({ size: '16x20', finish: 'lustre', frame: 'none' })
    expect(out.sku).toBe('GLOBAL-FAP-16x20')
    expect(out.copies).toBe(1)
    expect(out.sizing).toBe('fillPrintArea')
    expect(out.attributes.paperType).toBe('SAP') // semi/lustre art paper
  })

  it('maps a wood-framed print to a framed SKU and carries frame color + matte attributes', () => {
    const out = mapSpecToProdigi({ size: '16x20', finish: 'matte', frame: 'wood', frameColor: 'black', matte: true })
    expect(out.sku).toBe('GLOBAL-CFPM-16x20') // classic framed print, matte mount
    expect(out.attributes.frameColour).toBe('black')
    expect(out.attributes.mountColour).toBe('snow')
  })

  it('throws on an unmapped size', () => {
    expect(() => mapSpecToProdigi({ size: '99x99', finish: 'lustre', frame: 'none' }))
      .toThrow(/unmapped prodigi spec/)
  })

  it('throws on an unmapped frame', () => {
    expect(() => mapSpecToProdigi({ size: '16x20', finish: 'lustre', frame: 'gilded' }))
      .toThrow(/unmapped prodigi spec/)
  })
})
