import { useState, useRef } from 'react'
import PopoverShell from '../platform/PopoverShell'
import { pageDisplayThumbnail } from '../../../common/assetRefs'

export function focalPointFromPointer(clientX, clientY, rect) {
  const clamp = (n) => Math.min(1, Math.max(0, n))
  const w = rect.width || 1
  const h = rect.height || 1
  return { x: clamp((clientX - rect.left) / w), y: clamp((clientY - rect.top) / h) }
}

export default function FocalPointEditor({ page, anchorEl, onClose, onChange }) {
  const imgWrapRef = useRef(null)
  const [point, setPoint] = useState(() => page?.thumbnail?.focalPoint || { x: 0.5, y: 0.5 })
  const [dragging, setDragging] = useState(false)
  const thumb = pageDisplayThumbnail(page)

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

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={260} title="Reposition" headerRight={resetBtn}>
      <div style={{ padding: 10 }}>
        {thumb ? (
          <div
            ref={imgWrapRef}
            data-testid="focal-image"
            onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); setDragging(true); applyFromEvent(e) }}
            onPointerMove={(e) => { if (dragging) applyFromEvent(e) }}
            onPointerUp={() => setDragging(false)}
            style={{ position: 'relative', width: '100%', cursor: 'crosshair', userSelect: 'none', borderRadius: 4, overflow: 'hidden' }}
          >
            <img src={thumb} alt="" draggable={false} style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' }} />
            <div
              data-testid="focal-marker"
              aria-hidden
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
        ) : (
          <div style={{ fontSize: 12, color: '#9e9788', padding: '12px 4px' }}>
            This page has no thumbnail image to reposition.
          </div>
        )}
        <div style={{ marginTop: 8, fontSize: 11, color: '#9e9788', lineHeight: 1.4 }}>
          Drag to keep the subject in frame.
        </div>
      </div>
    </PopoverShell>
  )
}
