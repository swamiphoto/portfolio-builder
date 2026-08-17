import { render, screen, fireEvent } from '@testing-library/react'

// Same minimal environment as CrossBlockDragBug.test.js — mount the REAL BlockBuilder.
jest.mock('../../common/dragContext', () => ({
  useDrag: () => ({ startDrag: jest.fn(), endDrag: jest.fn(), drag: null, dropTargetPageId: null, setDropTargetPageId: jest.fn() }),
  DragProvider: ({ children }) => children,
}))
jest.mock('../../common/imageUtils', () => ({ getSizedUrl: (url) => url }))
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: null, status: 'unauthenticated' }) }))
jest.mock('../../components/admin/gallery-builder/DesignPopover', () => ({ __esModule: true, default: () => null }))
jest.mock('../../components/admin/AdminPhotoLightbox', () => ({ __esModule: true, default: () => null }))
jest.mock('../../components/admin/gallery-builder/PhotoPickerModal', () => ({ __esModule: true, default: () => null }))
jest.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }) => children,
  Droppable: ({ children }) => children({ innerRef: () => {}, droppableProps: {}, placeholder: null }, {}),
  Draggable: ({ children }) => children({ innerRef: () => {}, draggableProps: {}, dragHandleProps: {} }, { isDragging: false }),
}))

const BlockBuilder = require('../../components/admin/gallery-builder/BlockBuilder').default

const gallery = { name: 'G', slug: 'g', blocks: [{ type: 'text', content: 'hi' }] }

// The under-textarea link is gone; the "…" block menu is the only entry point
// for plain text blocks. Its trigger has no accessible name — locate it by the
// unique 11x3 dots svg, as BlockCardTextMenu.test.js does.
function openEditorViaMenu(container) {
  const dots = container.querySelector('svg[width="11"][height="3"]')
  fireEvent.click(dots.closest('button'))
  fireEvent.click(screen.getByText('Open markdown editor'))
}

it('opening the markdown editor fires onMarkdownEditorOpen (so hosts can lazy-fetch the library)', () => {
  const onOpen = jest.fn()
  const { container } = render(<BlockBuilder gallery={gallery} onChange={jest.fn()} pages={[]} onMarkdownEditorOpen={onOpen} />)
  openEditorViaMenu(container)
  expect(onOpen).toHaveBeenCalledTimes(1)
  // and the panel actually opened on that block — the panel has no title
  // (the header only holds the formatting toolbar + Done), so assert via a
  // toolbar control instead.
  expect(screen.getByRole('button', { name: /^bold$/i })).toBeTruthy()
})

it('onMarkdownEditorOpen defaults to a no-op when not provided', () => {
  const { container } = render(<BlockBuilder gallery={gallery} onChange={jest.fn()} pages={[]} />)
  expect(() => openEditorViaMenu(container)).not.toThrow()
  expect(screen.getByRole('button', { name: /^bold$/i })).toBeTruthy()
})
