import { render, act } from '@testing-library/react'

jest.mock('next/router', () => ({ useRouter: () => ({ query: {}, push: jest.fn(), pathname: '/' }) }))
jest.mock('react-responsive', () => ({ useMediaQuery: () => false }))
jest.mock('../../components/wiggle-line/WiggleLine', () => ({ __esModule: true, default: () => null }))
jest.mock('../../components/image-displays/gallery/gallery-cover/GalleryCover', () => ({ __esModule: true, default: () => null }))

const GalleryPreview = require('../../components/admin/gallery-builder/GalleryPreview').default

const galleryWithFont = (font) => ({
  name: '', description: '',
  blocks: [{ type: 'text', content: 'Hello', font, themeState: { kyoto: { variant: 'body' } } }],
})

// onBlockClick is passed by the editor — it makes the block clickable, which put a
// `style: { cursor: 'pointer' }` into hoverProps that clobbered the inline fontFamily.
// Passing it here reproduces the editor condition (the published site has no onBlockClick).
test('changing block.font updates the preview text fontFamily through the debounce (editor: onBlockClick set)', () => {
  jest.useFakeTimers()
  const { container, rerender } = render(
    <GalleryPreview gallery={galleryWithFont('serif')} pages={[]} siteConfig={{ design: { theme: 'kyoto' } }} username="me" onBlockClick={() => {}} />
  )
  act(() => { jest.advanceTimersByTime(400) })
  const el = container.querySelector('.text-block')
  expect(el.style.fontFamily).toMatch(/Cormorant/)
  // The cursor from hoverProps must coexist with the font, not replace it.
  expect(el.style.cursor).toBe('pointer')

  rerender(
    <GalleryPreview gallery={galleryWithFont('display')} pages={[]} siteConfig={{ design: { theme: 'kyoto' } }} username="me" onBlockClick={() => {}} />
  )
  act(() => { jest.advanceTimersByTime(400) })
  expect(container.querySelector('.text-block').style.fontFamily).toMatch(/Muse/)
  jest.useRealTimers()
})
