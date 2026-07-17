import { render } from '@testing-library/react'

jest.mock('next/router', () => ({ useRouter: () => ({ query: {}, push: jest.fn(), pathname: '/' }) }))
jest.mock('react-responsive', () => ({ useMediaQuery: () => false }))
jest.mock('../../components/wiggle-line/WiggleLine', () => ({ __esModule: true, default: () => null }))
jest.mock('../../components/image-displays/gallery/gallery-cover/GalleryCover', () => ({ __esModule: true, default: () => null }))

const Gallery = require('../../components/image-displays/gallery/Gallery').default

const PLAY_TRIANGLE = 'path[d="M20 17 L33 24 L20 31 Z"]' // the placeholder's play icon

test('an empty video block shows a placeholder (with a data-block-index to scroll to)', () => {
  const { container } = render(
    <Gallery name="" description="" blocks={[{ type: 'video', url: '' }]} pages={[]} themeId="kyoto" showPlaceholders />
  )
  const block = container.querySelector('.video-block')
  expect(block).not.toBeNull()
  expect(block.getAttribute('data-block-index')).toBe('0')
  expect(block.querySelector(PLAY_TRIANGLE)).toBeInTheDocument()
})

test('a video block with a url does not show the placeholder', () => {
  const { container } = render(
    <Gallery name="" description="" blocks={[{ type: 'video', url: 'https://youtu.be/abc' }]} pages={[]} themeId="kyoto" showPlaceholders />
  )
  expect(container.querySelector(PLAY_TRIANGLE)).toBeNull()
})

test('the empty video placeholder shows the caption', () => {
  const { getByText } = render(
    <Gallery name="" description="" blocks={[{ type: 'video', url: '', caption: 'Behind the scenes' }]} pages={[]} themeId="kyoto" showPlaceholders />
  )
  expect(getByText('Behind the scenes')).toBeInTheDocument()
})

test('the empty video placeholder reflects the layout variant', () => {
  const emptyVideo = (variant) => ({ type: 'video', url: '', themeState: { kyoto: { variant } } })
  const full = render(<Gallery name="" description="" blocks={[emptyVideo('full-bleed')]} pages={[]} themeId="kyoto" showPlaceholders />)
  const fullHtml = full.container.querySelector('.video-block').innerHTML
  // Full bleed = full content width, square corners (not the inset rounded centered box).
  expect(fullHtml).toMatch(/aspect-\[16\/9\]/)
  expect(fullHtml).toMatch(/rounded-none/)
  expect(fullHtml).not.toMatch(/w-screen/)

  const centered = render(<Gallery name="" description="" blocks={[emptyVideo('centered')]} pages={[]} themeId="kyoto" showPlaceholders />)
  const centeredHtml = centered.container.querySelector('.video-block').innerHTML
  expect(centeredHtml).toMatch(/w-\[85%\]/)
  expect(centeredHtml).toMatch(/rounded-3xl/)
})

test('the empty video placeholder applies the caption style (accent = uppercase red)', () => {
  const block = { type: 'video', url: '', caption: 'Reel', captionStyle: 'accent' }
  const { getByText } = render(<Gallery name="" description="" blocks={[block]} pages={[]} themeId="kyoto" showPlaceholders />)
  const cap = getByText('Reel')
  expect(cap.style.textTransform).toBe('uppercase')
  expect(cap.style.color).toBe('rgb(220, 38, 38)')
})
