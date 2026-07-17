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
