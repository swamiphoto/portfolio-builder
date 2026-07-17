import { render, act } from '@testing-library/react'

jest.mock('next/router', () => ({ useRouter: () => ({ query: {}, push: jest.fn(), pathname: '/' }) }))
jest.mock('react-responsive', () => ({ useMediaQuery: () => false }))
jest.mock('../../components/wiggle-line/WiggleLine', () => ({ __esModule: true, default: () => null }))
jest.mock('../../components/image-displays/gallery/gallery-cover/GalleryCover', () => ({ __esModule: true, default: () => null }))

const GalleryPreview = require('../../components/admin/gallery-builder/GalleryPreview').default

const gal = (blocks) => ({ name: '', description: '', blocks })

// Adding a block should appear in the preview immediately (so the editor can scroll
// to its placeholder), not 250ms later after the content debounce.
test('a newly added block renders in the preview immediately (block-count flush)', () => {
  jest.useFakeTimers()
  const { container, rerender } = render(
    <GalleryPreview gallery={gal([{ type: 'text', content: 'One' }])} pages={[]} siteConfig={{ design: { theme: 'kyoto' } }} username="me" />
  )
  act(() => {})
  expect(container.querySelector('[data-block-index="1"]')).toBeNull()

  act(() => {
    rerender(
      <GalleryPreview gallery={gal([{ type: 'text', content: 'One' }, { type: 'video', url: '' }])} pages={[]} siteConfig={{ design: { theme: 'kyoto' } }} username="me" />
    )
  })
  // No timer advance: the added block is present because the count change flushed it.
  expect(container.querySelector('[data-block-index="1"]')).not.toBeNull()
  jest.useRealTimers()
})
