import { parseMarkdown } from '@/common/markdown'

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
