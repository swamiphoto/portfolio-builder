import { render, screen, fireEvent } from '@testing-library/react'
import TextBlockField from '@/components/admin/gallery-builder/TextBlockField'

const Textarea = (props) => <textarea {...props} />

it('plain block shows only the textarea; the editor opens from the block menu instead', () => {
  render(<TextBlockField block={{ type: 'text', content: 'hi' }} onUpdate={jest.fn()} onOpenMarkdownEditor={jest.fn()} AutoGrowTextarea={Textarea} inputClass="" />)
  expect(screen.getByPlaceholderText(/write something/i).value).toBe('hi')
  expect(screen.queryByRole('button', { name: /open markdown editor/i })).toBeNull()
})

it('markdown block shows a formatted read-only snippet that opens the editor', () => {
  const open = jest.fn()
  render(<TextBlockField block={{ type: 'text', format: 'markdown', content: 'I shoot **film**' }} onUpdate={jest.fn()} onOpenMarkdownEditor={open} AutoGrowTextarea={Textarea} inputClass="" />)
  expect(screen.queryByPlaceholderText(/write something/i)).toBeNull()
  expect(screen.getByText('film').tagName).toBe('STRONG')
  fireEvent.click(screen.getByText(/markdown/i).closest('button'))
  expect(open).toHaveBeenCalled()
})

it('shows the Markdown badge below the snippet, not above it', () => {
  render(<TextBlockField block={{ type: 'text', format: 'markdown', content: 'I shoot **film**' }} onUpdate={jest.fn()} onOpenMarkdownEditor={jest.fn()} AutoGrowTextarea={Textarea} inputClass="" />)
  const badge = screen.getByText(/markdown/i)
  const snippet = screen.getByText('film').closest('span').parentElement
  // badge should come after the snippet block in DOM order
  expect(snippet.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})
