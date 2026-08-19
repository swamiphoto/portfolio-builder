/** @jest-environment node */
import { resolvePageLinks } from '@/common/import/composer'

it('rewrites pageRefs to the imported pages\' ids and drops dead links', () => {
  const pages = [
    { id: 'p_land', source: { sourceUrl: 'https://x.com/portfolio/landscapes' }, blocks: [] },
    { id: 'p_port', source: { sourceUrl: 'https://x.com/portfolio' }, blocks: [
      { type: 'page-gallery', source: 'manual', pageIds: [], pageRefs: ['https://x.com/portfolio/landscapes', 'https://x.com/not-imported'] },
    ] },
  ]
  resolvePageLinks(pages)
  expect(pages[1].blocks[0]).toEqual({ type: 'page-gallery', source: 'manual', pageIds: ['p_land'] })
})

it('drops a page-gallery block whose links all point at non-imported pages', () => {
  const pages = [
    { id: 'p_port', source: { sourceUrl: 'https://x.com/portfolio' }, blocks: [
      { type: 'page-gallery', source: 'manual', pageIds: [], pageRefs: ['https://x.com/gone'] },
    ] },
  ]
  resolvePageLinks(pages)
  expect(pages[0].blocks).toEqual([])
})
