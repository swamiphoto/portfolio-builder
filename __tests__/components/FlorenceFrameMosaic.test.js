import { render } from '@testing-library/react'
import FlorenceWall from '@/components/image-displays/themes/florence/FlorenceWall'

// The mosaic branch used to return before the frame check, so Frame pills
// silently did nothing on Mosaic-layout galleries. A chosen frame now wins:
// the block renders as the framed set.
it('frame takes effect on an explicit Mosaic photos block', () => {
  const { container } = render(<FlorenceWall name="W" siteConfig={{}} blocks={[
    { type: 'photos', images: [{ url: 'https://x/a.jpg' }, { url: 'https://x/b.jpg' }, { url: 'https://x/c.jpg' }], imageUrls: [], themeState: { florence: { variant: 'mosaic' } }, florenceFrame: 'mat' },
  ]} />)
  expect(container.querySelectorAll('.florence-mount--mat').length).toBeGreaterThan(0)
})

it('mosaic without a frame keeps its mosaic packing', () => {
  const { container } = render(<FlorenceWall name="W" siteConfig={{}} blocks={[
    { type: 'photos', images: [{ url: 'https://x/a.jpg' }, { url: 'https://x/b.jpg' }, { url: 'https://x/c.jpg' }], imageUrls: [], themeState: { florence: { variant: 'mosaic' } } },
  ]} />)
  expect(container.querySelectorAll('.florence-col--mosaic').length).toBe(1)
})
