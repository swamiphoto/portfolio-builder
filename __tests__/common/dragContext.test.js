import { render, screen, act } from '@testing-library/react'
import { DragProvider, useDrag } from '../../common/dragContext'

function Probe() {
  const { drag, startDrag, endDrag } = useDrag()
  return (
    <div>
      <span data-testid="type">{drag?.type ?? 'none'}</span>
      <button onClick={() => startDrag({ type: 'block', block: { id: 'b1' }, sourcePageId: 'p1' })}>start</button>
      <button onClick={endDrag}>end</button>
    </div>
  )
}

test('startDrag sets drag payload', () => {
  render(<DragProvider><Probe /></DragProvider>)
  expect(screen.getByTestId('type').textContent).toBe('none')
  act(() => screen.getByText('start').click())
  expect(screen.getByTestId('type').textContent).toBe('block')
})

test('endDrag clears payload', () => {
  render(<DragProvider><Probe /></DragProvider>)
  act(() => screen.getByText('start').click())
  act(() => screen.getByText('end').click())
  expect(screen.getByTestId('type').textContent).toBe('none')
})

test('setDropTargetPageId stores target and endDrag clears it', () => {
  function Probe2() {
    const { dropTargetPageId, setDropTargetPageId, endDrag } = useDrag()
    return (
      <div>
        <span data-testid="target">{dropTargetPageId ?? 'none'}</span>
        <button onClick={() => setDropTargetPageId('p2')}>set</button>
        <button onClick={endDrag}>end</button>
      </div>
    )
  }
  render(<DragProvider><Probe2 /></DragProvider>)
  act(() => screen.getByText('set').click())
  expect(screen.getByTestId('target').textContent).toBe('p2')
  act(() => screen.getByText('end').click())
  expect(screen.getByTestId('target').textContent).toBe('none')
})
