import { render, screen, fireEvent } from '@testing-library/react'
import MarkdownImageControls from '../../components/admin/gallery-builder/MarkdownImageControls'

const base = { attrs: { layout: 'centered', size: 'l', style: 'sans', caption: '' } }
it('remove fires onRemove', () => {
  const onRemove = jest.fn()
  render(<MarkdownImageControls {...base} onRemove={onRemove} onAttr={()=>{}} onCaption={()=>{}} onMove={()=>{}} />)
  fireEvent.click(screen.getByRole('button', { name: /remove/i }))
  expect(onRemove).toHaveBeenCalled()
})
it('opening the brush shows layout options and picking one fires onAttr', () => {
  const onAttr = jest.fn()
  render(<MarkdownImageControls {...base} onRemove={()=>{}} onAttr={onAttr} onCaption={()=>{}} onMove={()=>{}} />)
  fireEvent.click(screen.getByRole('button', { name: /design/i }))
  fireEvent.click(screen.getByText('Side'))
  expect(onAttr).toHaveBeenCalledWith('layout', 'side')
})
it('editing the caption fires onCaption', () => {
  const onCaption = jest.fn()
  render(<MarkdownImageControls {...base} onRemove={()=>{}} onAttr={()=>{}} onCaption={onCaption} onMove={()=>{}} />)
  fireEvent.change(screen.getByPlaceholderText(/caption/i), { target: { value: 'Hi' } })
  expect(onCaption).toHaveBeenCalledWith('Hi')
})

it('remounting with a new key re-reads the caption (no stale value across selections)', () => {
  // The caption input is uncontrolled (defaultValue); the panel gives the
  // overlay a per-selection key so clicking image A then image B shows B's
  // caption, not A's. Simulate that remount via key.
  const noop = () => {}
  const { rerender } = render(
    <MarkdownImageControls key={1} attrs={{ layout: 'centered', size: 'l', style: 'sans', caption: 'A' }} onRemove={noop} onAttr={noop} onCaption={noop} onMove={noop} />
  )
  expect(screen.getByPlaceholderText(/caption/i).value).toBe('A')
  rerender(
    <MarkdownImageControls key={2} attrs={{ layout: 'centered', size: 'l', style: 'sans', caption: 'B' }} onRemove={noop} onAttr={noop} onCaption={noop} onMove={noop} />
  )
  expect(screen.getByPlaceholderText(/caption/i).value).toBe('B')
})
