import { imageEditorStyle } from '../../common/markdownImageOptions'

describe('imageEditorStyle', () => {
  it('centered: sized, not floated, auto-centered', () => {
    expect(imageEditorStyle({ layout: 'centered', size: 'm' })).toMatchObject({ float: 'none', width: '66%', margin: '0.6em auto' })
    expect(imageEditorStyle({ layout: 'centered', size: 'l' }).width).toBe('100%')
    expect(imageEditorStyle({ layout: 'centered', size: 's' }).width).toBe('40%')
  })
  it('full-bleed: full width, ignores size', () => {
    expect(imageEditorStyle({ layout: 'full-bleed', size: 's' })).toMatchObject({ float: 'none', width: '100%' })
  })
  it('side: floats left at the size width', () => {
    expect(imageEditorStyle({ layout: 'side', size: 'm' })).toMatchObject({ float: 'left', width: '40%' })
  })
  it('defaults to centered/l on invalid input', () => {
    expect(imageEditorStyle({ layout: 'x', size: 'y' })).toMatchObject({ float: 'none', width: '100%' })
  })
})
