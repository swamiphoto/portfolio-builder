import { resolveFooterSocial } from '@/common/siteDesign'

const cfg = (design) => ({ design })

describe('resolveFooterSocial', () => {
  it('defaults new/unset sites to icons', () => {
    expect(resolveFooterSocial(cfg({}))).toBe('icons')
    expect(resolveFooterSocial({})).toBe('icons')
    expect(resolveFooterSocial(undefined)).toBe('icons')
  })

  it('migrates legacy footerLayout: expanded -> text, simple -> off', () => {
    expect(resolveFooterSocial(cfg({ footerLayout: 'expanded' }))).toBe('text')
    expect(resolveFooterSocial(cfg({ footerLayout: 'simple' }))).toBe('off')
  })

  it('prefers an explicit footerSocial over the legacy field', () => {
    expect(resolveFooterSocial(cfg({ footerSocial: 'icons', footerLayout: 'simple' }))).toBe('icons')
    expect(resolveFooterSocial(cfg({ footerSocial: 'off', footerLayout: 'expanded' }))).toBe('off')
    expect(resolveFooterSocial(cfg({ footerSocial: 'text' }))).toBe('text')
  })

  it('ignores an invalid footerSocial value', () => {
    expect(resolveFooterSocial(cfg({ footerSocial: 'bogus' }))).toBe('icons')
  })
})
