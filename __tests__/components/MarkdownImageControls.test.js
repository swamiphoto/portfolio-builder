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
