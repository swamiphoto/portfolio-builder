// Verifies the sidebar wiring that feeds real-time reposition into the preview:
// opening the thumbnail "…" menu → Reposition → dragging the focal marker must
// call onUpdatePage (which the editor turns into a live config update).
import { render, fireEvent, screen } from '@testing-library/react'

jest.mock('../../common/dragContext', () => ({
  useDrag: () => ({ startDrag: jest.fn(), endDrag: jest.fn() }),
  DragProvider: ({ children }) => children,
}))
jest.mock('../../common/imageUtils', () => ({ getSizedUrl: (url) => url }))
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: null }) }))
jest.mock('../../components/admin/gallery-builder/DesignPopover', () => ({ __esModule: true, default: () => null }))
jest.mock('../../components/admin/AdminPhotoLightbox', () => ({ __esModule: true, default: () => null }))
jest.mock('../../components/admin/gallery-builder/PageGalleryPickerModal', () => ({ __esModule: true, default: () => null }))

const BlockCard = require('../../components/admin/gallery-builder/BlockCard').default

const page = { id: 'pg1', title: 'Trips', thumbnail: { imageUrl: 'https://x/t.jpg', useCover: false } }
const block = { type: 'page-gallery', source: 'manual', pageIds: ['pg1'] }

test('reposition from the thumbnail "…" menu calls onUpdatePage during drag', () => {
  const onUpdatePage = jest.fn()
  render(
    <BlockCard
      block={block}
      dragHandleProps={{}}
      onUpdate={() => {}}
      onRemove={() => {}}
      onAddPhotos={() => {}}
      onRemovePhoto={() => {}}
      pages={[page]}
      onUpdatePage={onUpdatePage}
    />
  )

  fireEvent.click(screen.getByTitle('Options'))     // open the thumbnail "…" menu
  fireEvent.click(screen.getByText('Reposition'))   // choose Reposition → opens FocalPointEditor

  const focal = screen.getByTestId('focal-image')
  fireEvent.pointerDown(focal, { clientX: 10, clientY: 10 })

  // The live update must fire on drag (jsdom's zero-size rect normalizes the focal
  // point itself, so we assert the wiring — the page id + a thumbnail update — not
  // the exact coordinates).
  expect(onUpdatePage).toHaveBeenCalledWith('pg1', expect.objectContaining({
    id: 'pg1',
    thumbnail: expect.objectContaining({ imageUrl: 'https://x/t.jpg' }),
  }))
  expect(onUpdatePage.mock.calls[0][1].thumbnail).toHaveProperty('focalPoint')
})
