import { secondaryButtonStyle } from '@/common/coverButtons'

describe('secondaryButtonStyle', () => {
  it('returns the complement of the primary style', () => {
    expect(secondaryButtonStyle('solid')).toBe('outline')
    expect(secondaryButtonStyle('outline')).toBe('solid')
  })
  it('defaults a missing/garbage primary to outline (so a secondary button is visible over a solid-less hero)', () => {
    expect(secondaryButtonStyle(undefined)).toBe('outline')
    expect(secondaryButtonStyle('nonsense')).toBe('outline')
  })
})
