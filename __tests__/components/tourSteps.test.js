// __tests__/components/tourSteps.test.js
import { buildTourSteps, BLOCKS_TIP_STEP } from '@/components/admin/onboarding/tourSteps'

describe('buildTourSteps', () => {
  it('returns four steps targeting the tour anchors', () => {
    const steps = buildTourSteps({ imported: false })
    expect(steps.map(s => s.selector)).toEqual([
      '[data-tour="add-page"]',
      '[data-tour="pages-section"]',
      '[data-tour="library"]',
      '[data-tour="settings"]',
    ])
  })

  it('mentions the just-imported photos only when imported is true', () => {
    expect(buildTourSteps({ imported: true })[2].body).toMatch(/just imported/i)
    expect(buildTourSteps({ imported: false })[2].body).not.toMatch(/just imported/i)
  })

  it('has no em-dashes in any copy', () => {
    const all = [...buildTourSteps({ imported: true }), BLOCKS_TIP_STEP]
      .map(s => `${s.title} ${s.body}`).join(' ')
    expect(all).not.toContain('—')
  })

  it('blocks tip targets the add-block anchor', () => {
    expect(BLOCKS_TIP_STEP.selector).toBe('[data-tour="add-block"]')
  })
})
