/** @jest-environment node */
import { setParentIds } from '@/common/import/composer'

it('nests a child page under its URL-path parent', () => {
  const pages = [
    { id: 'p_portfolio', parentId: null, source: { sourceUrl: 'https://x.com/portfolio' } },
    { id: 'p_land', parentId: null, source: { sourceUrl: 'https://x.com/portfolio/landscapes' } },
  ]
  setParentIds(pages)
  expect(pages[1].parentId).toBe('p_portfolio')
  expect(pages[0].parentId).toBeNull()
})

it('leaves parentId null when the parent was not imported', () => {
  const pages = [{ id: 'p_land', parentId: null, source: { sourceUrl: 'https://x.com/portfolio/landscapes' } }]
  setParentIds(pages)
  expect(pages[0].parentId).toBeNull()
})
