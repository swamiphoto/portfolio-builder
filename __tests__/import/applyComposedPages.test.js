import { applyComposedPages } from '@/common/import/composer'

it('appends composed pages to the site config pages array', () => {
  const config = { pages: [{ id: 'p1' }], theme: 'kyoto' }
  const next = applyComposedPages(config, [{ id: 'pg-a' }, { id: 'pg-b' }])
  expect(next.pages.map((p) => p.id)).toEqual(['p1', 'pg-a', 'pg-b'])
  expect(next.theme).toBe('kyoto')
  expect(applyComposedPages(config, []).pages).toHaveLength(1)
})

it('never adds a page whose id already exists (re-run safety)', () => {
  const config = { pages: [{ id: 'pg-a' }] }
  expect(applyComposedPages(config, [{ id: 'pg-a' }]).pages).toHaveLength(1)
})
