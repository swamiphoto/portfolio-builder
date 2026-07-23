import { render } from '@testing-library/react'
import ManhattanPhoto from '../../components/image-displays/gallery/photo-block/ManhattanPhoto'

it('renders a left-anchored sharp photo with an inside caption', () => {
  const { container, getByText } = render(
    <ManhattanPhoto imageUrl="https://x/a.jpg" caption="A quiet street" />
  )
  const fig = container.querySelector('figure')
  expect(fig.className).toContain('mr-auto')
  const img = container.querySelector('img')
  expect(img.className).not.toMatch(/rounded/)
  expect(getByText('A quiet street').closest('[data-hover-caption]')).toBeTruthy()
})

it('renders no caption element when caption is empty', () => {
  const { container } = render(<ManhattanPhoto imageUrl="https://x/a.jpg" caption="" />)
  expect(container.querySelector('[data-hover-caption]')).toBeNull()
})
