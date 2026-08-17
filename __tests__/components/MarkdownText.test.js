import { render, screen } from '@testing-library/react'
import MarkdownText from '@/components/image-displays/MarkdownText'

const classes = { heading: 'h-cls', body: 'b-cls', quote: 'q-cls' }

it('renders headings, emphasis, images and quotes with the given classes', () => {
  const { container } = render(
    <MarkdownText content={'# About Me\n\nI shoot **film** mostly.\n\n> light is everything\n\n![On location](https://gcs/x.jpg)'} variantClasses={classes} />
  )
  expect(screen.getByText('About Me').className).toContain('h-cls')
  expect(screen.getByText('film').tagName).toBe('STRONG')
  expect(screen.getByText('light is everything').className).toContain('q-cls')
  const img = container.querySelector('img')
  expect(img.getAttribute('src')).toBe('https://gcs/x.jpg')
  expect(screen.getByText('On location')).toBeTruthy() // caption
})

it('never renders raw HTML from content', () => {
  const { container } = render(<MarkdownText content={'<img src=x onerror=alert(1)> hi'} variantClasses={classes} />)
  expect(container.querySelector('img')).toBeNull()
})
