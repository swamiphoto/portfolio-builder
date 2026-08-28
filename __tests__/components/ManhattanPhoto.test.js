import { render } from '@testing-library/react'
import ManhattanPhoto from '../../components/image-displays/gallery/photo-block/ManhattanPhoto'

it('renders a full-width sharp photo with an inside caption', () => {
  const { container, getAllByText } = render(
    <ManhattanPhoto imageUrl="https://x/a.jpg" caption="A quiet street" />
  )
  // Spans the full content width (same span as every other block, no cap) so all
  // blocks line up on the left and right edges.
  const fig = container.querySelector('figure')
  expect(fig.className).toContain('w-full')
  expect(fig.style.maxWidth).toBe('')
  const img = container.querySelector('img')
  expect(img.className).not.toMatch(/rounded/)
  // The caption renders twice by design: a desktop hover overlay inside the
  // photo, and a mobile (md:hidden) caption beneath it.
  const caps = getAllByText('A quiet street')
  expect(caps).toHaveLength(2)
  expect(caps.some((el) => el.closest('[data-hover-caption]'))).toBe(true)
  expect(caps.some((el) => !el.closest('[data-hover-caption]') && el.hasAttribute('data-mobile-caption'))).toBe(true)
})

it('renders no caption element when caption is empty', () => {
  const { container } = render(<ManhattanPhoto imageUrl="https://x/a.jpg" caption="" />)
  expect(container.querySelector('[data-hover-caption]')).toBeNull()
  expect(container.querySelector('figcaption')).toBeNull()
})
