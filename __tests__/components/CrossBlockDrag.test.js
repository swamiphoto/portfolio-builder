import { render, fireEvent } from '@testing-library/react'

jest.mock('../../common/dragContext', () => ({
  useDrag: () => ({ startDrag: jest.fn(), endDrag: jest.fn(), drag: null, dropTargetPageId: null, setDropTargetPageId: jest.fn() }),
  DragProvider: ({ children }) => children,
}))
jest.mock('../../common/imageUtils', () => ({ getSizedUrl: (url) => url }))
jest.mock('../../common/assetRefs', () => ({
  normalizeImageRefs: (x) => Array.isArray(x) ? x : [],
  buildMultiImageFields: (refs) => ({ images: refs }),
  removeImageRef: (refs, ref) => refs.filter(r => r.url !== ref.url),
}))
jest.mock('../../components/admin/gallery-builder/DesignPopover', () => ({ __esModule: true, default: () => null }))
jest.mock('../../components/admin/AdminPhotoLightbox', () => ({ __esModule: true, default: () => null }))

const BlockCard = require('../../components/admin/gallery-builder/BlockCard').default

const photosBlock = {
  type: 'masonry',
  images: [
    { assetId: 'a1', url: 'https://example.com/a.jpg', caption: '' },
  ],
}

test('dropping a cross-block drag payload appends image to target block', () => {
  const onUpdate = jest.fn()
  render(
    <BlockCard
      block={photosBlock}
      dragHandleProps={{}}
      onUpdate={onUpdate}
      onRemove={() => {}}
      onAddPhotos={() => {}}
      onRemovePhoto={() => {}}
      pages={[]}
    />
  )
  const grid = document.querySelector('.grid')
  const payload = JSON.stringify({
    imageRefs: [{ assetId: 'b2', url: 'https://example.com/b.jpg', caption: '' }],
    sourceBlockType: 'masonry',
    sourceBlockKey: 'different-key',
  })
  fireEvent.drop(grid, {
    dataTransfer: {
      getData: (type) => type === 'application/x-photo-drag' ? payload : '',
    },
  })
  expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
    images: expect.arrayContaining([
      expect.objectContaining({ url: 'https://example.com/a.jpg' }),
      expect.objectContaining({ url: 'https://example.com/b.jpg' }),
    ]),
  }))
})
