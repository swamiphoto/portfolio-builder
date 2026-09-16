import { render } from '@testing-library/react'
import MarkdownText from '../../components/image-displays/MarkdownText'

const imgOf = (c) => c.querySelector('img')
const figOf = (c) => c.querySelector('figure')

it('centered image at default (full width) — backward compatible', () => {
  const { container } = render(<MarkdownText content={'![](http://x/c.jpg)'} />)
  expect(imgOf(container)).toBeInTheDocument()
  expect(figOf(container).className).not.toMatch(/float-left/)
})
it('side layout floats left and wraps text', () => {
  const { container } = render(<MarkdownText content={'![Cat](http://x/c.jpg){layout=side size=m}'} />)
  expect(figOf(container).className).toMatch(/float-left/)
})
it('full-bleed spans edge to edge', () => {
  const { container } = render(<MarkdownText content={'![](http://x/c.jpg){layout=full-bleed}'} />)
  expect(figOf(container).className).toMatch(/w-screen|w-full/)
})
it('caption style applies (serif figcaption)', () => {
  const { container } = render(<MarkdownText content={'![Cat](http://x/c.jpg){style=serif}'} />)
  const cap = container.querySelector('figcaption')
  expect(cap).toHaveTextContent('Cat')
  expect(cap.getAttribute('style') || '').toMatch(/Cormorant|italic/i)
})
