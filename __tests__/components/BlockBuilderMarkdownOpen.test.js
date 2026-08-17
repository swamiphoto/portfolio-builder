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

it('opening the markdown editor fires onMarkdownEditorOpen (so hosts can lazy-fetch the library)', () => {
  const onOpen = jest.fn()
  render(<BlockBuilder gallery={gallery} onChange={jest.fn()} pages={[]} onMarkdownEditorOpen={onOpen} />)
  fireEvent.click(screen.getByRole('button', { name: /open markdown editor/i }))
  expect(onOpen).toHaveBeenCalledTimes(1)
  // and the panel actually opened on that block
  expect(screen.getByText('Markdown editor')).toBeTruthy()
})

it('onMarkdownEditorOpen defaults to a no-op when not provided', () => {
  render(<BlockBuilder gallery={gallery} onChange={jest.fn()} pages={[]} />)
  expect(() => fireEvent.click(screen.getByRole('button', { name: /open markdown editor/i }))).not.toThrow()
  expect(screen.getByText('Markdown editor')).toBeTruthy()
})
