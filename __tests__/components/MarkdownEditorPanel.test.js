import { render, screen, fireEvent } from '@testing-library/react'
import MarkdownEditorPanel from '@/components/admin/gallery-builder/MarkdownEditorPanel'

jest.mock('@/components/admin/gallery-builder/PhotoPickerModal', () => (props) => (
  <button data-testid="picker" onClick={() => props.onConfirm([{ url: 'https://gcs/pic.jpg', assetId: 'a9' }])}>pick</button>
))

const block = { type: 'text', content: 'Hello world' }

it('edits content and stamps format markdown', () => {
  const onChange = jest.fn()
  render(<MarkdownEditorPanel open block={block} onChange={onChange} onClose={jest.fn()} libraryImages={[]} libraryConfig={{}} libraryLoading={false} />)
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hello **world**' } })
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ content: 'Hello **world**', format: 'markdown' }))
})

it('toolbar bold wraps the selection', () => {
  const onChange = jest.fn()
  render(<MarkdownEditorPanel open block={block} onChange={onChange} onClose={jest.fn()} libraryImages={[]} libraryConfig={{}} libraryLoading={false} />)
  const ta = screen.getByRole('textbox')
  ta.setSelectionRange(0, 5)
  fireEvent.click(screen.getByRole('button', { name: /bold/i }))
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ content: '**Hello** world' }))
})

it('inserts a picked image as markdown and tracks it on block.images', () => {
  const onChange = jest.fn()
  render(<MarkdownEditorPanel open block={block} onChange={onChange} onClose={jest.fn()} libraryImages={[]} libraryConfig={{}} libraryLoading={false} />)
  fireEvent.click(screen.getByRole('button', { name: /image/i }))
  fireEvent.click(screen.getByTestId('picker'))
  const call = onChange.mock.calls.at(-1)[0]
  expect(call.content).toContain('![](https://gcs/pic.jpg)')
  expect(call.images).toEqual([{ assetId: 'a9', url: 'https://gcs/pic.jpg' }])
})

it('escape closes', () => {
  const onClose = jest.fn()
  render(<MarkdownEditorPanel open block={block} onChange={jest.fn()} onClose={onClose} libraryImages={[]} libraryConfig={{}} libraryLoading={false} />)
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(onClose).toHaveBeenCalled()
})
