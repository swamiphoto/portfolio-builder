import { render, screen, fireEvent, act } from '@testing-library/react'
import FocalPointEditor, { focalPointFromPointer } from '../../components/admin/gallery-builder/FocalPointEditor'

jest.mock('../../components/admin/platform/PopoverShell', () => ({
  __esModule: true,
  default: ({ children, headerRight }) => (
    <div data-testid="shell">{headerRight}{children}</div>
  ),
}))

const page = (focalPoint) => ({
  id: 'p1',
  title: 'Trips',
  thumbnail: { imageUrl: 'https://x/t.jpg', useCover: false, focalPoint },
})

describe('focalPointFromPointer', () => {
  const rect = { left: 0, top: 0, width: 200, height: 100 }
  it('maps a pointer position to a normalized point', () => {
    expect(focalPointFromPointer(100, 50, rect)).toEqual({ x: 0.5, y: 0.5 })
  })
  it('clamps positions outside the rect', () => {
    expect(focalPointFromPointer(-20, 300, rect)).toEqual({ x: 0, y: 1 })
  })
})

describe('FocalPointEditor', () => {
  it('renders the marker at the stored focal point', () => {
    render(<FocalPointEditor page={page({ x: 0.25, y: 0.75 })} anchorEl={document.body} onClose={() => {}} onChange={() => {}} />)
    const marker = screen.getByTestId('focal-marker')
    expect(marker.style.left).toBe('25%')
    expect(marker.style.top).toBe('75%')
  })

  it('Reset calls onChange(null)', () => {
    const onChange = jest.fn()
    render(<FocalPointEditor page={page({ x: 0.25, y: 0.75 })} anchorEl={document.body} onClose={() => {}} onChange={onChange} />)
    fireEvent.click(screen.getByText('Reset'))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('hides Reset when the focal point is centered/unchanged', () => {
    render(<FocalPointEditor page={page(null)} anchorEl={document.body} onClose={() => {}} onChange={() => {}} />)
    expect(screen.queryByText('Reset')).toBeNull()
  })

  it('shows Reset when the page already has a focal point', () => {
    render(<FocalPointEditor page={page({ x: 0.25, y: 0.75 })} anchorEl={document.body} onClose={() => {}} onChange={() => {}} />)
    expect(screen.getByText('Reset')).toBeInTheDocument()
  })

  it('reveals Reset after the marker is dragged off center', () => {
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => {} })
    render(<FocalPointEditor page={page(null)} anchorEl={document.body} onClose={() => {}} onChange={() => {}} />)
    expect(screen.queryByText('Reset')).toBeNull()
    const event = new MouseEvent('pointerdown', { clientX: 20, clientY: 80, bubbles: true })
    Object.defineProperty(event, 'pointerId', { value: 1 })
    act(() => { screen.getByTestId('focal-image').dispatchEvent(event) })
    expect(screen.getByText('Reset')).toBeInTheDocument()
    HTMLElement.prototype.getBoundingClientRect.mockRestore()
  })

  it('dragging fires onChange with the pointer-derived focal point', () => {
    const onChange = jest.fn()
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => {} })
    render(<FocalPointEditor page={page(null)} anchorEl={document.body} onClose={() => {}} onChange={onChange} />)
    const area = screen.getByTestId('focal-image')
    const event = new MouseEvent('pointerdown', { clientX: 100, clientY: 50, bubbles: true })
    Object.defineProperty(event, 'pointerId', { value: 1 })
    area.dispatchEvent(event)
    expect(onChange).toHaveBeenLastCalledWith({ x: 0.5, y: 0.5 })
    HTMLElement.prototype.getBoundingClientRect.mockRestore()
  })
})
