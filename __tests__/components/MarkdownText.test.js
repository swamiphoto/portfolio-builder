import { render, screen } from '@testing-library/react'
import MarkdownText from '@/components/image-displays/MarkdownText'

const classes = { heading: 'h-cls', body: 'b-cls', quote: 'q-cls' }

const imgOf = (c) => c.querySelector('img')
const figOf = (c) => c.querySelector('figure')

it('renders headings, emphasis, images and quotes with the given classes', () => {
  const { container } = render(
    <MarkdownText
      content={'# About Me\n\nI shoot **film** mostly.\n\n> light is everything\n\n![On location](https://gcs/x.jpg)'}
      variantClasses={classes}
      assetsByUrl={{ 'https://gcs/x.jpg': { caption: 'On location' } }}
    />
  )
  expect(screen.getByText('About Me').className).toContain('h-cls')
  expect(screen.getByText('film').tagName).toBe('STRONG')
  expect(screen.getByText('light is everything').className).toContain('q-cls')
  const img = container.querySelector('img')
  expect(img.getAttribute('src')).toBe('https://gcs/x.jpg')
  expect(screen.getByText('On location')).toBeTruthy() // caption resolved from the library
})

it('never renders raw HTML from content', () => {
  const { container } = render(<MarkdownText content={'<img src=x onerror=alert(1)> hi'} variantClasses={classes} />)
  expect(container.querySelector('img')).toBeNull()
})

it('refuses javascript: links, rendering their text without an anchor', () => {
  const { container } = render(<MarkdownText content={'[click me](javascript:alert(1))'} variantClasses={classes} />)
  expect(container.querySelector('a')).toBeNull()
  // Regex matcher: the parser's url token stops at the first ")", leaving a
  // literal ")" beside the link text, so the element's text is "click me)".
  expect(screen.getByText(/click me/)).toBeTruthy()
})

it('refuses protocol-relative links, rendering their text without an anchor', () => {
  const { container } = render(<MarkdownText content={'[x](//evil.com)'} variantClasses={classes} />)
  expect(container.querySelector('a')).toBeNull()
  expect(screen.getByText('x')).toBeTruthy()
})

it('centered image at default (full width) — backward compatible', () => {
  const { container } = render(<MarkdownText content={'![](http://x/c.jpg)'} />)
  expect(imgOf(container)).toBeInTheDocument()
  expect(figOf(container).className).not.toMatch(/float-left/)
})
it('side layout still floats (unchanged)', () => {
  const { container } = render(<MarkdownText content={'![](http://x/c.jpg){layout=side size=m}'} assetsByUrl={{}} />)
  expect(container.querySelector('figure').className).toMatch(/float-left/)
})
it('full-bleed spans edge to edge', () => {
  const { container } = render(<MarkdownText content={'![](http://x/c.jpg){layout=full-bleed}'} />)
  expect(figOf(container).className).toMatch(/w-screen|w-full/)
})
it('caption style applies (serif figcaption)', () => {
  const { container } = render(<MarkdownText content={'![](http://x/c.jpg){style=serif}'} assetsByUrl={{ 'http://x/c.jpg': { caption: 'Cat' } }} />)
  const cap = container.querySelector('figcaption')
  expect(cap).toHaveTextContent('Cat')
  expect(cap.getAttribute('style') || '').toMatch(/Cormorant|italic/i)
})
it('renders the library caption for an image (from assetsByUrl)', () => {
  const { container } = render(<MarkdownText content={'![](http://x/c.jpg){style=serif}'} assetsByUrl={{ 'http://x/c.jpg': { caption: 'Library cap' } }} />)
  const cap = container.querySelector('figcaption')
  expect(cap).toHaveTextContent('Library cap')
})
it('renders no caption when the asset has none', () => {
  const { container } = render(<MarkdownText content={'![](http://x/c.jpg)'} assetsByUrl={{}} />)
  expect(container.querySelector('figcaption')).toBeNull()
})
