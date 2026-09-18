import { render, screen, fireEvent } from '@testing-library/react'
import MarkdownImageControls from '../../components/admin/gallery-builder/MarkdownImageControls'
const base = { attrs: { layout: 'centered', size: 'l', style: 'sans' } }

it('no caption input exists', () => {
  render(<MarkdownImageControls {...base} onAttr={()=>{}} onRemove={()=>{}} onMove={()=>{}} />)
  expect(screen.queryByPlaceholderText(/caption/i)).toBeNull()
})
it('the ⋯ menu fires move and remove', () => {
  const onMove = jest.fn(), onRemove = jest.fn()
  render(<MarkdownImageControls {...base} onAttr={()=>{}} onRemove={onRemove} onMove={onMove} />)
  // The menu closes after each action (standard menu UX), so reopen it between clicks.
  fireEvent.click(screen.getByRole('button', { name: /more|menu|options/i }))
  fireEvent.click(screen.getByRole('button', { name: /move up/i })); expect(onMove).toHaveBeenCalledWith(-1)
  fireEvent.click(screen.getByRole('button', { name: /more|menu|options/i }))
  fireEvent.click(screen.getByRole('button', { name: /remove/i })); expect(onRemove).toHaveBeenCalled()
})
it('reports lock state: false on mount, true when the design popover opens', () => {
  // The panel relies on this: onLockChange(false) fires on mount and must NOT be
  // read as "hide the overlay"; a real lock only starts when a menu opens.
  const onLockChange = jest.fn()
  render(<MarkdownImageControls {...base} onAttr={()=>{}} onRemove={()=>{}} onMove={()=>{}} onLockChange={onLockChange} />)
  expect(onLockChange).toHaveBeenLastCalledWith(false)
  fireEvent.click(screen.getByRole('button', { name: /design|brush/i }))
  expect(onLockChange).toHaveBeenLastCalledWith(true)
})
it('the brush opens layout options and picking Side fires onAttr', () => {
  const onAttr = jest.fn()
  render(<MarkdownImageControls {...base} onAttr={onAttr} onRemove={()=>{}} onMove={()=>{}} />)
  fireEvent.click(screen.getByRole('button', { name: /design|brush/i }))
  fireEvent.click(screen.getByText('Side'))
  expect(onAttr).toHaveBeenCalledWith('layout', 'side')
})
