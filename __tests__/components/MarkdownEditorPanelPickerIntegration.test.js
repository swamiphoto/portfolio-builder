import { render, screen, fireEvent } from '@testing-library/react'
import MarkdownEditorPanel from '@/components/admin/gallery-builder/MarkdownEditorPanel'

// Deliberately do NOT mock PhotoPickerModal — the existing MarkdownEditorPanel
// test suite mocks it out entirely, which can't catch a real wiring bug
// between the panel and the picker (prop shape mismatches, etc). This test
// mounts the real component.

// jsdom has no ResizeObserver, and even a no-op stub leaves the picker's
// virtualized grid at containerWidth 0 (it never lays anything out), so we
// fire the callback with a fixed size as soon as the grid is observed.
beforeAll(() => {
  global.ResizeObserver = class {
    constructor(cb) { this.cb = cb }
    observe() { this.cb([{ contentRect: { width: 400, height: 500 } }]) }
    unobserve() {}
    disconnect() {}
  }
})

jest.mock('@/common/imageUtils', () => ({ getSizedUrl: (url) => url }))

const block = { type: 'text', content: 'Hello world' }

const libraryImages = [
  {
    assetId: 'a9',
    publicUrl: 'https://gcs/photos/pic.jpg',
    originalFilename: 'pic.jpg',
    caption: '',
    tags: [],
    setIds: [],
    source: { provider: 'manual', type: 'upload' },
    orientation: 'unknown',
    usage: { usageCount: 0 },
    createdAt: null,
    updatedAt: null,
    capture: null,
  },
]

it('selecting a photo from the real picker inserts it into the markdown content', () => {
  const onChange = jest.fn()
  render(
    <MarkdownEditorPanel
      open
      block={block}
      onChange={onChange}
      onClose={jest.fn()}
      libraryImages={libraryImages}
      libraryConfig={{}}
      libraryLoading={false}
    />
  )

  // Open the picker via the panel's toolbar "Image" button.
  fireEvent.click(screen.getByRole('button', { name: /image/i }))

  // The real PhotoPickerModal's Library tab renders the asset as a tile.
  // blockType="photo" makes it single-select, so a click on the tile
  // confirms it immediately.
  const tile = screen.getByAltText('pic.jpg')
  fireEvent.click(tile)

  const call = onChange.mock.calls.at(-1)?.[0]
  expect(call).toBeTruthy()
  expect(call.content).toContain('![](https://gcs/photos/pic.jpg)')
})
