import { useState, useRef } from 'react'
import PopoverShell from '../platform/PopoverShell'
import { getSizedUrl } from '../../../common/imageUtils'
import { focalPointFromPointer } from './FocalPointEditor'

const POPOVER_W = 260

// Reposition popover for a single arbitrary image (e.g. a square-layout photo).
// Mirrors FocalPointEditor's UX but crops the preview to a SQUARE so it matches
// how the image renders on the site.
export default function ImageFocalEditor({ imageUrl, focalPoint, anchorEl, onClose, onChange }) {
  const imgWrapRef = useRef(null)
  const [point, setPoint] = useState(() => focalPoint || { x: 0.5, y: 0.5 })
  const [dragging, setDragging] = useState(false)
  const src = getSizedUrl(imageUrl, 'display') || imageUrl

  // Nothing to reset until the marker has moved off center.
  const isCentered = point.x === 0.5 && point.y === 0.5

  const applyFromEvent = (e) => {
    const rect = imgWrapRef.current?.getBoundingClientRect()
    if (!rect) return
    const np = focalPointFromPointer(e.clientX, e.clientY, rect)
    setPoint(np)
    onChange(np)
  }

  const reset = () => {
    setPoint({ x: 0.5, y: 0.5 })
    onChange(null)
  }

  const resetBtn = (
    <button
      type="button"
      onClick={reset}
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, color: '#9e9788' }}
    >
      Reset
    </button>
  )

  const objectPosition = `${point.x * 100}% ${point.y * 100}%`

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={POPOVER_W} title="Reposition" draggable headerRight={isCentered ? undefined : resetBtn}>
      <div style={{ padding: 10 }}>
        {src ? (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              ref={imgWrapRef}
              data-testid="focal-image"
              onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); setDragging(true); applyFromEvent(e) }}
              onPointerMove={(e) => { if (dragging) applyFromEvent(e) }}
              onPointerUp={() => setDragging(false)}
              onPointerCancel={() => setDragging(false)}
              className="aspect-square"
              style={{ position: 'relative', width: POPOVER_W - 20, cursor: 'crosshair', userSelect: 'none', borderRadius: 4, overflow: 'hidden' }}
            >
              <img
                src={src}
                alt=""
                draggable={false}
                className="object-cover"
                style={{ display: 'block', width: '100%', height: '100%', objectPosition, pointerEvents: 'none' }}
              />
              <div
                data-testid="focal-marker"
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: `${point.x * 100}%`,
                  top: `${point.y * 100}%`,
                  width: 22,
                  height: 22,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  border: '2px solid #fff',
                  boxShadow: '0 0 0 1.5px rgba(0,0,0,0.45), 0 1px 4px rgba(0,0,0,0.4)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#9e9788', padding: '12px 4px' }}>
            No image to reposition.
          </div>
        )}
        <div style={{ marginTop: 8, fontSize: 11, color: '#9e9788', lineHeight: 1.4 }}>
          Drag to keep the subject in frame.
        </div>
      </div>
    </PopoverShell>
  )
}
