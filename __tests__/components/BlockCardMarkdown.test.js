import { render, screen, fireEvent } from '@testing-library/react'
import TextBlockField from '@/components/admin/gallery-builder/TextBlockField'

const Textarea = (props) => <textarea {...props} />

it('plain block shows textarea plus an open-editor link', () => {
  const open = jest.fn()
  render(<TextBlockField block={{ type: 'text', content: 'hi' }} onUpdate={jest.fn()} onOpenMarkdownEditor={open} AutoGrowTextarea={Textarea} inputClass="" />)
  expect(screen.getByPlaceholderText(/write something/i).value).toBe('hi')
  fireEvent.click(screen.getByRole('button', { name: /open markdown editor/i }))
  expect(open).toHaveBeenCalled()
})

it('markdown block shows a formatted read-only snippet that opens the editor', () => {
  const open = jest.fn()
  render(<TextBlockField block={{ type: 'text', format: 'markdown', content: 'I shoot **film**' }} onUpdate={jest.fn()} onOpenMarkdownEditor={open} AutoGrowTextarea={Textarea} inputClass="" />)
  expect(screen.queryByPlaceholderText(/write something/i)).toBeNull()
  expect(screen.getByText('film').tagName).toBe('STRONG')
  fireEvent.click(screen.getByText(/markdown/i).closest('button'))
  expect(open).toHaveBeenCalled()
})
