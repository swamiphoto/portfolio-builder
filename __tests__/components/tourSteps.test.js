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
    const all = [...buildTourSteps({ imported: true, rebuilt: true }), ...BLOCKS_TOUR_STEPS, WELCOME]
      .map(s => `${s.title} ${s.body} ${s.confirm || ''} ${s.dismiss || ''}`).join(' ')
    expect(all).not.toContain('—')
  })

  it('includes the imported-pages step only after pages are actually rebuilt', () => {
    const plain = buildTourSteps({ imported: false, rebuilt: false })
    const rebuilt = buildTourSteps({ imported: false, rebuilt: true })
    expect(plain.some((s) => /imported/i.test(s.title || ''))).toBe(false)
    const step = rebuilt.find((s) => /pages we imported/i.test(s.title || ''))
    expect(step).toBeTruthy()
    const pagesIdx = rebuilt.findIndex((s) => s.selector === '[data-tour="pages-section"]')
    expect(rebuilt.indexOf(step)).toBe(pagesIdx + 1)
  })

  it('does not show the imported-pages step for a photo-only import (imported without rebuilt)', () => {
    const photoOnly = buildTourSteps({ imported: true, rebuilt: false })
    expect(photoOnly.some((s) => /pages we imported/i.test(s.title || ''))).toBe(false)
    // ...but the library step still credits the just-imported photos.
    const lib = photoOnly.find(s => s.selector === '[data-tour="library"]')
    expect(lib.body).toMatch(/just imported/i)
  })

  it('points at the pages list, not a profile menu, for deleting imported pages', () => {
    const step = buildTourSteps({ imported: true, rebuilt: true }).find((s) => /pages we imported/i.test(s.title || ''))
    expect(step.body).toMatch(/pages list/i)
    expect(step.body).not.toMatch(/profile menu/i)
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
