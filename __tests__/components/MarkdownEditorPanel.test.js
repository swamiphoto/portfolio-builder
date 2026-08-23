import { render, screen, fireEvent } from '@testing-library/react'
import MarkdownEditorPanel from '@/components/admin/gallery-builder/MarkdownEditorPanel'

jest.mock('@/components/admin/gallery-builder/PhotoPickerModal', () => (props) => (
  <button data-testid="picker" data-anchor-right={props.anchorRight} onClick={() => props.onConfirm([{ url: 'https://gcs/pic.jpg', assetId: 'a9' }])}>pick</button>
))

const block = { type: 'text', content: 'Hello world' }

// The editable surface has no accessible "textbox" role (contentEditable
// divs don't get one from Testing Library the way <textarea> does) — find
// it by its class instead, as the panel itself has no other landmark.
function getEditable(container) {
  return container.querySelector('.md-editable')
}

// Places a collapsed selection inside a text node — jsdom supports basic
// Range/Selection well enough for this, which is what the panel's toolbar
// heading/quote actions and the "/" empty-line check rely on.
function placeCaretIn(node, offset = 0) {
  const range = document.createRange()
  range.setStart(node, offset)
  range.collapse(true)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
}

it('seeds the editable surface from the block content as rendered markdown DOM', () => {
  const { container } = render(<MarkdownEditorPanel open block={block} onChange={jest.fn()} onClose={jest.fn()} libraryImages={[]} libraryConfig={{}} libraryLoading={false} />)
  const el = getEditable(container)
  expect(el.querySelector('p').textContent).toBe('Hello world')
})

it('inlineOnly mode offers Bold / Italic / Link only (no Heading, Quote, or Image)', () => {
  render(<MarkdownEditorPanel open inlineOnly block={block} onChange={jest.fn()} onClose={jest.fn()} />)
  expect(screen.getByLabelText('Bold')).toBeTruthy()
  expect(screen.getByLabelText('Italic')).toBeTruthy()
  expect(screen.getByLabelText('Link')).toBeTruthy()
  expect(screen.queryByLabelText('Heading')).toBeNull()
  expect(screen.queryByLabelText('Quote')).toBeNull()
  expect(screen.queryByLabelText('Image')).toBeNull()
})

it('typing (input event) serializes the DOM back to markdown and stamps format', () => {
  const onChange = jest.fn()
  const { container } = render(<MarkdownEditorPanel open block={block} onChange={onChange} onClose={jest.fn()} libraryImages={[]} libraryConfig={{}} libraryLoading={false} />)
  const el = getEditable(container)
  // Simulate what a real contentEditable would do after the user types —
  // jsdom doesn't run actual keyboard-to-DOM editing, so we mutate the DOM
  // ourselves and fire the same 'input' event the browser would.
  el.querySelector('p').textContent = 'Hello world, edited'
  fireEvent.input(el)
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ content: 'Hello world, edited', format: 'markdown' }))
})

// jsdom does not implement document.execCommand at all (calling it throws
// "not a function"), so bold/italic can't be verified end-to-end the way a
// real browser's contentEditable would apply them. The panel guards the
// call so it never throws, and still serializes + emits afterward — that's
// what's testable here. The DOM -> markdown side of bold/italic is covered
// directly in markdownDom.test.js by building a <strong>/<em> DOM by hand.
it('toolbar bold does not throw in an environment without execCommand, and still emits', () => {
  const onChange = jest.fn()
  render(<MarkdownEditorPanel open block={block} onChange={onChange} onClose={jest.fn()} libraryImages={[]} libraryConfig={{}} libraryLoading={false} />)
  expect(() => fireEvent.click(screen.getByRole('button', { name: /^bold$/i }))).not.toThrow()
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ content: 'Hello world', format: 'markdown' }))
})

it('toolbar heading converts the current block to a heading', () => {
  const onChange = jest.fn()
  const { container } = render(<MarkdownEditorPanel open block={block} onChange={onChange} onClose={jest.fn()} libraryImages={[]} libraryConfig={{}} libraryLoading={false} />)
  const el = getEditable(container)
  const textNode = el.querySelector('p').firstChild
  placeCaretIn(textNode, 2)
  fireEvent.click(screen.getByRole('button', { name: /^heading$/i }))
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ content: '# Hello world' }))
  expect(el.querySelector('h3').textContent).toBe('Hello world')
})

it('toolbar quote converts the current block to a blockquote', () => {
  const onChange = jest.fn()
  const { container } = render(<MarkdownEditorPanel open block={block} onChange={onChange} onClose={jest.fn()} libraryImages={[]} libraryConfig={{}} libraryLoading={false} />)
  const el = getEditable(container)
  const textNode = el.querySelector('p').firstChild
  placeCaretIn(textNode, 2)
  fireEvent.click(screen.getByRole('button', { name: /^quote$/i }))
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ content: '> Hello world' }))
  expect(el.querySelector('blockquote').textContent).toBe('Hello world')
})

