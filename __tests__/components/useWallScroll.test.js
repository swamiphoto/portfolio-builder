// __tests__/components/useWallScroll.test.js
// The shared horizontal-wall physics: vertical wheel → horizontal pan (3.2x),
// native horizontal gestures untouched, drag-to-pan, all inert on mobile.
import React, { useRef, useEffect } from 'react'
import { render, fireEvent } from '@testing-library/react'
import useWallScroll from '@/components/image-displays/themes/shared/useWallScroll'

// Polyfill PointerEvent for jsdom if it doesn't exist
if (typeof window !== 'undefined' && !window.PointerEvent) {
  window.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type, init) {
      super(type, init)
      this.pointerId = init?.pointerId || 1
      this.pointerType = init?.pointerType || 'mouse'
      this.isPrimary = init?.isPrimary !== false
    }
  }
}

function Probe({ mobile = false }) {
  const wallRef = useRef(null)
  const { onPointerDown, onPointerMove, endDrag } = useWallScroll({ wallRef, mobile, columnSelector: '.col' })

  // Initialize scroll mock on ref
  useEffect(() => {
    if (wallRef.current && !wallRef.current._scrollLeftMocked) {
      let scrollLeftValue = 0
      Object.defineProperty(wallRef.current, 'scrollLeft', {
        get() { return scrollLeftValue },
        set(value) { scrollLeftValue = value },
        configurable: true,
      })
      Object.defineProperty(wallRef.current, 'clientWidth', {
        get() { return 800 },
        configurable: true,
      })
      wallRef.current._scrollLeftMocked = true
    }
  })

  return (
    <div data-testid="wall" ref={wallRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerLeave={endDrag} style={{ overflow: 'auto' }}>
      <section className="col" />
    </div>
  )
}

describe('useWallScroll', () => {
  it('converts a vertical wheel into horizontal scroll at 3.2x', () => {
    const { getByTestId } = render(<Probe />)
    const wall = getByTestId('wall')
    wall.scrollLeft = 0
    fireEvent.wheel(wall, { deltaY: 100, deltaX: 0, deltaMode: 0 })
    expect(wall.scrollLeft).toBe(320)
  })

  it('leaves native horizontal gestures alone', () => {
    const { getByTestId } = render(<Probe />)
    const wall = getByTestId('wall')
    wall.scrollLeft = 0
    fireEvent.wheel(wall, { deltaY: 10, deltaX: 50, deltaMode: 0 })
    expect(wall.scrollLeft).toBe(0)
  })

  it('drag-to-pan moves scrollLeft by the inverse pointer delta', () => {
    const { getByTestId } = render(<Probe />)
    const wall = getByTestId('wall')
    wall.scrollLeft = 100
    fireEvent.pointerDown(wall, { clientX: 200 })
    fireEvent.pointerMove(wall, { clientX: 120 })
    expect(wall.scrollLeft).toBe(180)
    fireEvent.pointerUp(wall)
    fireEvent.pointerMove(wall, { clientX: 40 })
    expect(wall.scrollLeft).toBe(180) // drag ended — no further movement
  })

  it('is inert on mobile', () => {
    const { getByTestId } = render(<Probe mobile />)
    const wall = getByTestId('wall')
    wall.scrollLeft = 0
    fireEvent.wheel(wall, { deltaY: 100, deltaMode: 0 })
    fireEvent.pointerDown(wall, { clientX: 200 })
    fireEvent.pointerMove(wall, { clientX: 120 })
    expect(wall.scrollLeft).toBe(0)
  })
})
