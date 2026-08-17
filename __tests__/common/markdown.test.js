import { parseMarkdown, blockToMarkdownSeed } from '@/common/markdown'

it('parses headings, paragraphs, quotes, lists, images', () => {
  const ast = parseMarkdown('# Title\n\nHello **bold** and *ital*.\n\n> a quote\n\n- one\n- two\n\n![Me at work](https://gcs/me.jpg)')
  expect(ast.map((b) => b.type)).toEqual(['heading', 'paragraph', 'quote', 'list', 'image'])
  expect(ast[0]).toMatchObject({ level: 1, children: [{ type: 'text', value: 'Title' }] })
  expect(ast[1].children).toEqual([
    { type: 'text', value: 'Hello ' },
    { type: 'bold', children: [{ type: 'text', value: 'bold' }] },
    { type: 'text', value: ' and ' },
    { type: 'italic', children: [{ type: 'text', value: 'ital' }] },
    { type: 'text', value: '.' },
  ])
  expect(ast[4]).toEqual({ type: 'image', url: 'https://gcs/me.jpg', caption: 'Me at work' })
})

it('parses links and nested emphasis', () => {
  const ast = parseMarkdown('See [my **work**](https://x.com/work) now')
  expect(ast[0].children[1]).toMatchObject({ type: 'link', url: 'https://x.com/work' })
  expect(ast[0].children[1].children[1]).toMatchObject({ type: 'bold' })
})

it('treats raw HTML as literal text (no passthrough)', () => {
  const ast = parseMarkdown('<script>alert(1)</script> hi')
  expect(ast[0].children[0].value).toContain('<script>')
})

it('plain text round-trips as a single paragraph per blank-line group', () => {
  const ast = parseMarkdown('First para line one.\nStill first para.\n\nSecond para.')
  expect(ast).toHaveLength(2)
  expect(ast[0].children[0].value).toBe('First para line one.\nStill first para.')
})

it('keeps content that follows a heading with only a single newline', () => {
  const ast = parseMarkdown('# Title\nBody text')
  expect(ast.map((b) => b.type)).toEqual(['heading', 'paragraph'])
  expect(ast[1].children[0].value).toBe('Body text')
})

it('handles empty input', () => {
  expect(parseMarkdown('')).toEqual([])
  expect(parseMarkdown(null)).toEqual([])
})

describe('blockToMarkdownSeed', () => {
  it('maps variant 1 (heading) to a level-1 heading', () => {
    expect(blockToMarkdownSeed({ content: 'Title', variant: 1 })).toBe('# Title')
  })

  it('maps variant 2 (subheading) to a level-2 heading', () => {
    expect(blockToMarkdownSeed({ content: 'Sub', variant: 2 })).toBe('## Sub')
  })

  it('maps variant 4 (quote) to a blockquote line', () => {
    expect(blockToMarkdownSeed({ content: 'Wise words', variant: 4 })).toBe('> Wise words')
  })

  it('leaves variant 3 (body) and unset variants as plain content', () => {
    expect(blockToMarkdownSeed({ content: 'Body copy', variant: 3 })).toBe('Body copy')
    expect(blockToMarkdownSeed({ content: 'No variant' })).toBe('No variant')
  })

  it('passes markdown-formatted blocks through untouched, ignoring variant', () => {
    expect(blockToMarkdownSeed({ content: '# Already markdown', format: 'markdown', variant: 3 })).toBe('# Already markdown')
  })

  it('handles missing block / content gracefully', () => {
    expect(blockToMarkdownSeed(null)).toBe('')
    expect(blockToMarkdownSeed({ variant: 1 })).toBe('# ')
  })
})
