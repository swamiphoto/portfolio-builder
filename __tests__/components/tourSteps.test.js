import { buildTourSteps } from '@/components/admin/onboarding/tourSteps'

it('includes the imported-pages step only after an import', () => {
  const plain = buildTourSteps({ imported: false })
  const imported = buildTourSteps({ imported: true })
  expect(plain.some((s) => /imported/i.test(s.title || ''))).toBe(false)
  const step = imported.find((s) => /pages we imported/i.test(s.title || ''))
  expect(step).toBeTruthy()
  const pagesIdx = imported.findIndex((s) => s.selector === '[data-tour="pages-section"]')
  expect(imported.indexOf(step)).toBe(pagesIdx + 1)
})
