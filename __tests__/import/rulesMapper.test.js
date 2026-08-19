/** @jest-environment node */
import { mapOutlineToBlocks } from '@/common/import/rulesMapper'

it('maps a captioned image to a photo block carrying the ref and caption', () => {
  const { blocks } = mapOutlineToBlocks([{ kind: 'image', ref: 'img-1', src: 'a', caption: 'SF in fog' }])
  expect(blocks).toEqual([{ type: 'photo', ref: 'img-1', caption: 'SF in fog' }])
})

it('maps an image immediately followed by a short standalone paragraph to a side caption', () => {
  const { blocks } = mapOutlineToBlocks([
    { kind: 'image', ref: 'img-1', src: 'a', caption: '' },
    { kind: 'paragraph', text: 'Aurora Borealis in California — a rare shot.' },
  ])
  expect(blocks[0]).toMatchObject({ type: 'photo', ref: 'img-1', variant: 3, caption: 'Aurora Borealis in California — a rare shot.' })
  expect(blocks).toHaveLength(1)
})

it('maps a blockquote to a testimonial', () => {
  const { blocks } = mapOutlineToBlocks([{ kind: 'quote', text: 'Amazing.', attribution: 'Vivek' }])
  expect(blocks).toEqual([{ type: 'testimonial', text: 'Amazing.', name: 'Vivek', ref: null }])
})

it('maps a heading to a text heading and a paragraph run to a markdown essay', () => {
  const { blocks } = mapOutlineToBlocks([
    { kind: 'heading', level: 2, text: 'Recent Work' },
    { kind: 'paragraph', text: 'One.' },
    { kind: 'paragraph', text: 'Two.' },
  ])
  expect(blocks[0]).toEqual({ type: 'text', variant: 1, content: 'Recent Work' })
  expect(blocks[1]).toEqual({ type: 'text', variant: 3, format: 'markdown', content: 'One.\n\nTwo.' })
})

it('maps consecutive portrait-less images into a photos grid, keeping refs', () => {
  const { blocks } = mapOutlineToBlocks([
    { kind: 'image', ref: 'img-1', src: 'a', caption: '' },
    { kind: 'image', ref: 'img-2', src: 'b', caption: '' },
  ])
  expect(blocks).toEqual([{ type: 'photos', refs: ['img-1', 'img-2'], layout: 'stacked' }])
})

it('maps a linkcards node to a page-gallery with source hrefs in pageRefs', () => {
  const { blocks } = mapOutlineToBlocks([
    { kind: 'linkcards', items: [{ href: 'https://x.com/a', label: 'A' }, { href: 'https://x.com/b', label: 'B' }] },
  ])
  expect(blocks).toEqual([{ type: 'page-gallery', source: 'manual', pageIds: [], pageRefs: ['https://x.com/a', 'https://x.com/b'] }])
})

it('reports low confidence for an images-only outline', () => {
  const { confidence } = mapOutlineToBlocks([
    { kind: 'image', ref: 'img-1', src: 'a', caption: '' },
    { kind: 'image', ref: 'img-2', src: 'b', caption: '' },
  ])
  expect(confidence).toBeLessThan(0.5)
})

it('reports high confidence when it recognized non-image structure', () => {
  const { confidence } = mapOutlineToBlocks([
    { kind: 'image', ref: 'img-1', src: 'a', caption: 'c' },
    { kind: 'quote', text: 'q', attribution: '' },
  ])
  expect(confidence).toBeGreaterThanOrEqual(0.5)
})

it('stays confident and keeps the testimonial when many bare images precede a little structure', () => {
  const { blocks, confidence } = mapOutlineToBlocks([
    { kind: 'image', ref: 'img-1', src: 'a', caption: '' },
    { kind: 'image', ref: 'img-2', src: 'b', caption: '' },
    { kind: 'image', ref: 'img-3', src: 'c', caption: '' },
    { kind: 'image', ref: 'img-4', src: 'd', caption: '' },
    { kind: 'quote', text: 'Amazing.', attribution: 'Vivek' },
  ])
  expect(confidence).toBeGreaterThanOrEqual(0.5)
  expect(blocks.some((b) => b.type === 'testimonial')).toBe(true)
})

it('chunks a run of 10 bare images into photos(9) + photo(1), never a 1-image photos block', () => {
  const outline = Array.from({ length: 10 }, (_, i) => ({ kind: 'image', ref: `img-${i + 1}`, src: 's', caption: '' }))
  const { blocks } = mapOutlineToBlocks(outline)
  expect(blocks).toHaveLength(2)
  expect(blocks[0]).toEqual({ type: 'photos', refs: outline.slice(0, 9).map((n) => n.ref), layout: 'stacked' })
  expect(blocks[1]).toEqual({ type: 'photo', ref: 'img-10', caption: '' })
  expect(blocks.every((b) => b.type !== 'photos' || b.refs.length > 1)).toBe(true)
})
