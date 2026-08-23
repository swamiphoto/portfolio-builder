import { render, fireEvent } from '@testing-library/react'

jest.mock('../../common/dragContext', () => ({
  useDrag: () => ({ startDrag: jest.fn(), endDrag: jest.fn(), drag: null, dropTargetPageId: null, setDropTargetPageId: jest.fn() }),
  DragProvider: ({ children }) => children,
}))
jest.mock('../../common/imageUtils', () => ({ getSizedUrl: (url) => url }))
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: null, status: 'unauthenticated' }) }))
jest.mock('../../common/assetRefs', () => ({
  normalizeImageRefs: (x) => Array.isArray(x) ? x : [],
  buildMultiImageFields: (refs) => ({ images: refs }),
  removeImageRef: (refs, ref) => refs.filter(r => r.url !== ref.url),
}))
jest.mock('../../components/admin/gallery-builder/DesignPopover', () => ({ __esModule: true, default: () => null }))
jest.mock('../../components/admin/AdminPhotoLightbox', () => ({ __esModule: true, default: () => null }))

const BlockCard = require('../../components/admin/gallery-builder/BlockCard').default

const baseProps = { dragHandleProps: {}, onRemove: () => {}, onAddPhotos: () => {}, onRemovePhoto: () => {}, pages: [] }
const file = { name: 'shot.jpg', type: 'image/jpeg' }

test('dropping desktop files on a photo set uploads them instead of the URL path', () => {
  const onUploadFiles = jest.fn(() => Promise.resolve())
  const onUpdate = jest.fn()
  render(<BlockCard block={{ type: 'masonry', images: [{ assetId: 'a1', url: 'https://x/a.jpg', caption: '' }] }} onUpdate={onUpdate} onUploadFiles={onUploadFiles} {...baseProps} />)
  fireEvent.drop(document.querySelector('.grid'), { dataTransfer: { files: [file], getData: () => '' } })
  expect(onUploadFiles).toHaveBeenCalledWith([file])
  expect(onUpdate).not.toHaveBeenCalled()
})

test('dropping a desktop file on an empty single photo block uploads it', () => {
  const onUploadFiles = jest.fn(() => Promise.resolve())
  const { getByText } = render(<BlockCard block={{ type: 'photo', imageUrl: '' }} onUpdate={() => {}} onUploadFiles={onUploadFiles} {...baseProps} />)
  fireEvent.drop(getByText('Drag a photo here'), { dataTransfer: { files: [file], getData: () => '' } })
  expect(onUploadFiles).toHaveBeenCalledWith([file])
})

test('without onUploadFiles, a file drop is ignored (no crash, no update)', () => {
  const onUpdate = jest.fn()
  render(<BlockCard block={{ type: 'masonry', images: [] }} onUpdate={onUpdate} {...baseProps} />)
  fireEvent.drop(document.querySelector('.grid'), { dataTransfer: { files: [file], getData: () => '' } })
  expect(onUpdate).not.toHaveBeenCalled()
})
