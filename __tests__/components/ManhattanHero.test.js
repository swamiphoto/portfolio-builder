import { render } from '@testing-library/react'
import ManhattanHero from '../../components/image-displays/page/ManhattanHero'

it('renders a bottom action bar with View Music, no title/description, never Client Login', () => {
  const { getByText, queryByText, container } = render(
    <ManhattanHero title="Weddings" description="Documentary work" slideshowHref="/x/slideshow" />
  )
  // No top hero: the page name comes from the active rail link, not a title strip.
  expect(queryByText('Weddings')).toBeNull()
  expect(queryByText('Documentary work')).toBeNull()
  // Actions live in the bottom bar.
  expect(container.querySelector('.manhattan-actionbar')).toBeTruthy()
  expect(getByText('View Music')).toBeInTheDocument()
  expect(queryByText('Client Login')).toBeNull()
})

it('renders nothing when there are no actions', () => {
  const { container } = render(<ManhattanHero slideshowHref={null} />)
  expect(container.querySelector('[data-manhattan-hero]')).toBeNull()
})
