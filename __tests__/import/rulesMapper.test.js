/** @jest-environment node */
import { mapOutlineToBlocks } from '@/common/import/rulesMapper'

it('maps a captioned image to a photo block carrying the ref and caption', () => {
  const { blocks } = mapOutlineToBlocks([{ kind: 'image', ref: 'img-1', src: 'a', caption: 'SF in fog' }])
  expect(blocks).toEqual([{ type: 'photo', ref: 'img-1', caption: 'SF in fog' }])
})

it('attaches a lone paragraph immediately after a photo as that photo\'s caption, with no separate text block', () => {
  const { blocks } = mapOutlineToBlocks([
    { kind: 'image', ref: 'img-1', src: 'a', caption: '' },
    { kind: 'paragraph', text: 'Aurora Borealis in California — a rare shot.' },
  ])
  expect(blocks).toEqual([{ type: 'photo', ref: 'img-1', caption: 'Aurora Borealis in California — a rare shot.' }])
})

it('leaves a run of 2+ consecutive paragraphs after a photo as prose, not a caption', () => {
  const { blocks } = mapOutlineToBlocks([
    { kind: 'image', ref: 'img-1', src: 'a', caption: '' },
    { kind: 'paragraph', text: 'First paragraph.' },
    { kind: 'paragraph', text: 'Second paragraph.' },
  ])
  expect(blocks[0]).toEqual({ type: 'photo', ref: 'img-1', caption: '' })
  expect(blocks[1]).toEqual({ type: 'text', variant: 3, content: 'First paragraph.\n\nSecond paragraph.' })
})

it('keeps a lone paragraph with no preceding image as its own text block', () => {
  const { blocks } = mapOutlineToBlocks([{ kind: 'paragraph', text: 'Hello world, welcome.' }])
  expect(blocks).toEqual([{ type: 'text', variant: 3, content: 'Hello world, welcome.' }])
})

it('maps a blockquote to a testimonial', () => {
  const { blocks } = mapOutlineToBlocks([{ kind: 'quote', text: 'Amazing.', attribution: 'Vivek' }])
  expect(blocks).toEqual([{ type: 'testimonial', text: 'Amazing.', name: 'Vivek', ref: null }])
})

it('maps a heading to a text heading and a plain paragraph run to a plain text block (no format)', () => {
  const { blocks } = mapOutlineToBlocks([
    { kind: 'heading', level: 2, text: 'Recent Work' },
    { kind: 'paragraph', text: 'One.' },
    { kind: 'paragraph', text: 'Two.' },
  ])
  expect(blocks[0]).toEqual({ type: 'text', variant: 1, content: 'Recent Work' })
  expect(blocks[1]).toEqual({ type: 'text', variant: 3, content: 'One.\n\nTwo.' })
})

it('sets format: markdown only when the paragraph content has markdown syntax', () => {
  const { blocks } = mapOutlineToBlocks([{ kind: 'paragraph', text: 'Check out my [portfolio](https://x.com/p).' }])
  expect(blocks[0]).toEqual({
    type: 'text',
    variant: 3,
    format: 'markdown',
    content: 'Check out my [portfolio](https://x.com/p).',
  })
})

it('sets format: markdown when the only markdown is bold (** or __)', () => {
  const { blocks } = mapOutlineToBlocks([{ kind: 'paragraph', text: 'Now booking for **2027**.' }])
  expect(blocks[0]).toEqual({ type: 'text', variant: 3, format: 'markdown', content: 'Now booking for **2027**.' })

  const { blocks: b2 } = mapOutlineToBlocks([{ kind: 'paragraph', text: 'Now booking for __2027__.' }])
  expect(b2[0]).toEqual({ type: 'text', variant: 3, format: 'markdown', content: 'Now booking for __2027__.' })
})

it('leaves a plain paragraph with no markdown syntax without a format field', () => {
  const { blocks } = mapOutlineToBlocks([{ kind: 'paragraph', text: 'Now booking for the 2027 season.' }])
  expect(blocks[0]).toEqual({ type: 'text', variant: 3, content: 'Now booking for the 2027 season.' })
  expect(blocks[0].format).toBeUndefined()
})

it('groups 2+ consecutive captioned images into one stacked photos block with aligned captions', () => {
  const { blocks } = mapOutlineToBlocks([
    { kind: 'image', ref: 'img-1', src: 'a', caption: 'San Francisco in fog' },
    { kind: 'image', ref: 'img-2', src: 'b', caption: 'Recreating a Mac wallpaper' },
  ])
  expect(blocks).toEqual([{
    type: 'photos',
    layout: 'stacked',
    refs: ['img-1', 'img-2'],
    captions: ['San Francisco in fog', 'Recreating a Mac wallpaper'],
  }])
})

it('maps consecutive uncaptioned images into a photos grid, keeping refs and empty captions', () => {
  const { blocks } = mapOutlineToBlocks([
    { kind: 'image', ref: 'img-1', src: 'a', caption: '' },
    { kind: 'image', ref: 'img-2', src: 'b', caption: '' },
  ])
  expect(blocks).toEqual([{ type: 'photos', refs: ['img-1', 'img-2'], layout: 'stacked', captions: ['', ''] }])
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
  expect(blocks[0]).toEqual({
    type: 'photos',
    refs: outline.slice(0, 9).map((n) => n.ref),
    layout: 'stacked',
    captions: outline.slice(0, 9).map(() => ''),
  })
  expect(blocks[1]).toEqual({ type: 'photo', ref: 'img-10', caption: '' })
  expect(blocks.every((b) => b.type !== 'photos' || b.refs.length > 1)).toBe(true)
})

it('chunks a run of ~20 images into multiple <=9 photos blocks with at least one single interspersed, every image placed exactly once', () => {
  const outline = Array.from({ length: 20 }, (_, i) => ({ kind: 'image', ref: `img-${i + 1}`, src: 's', caption: '' }))
  const { blocks } = mapOutlineToBlocks(outline)

  const photosBlocks = blocks.filter((b) => b.type === 'photos')
  const singleBlocks = blocks.filter((b) => b.type === 'photo')
  expect(photosBlocks.every((b) => b.refs.length <= 9 && b.refs.length > 1)).toBe(true)
  expect(singleBlocks.length).toBeGreaterThanOrEqual(1)

  const allRefsInOrder = blocks.flatMap((b) => (b.type === 'photos' ? b.refs : [b.ref]))
  expect(allRefsInOrder).toEqual(outline.map((n) => n.ref))
  expect(new Set(allRefsInOrder).size).toBe(20)
})