it('inserts a picked image as an inline preview and tracks it on block.images', () => {
  const onChange = jest.fn()
  const { container } = render(<MarkdownEditorPanel open block={block} onChange={onChange} onClose={jest.fn()} libraryImages={[]} libraryConfig={{}} libraryLoading={false} />)
  fireEvent.click(screen.getByRole('button', { name: /^image$/i }))
  fireEvent.click(screen.getByTestId('picker'))
  const call = onChange.mock.calls.at(-1)[0]
  expect(call.content).toContain('![](https://gcs/pic.jpg)')
  expect(call.images).toEqual([{ assetId: 'a9', url: 'https://gcs/pic.jpg' }])
  const el = getEditable(container)
  const img = el.querySelector('img[src="https://gcs/pic.jpg"]')
  expect(img).toBeTruthy()
  expect(img.closest('[contenteditable="false"]')).toBeTruthy()
})

it('inserts the image at top level when the caret is mid-paragraph, so it survives serialization', () => {
  // Regression: inserting a photo while the caret sat inside a body paragraph
  // nested the image wrapper inside that <p>. The serializer only walks
  // top-level children, so the ![](url) was silently dropped from `content` —
  // the image then disappeared from the preview and from the editor on reopen.
  const onChange = jest.fn()
  const { container } = render(<MarkdownEditorPanel open block={block} onChange={onChange} onClose={jest.fn()} libraryImages={[]} libraryConfig={{}} libraryLoading={false} />)
  const el = getEditable(container)
  placeCaretIn(el.querySelector('p').firstChild, 2) // caret inside "Hello world"
  fireEvent.click(screen.getByRole('button', { name: /^image$/i }))
  fireEvent.click(screen.getByTestId('picker'))
  const call = onChange.mock.calls.at(-1)[0]
  expect(call.content).toContain('![](https://gcs/pic.jpg)')
  // The image wrapper must be a direct child of the editable root, not nested.
  const wrapper = el.querySelector('img[src="https://gcs/pic.jpg"]').closest('[data-md-image]')
  expect(wrapper.parentElement).toBe(el)
})

it('"/" on an empty block opens the photo picker', () => {
  const empty = { type: 'text', content: '' }
  const { container } = render(<MarkdownEditorPanel open block={empty} onChange={jest.fn()} onClose={jest.fn()} libraryImages={[]} libraryConfig={{}} libraryLoading={false} />)
  const el = getEditable(container)
  fireEvent.keyDown(el, { key: '/' })
  expect(screen.getByTestId('picker')).toBeTruthy()
})

it('opens the picker at its own default position (no docked anchor)', () => {
  // The editor is now a free-floating panel rather than a right-docked drawer,
  // so it no longer hands the picker an anchorRight offset — the picker uses
  // its default beside-the-block position.
  render(<MarkdownEditorPanel open block={block} onChange={jest.fn()} onClose={jest.fn()} libraryImages={[]} libraryConfig={{}} libraryLoading={false} />)
  fireEvent.click(screen.getByRole('button', { name: /^image$/i }))
  expect(screen.getByTestId('picker').dataset.anchorRight).toBeUndefined()
})

it('escape closes', () => {
  const onClose = jest.fn()
  render(<MarkdownEditorPanel open block={block} onChange={jest.fn()} onClose={onClose} libraryImages={[]} libraryConfig={{}} libraryLoading={false} />)
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(onClose).toHaveBeenCalled()
})

it('closes via an X button, not a Done button', () => {
  // Mirrors the library picker: a close (X) affordance in the header, no Done.
  const onClose = jest.fn()
  render(<MarkdownEditorPanel open block={block} onChange={jest.fn()} onClose={onClose} libraryImages={[]} libraryConfig={{}} libraryLoading={false} />)
  expect(screen.queryByRole('button', { name: /^done$/i })).toBeNull()
  const close = screen.getByRole('button', { name: /^close$/i })
  fireEvent.click(close)
  expect(onClose).toHaveBeenCalled()
})

it('the footer hint is the single theme-dependent sentence', () => {
  render(<MarkdownEditorPanel open block={block} onChange={jest.fn()} onClose={jest.fn()} libraryImages={[]} libraryConfig={{}} libraryLoading={false} />)
  expect(screen.getByText(/final look depends on your site/i)).toBeTruthy()
  expect(screen.queryByText(/formatting appears live in the preview/i)).toBeNull()
})
