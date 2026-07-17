import { captionStyleCss, resolveCaptionStyle, CAPTION_STYLE_OPTIONS, DEFAULT_CAPTION_STYLE } from '@/common/captionStyles'
import { getBlockSpec } from '@/common/themes'

describe('caption styles', () => {
  it('offers sans (default), serif, accent', () => {
    expect(CAPTION_STYLE_OPTIONS.map((c) => c.id)).toEqual(['sans', 'serif', 'accent'])
    expect(DEFAULT_CAPTION_STYLE).toBe('sans')
  })

  it('sans keeps the existing look (no overrides)', () => {
    expect(captionStyleCss('sans')).toEqual({})
  })

  it('serif is Cormorant 500 italic', () => {
    const css = captionStyleCss('serif')
    expect(css.fontFamily).toMatch(/Cormorant/)
    expect(css.fontWeight).toBe(500)
    expect(css.fontStyle).toBe('italic')
  })

  it('accent is Cormorant 700 uppercase in red rgb(220, 38, 38)', () => {
    const css = captionStyleCss('accent')
    expect(css.fontFamily).toMatch(/Cormorant/)
    expect(css.fontWeight).toBe(700)
    expect(css.color).toBe('rgb(220, 38, 38)')
    expect(css.textTransform).toBe('uppercase')
  })

  it('resolveCaptionStyle defaults to sans and validates', () => {
    expect(resolveCaptionStyle({})).toBe('sans')
    expect(resolveCaptionStyle({ captionStyle: 'accent' })).toBe('accent')
    expect(resolveCaptionStyle({ captionStyle: 'bogus' })).toBe('sans')
  })

  it('photo and photos specs expose captionStyles', () => {
    expect(getBlockSpec('kyoto', 'photo').captionStyles.map((c) => c.id)).toEqual(['sans', 'serif', 'accent'])
    expect(getBlockSpec('kyoto', 'photos').captionStyles.map((c) => c.id)).toEqual(['sans', 'serif', 'accent'])
  })
})
