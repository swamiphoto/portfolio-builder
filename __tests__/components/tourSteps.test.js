// __tests__/components/tourSteps.test.js
import { buildTourSteps, BLOCKS_TOUR_STEPS, WELCOME } from '@/components/admin/onboarding/tourSteps'

describe('buildTourSteps', () => {
  it('opens with a centered concept card, then walks the sidebar top to bottom', () => {
    const steps = buildTourSteps({ imported: false })
    expect(steps.map(s => s.selector)).toEqual([
      null, // "your site, in pages" — centered, no anchor
      '[data-tour="cover"]',
      '[data-tour="pages-section"]',
      '[data-tour="hidden-section"]',
      '[data-tour="add-page"]',
      '[data-tour="library"]',
      '[data-tour="settings"]',
    ])
  })

  it('places every anchored step to the right of the sidebar so nothing is covered', () => {
    const anchored = buildTourSteps({ imported: false }).filter(s => s.selector)
    expect(anchored.every(s => s.placement === 'right')).toBe(true)
  })

  it('mentions the just-imported photos only when imported is true', () => {
    const lib = (imported) => buildTourSteps({ imported }).find(s => s.selector === '[data-tour="library"]').body
    expect(lib(true)).toMatch(/just imported/i)
    expect(lib(false)).not.toMatch(/just imported/i)
  })

  it('does not talk about navigation on the pages step yet', () => {
    const pages = buildTourSteps({ imported: false }).find(s => s.selector === '[data-tour="pages-section"]')
    expect(pages.body).not.toMatch(/navigation/i)
  })

  it('has no em-dashes in any copy', () => {
    const all = [...buildTourSteps({ imported: true }), ...BLOCKS_TOUR_STEPS, WELCOME]
      .map(s => `${s.title} ${s.body} ${s.confirm || ''} ${s.dismiss || ''}`).join(' ')
    expect(all).not.toContain('—')
  })

  it('includes the imported-pages step only after an import', () => {
    const plain = buildTourSteps({ imported: false })
    const imported = buildTourSteps({ imported: true })
    expect(plain.some((s) => /imported/i.test(s.title || ''))).toBe(false)
    const step = imported.find((s) => /pages we imported/i.test(s.title || ''))
    expect(step).toBeTruthy()
    const pagesIdx = imported.findIndex((s) => s.selector === '[data-tour="pages-section"]')
    expect(imported.indexOf(step)).toBe(pagesIdx + 1)
  })
})

describe('BLOCKS_TOUR_STEPS', () => {
  it('covers the block sidebar, per-block design, and page settings', () => {
    expect(BLOCKS_TOUR_STEPS.map(s => s.selector)).toEqual([
      '[data-tour="add-block"]',
      '[data-tour="block-design"]',
      '[data-tour="page-settings"]',
    ])
  })
})
