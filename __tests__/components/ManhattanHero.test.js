import { render } from '@testing-library/react'
import ManhattanHero from '../../components/image-displays/page/ManhattanHero'

it('renders title, description, and View Music but never Client Login', () => {
  const { getByText, queryByText } = render(
    <ManhattanHero title="Weddings" description="Documentary work" slideshowHref="/x/slideshow" />
  )
  expect(getByText('Weddings')).toBeInTheDocument()
  expect(getByText('Documentary work')).toBeInTheDocument()
  expect(getByText('View Music')).toBeInTheDocument()
  expect(queryByText('Client Login')).toBeNull()
})

it('renders nothing when there is no content or action', () => {
  const { container } = render(<ManhattanHero title="" description="" slideshowHref={null} />)
  expect(container.querySelector('[data-manhattan-hero]')).toBeNull()
})
