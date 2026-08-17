// Verifies the text block "…" menu offers "Open markdown editor" (same action
// as the link under the plain textarea) and, only for markdown-formatted
// blocks, "Convert to plain text" (which just drops block.format).
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

// The header "…" menu button carries no accessible name (unlike the
// per-thumbnail ThumbMenu, which has title="Options") — its 11x3 dots svg is
// unique on a text block card (no ThumbMenu present), so we locate it that way.
function openBlockMenu(container) {
  const dots = container.querySelector('svg[width="11"][height="3"]')
  fireEvent.click(dots.closest('button'))
}

test('markdown block: menu offers Convert to plain text but not Open markdown editor', () => {
  const onUpdate = jest.fn()
  const block = { type: 'text', format: 'markdown', content: 'hi' }
  const { container } = render(
    <BlockCard
      block={block}
      dragHandleProps={{}}
      onUpdate={onUpdate}
      onRemove={() => {}}
      onAddPhotos={() => {}}
      onRemovePhoto={() => {}}
      onOpenMarkdownEditor={() => {}}
    />
  )

  openBlockMenu(container)
  // The snippet itself opens the editor for markdown blocks; the menu item
  // exists only for plain blocks.
  expect(screen.queryByText('Open markdown editor')).toBeNull()
  fireEvent.click(screen.getByText('Convert to plain text'))
  expect(onUpdate).toHaveBeenCalledTimes(1)
  const updated = onUpdate.mock.calls[0][0]
  expect(updated.content).toBe('hi')
  expect(updated.format).toBeUndefined()
})

test('plain block: menu is the only Open markdown editor entry point', () => {
  const onOpenMarkdownEditor = jest.fn()
  const block = { type: 'text', content: 'hi' }
  const { container } = render(
    <BlockCard
      block={block}
      dragHandleProps={{}}
      onUpdate={() => {}}
      onRemove={() => {}}
      onAddPhotos={() => {}}
      onRemovePhoto={() => {}}
      onOpenMarkdownEditor={onOpenMarkdownEditor}
    />
  )

  openBlockMenu(container)
  // Exactly one entry: the menu item (the under-textarea link is gone).
  expect(screen.getAllByText('Open markdown editor').length).toBe(1)
  expect(screen.queryByText('Convert to plain text')).toBeNull()
  fireEvent.click(screen.getByText('Open markdown editor'))
  expect(onOpenMarkdownEditor).toHaveBeenCalledTimes(1)
})
