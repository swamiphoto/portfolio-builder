import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const DragContext = createContext(null)

export function DragProvider({ children }) {
  const [drag, setDrag] = useState(null)
  const [dropTargetPageId, setDropTargetPageId] = useState(null)
  const startDrag = useCallback((payload) => setDrag(payload), [])
  const endDrag = useCallback(() => { setDrag(null); setDropTargetPageId(null) }, [])

  useEffect(() => {
    // Clearing on `dragend` alone is unreliable: a cross-block photo drop removes
    // the drag-source element mid-drop, so the browser never fires `dragend` and
    // `drag` gets stuck set — which keeps every InsertionZone in drop-target mode
    // and hides the hover "+" for adding blocks. Add source-independent safety nets.
    const clear = () => { setDrag(null); setDropTargetPageId(null) }
    // Defer on drop so the target's own drop handler (which reads e.dataTransfer,
    // not `drag`) finishes before we tear the drag state down.
    const clearSoon = () => setTimeout(clear, 0)
    const onVisibility = () => { if (document.visibilityState === 'hidden') clear() }
    window.addEventListener('dragend', clear)
    // Capture phase: fires even if a target stops propagation, and even when the
    // drag source was unmounted by the drop (the case dragend misses).
    window.addEventListener('drop', clearSoon, true)
    // Switching tabs/apps mid-drag: browsers fire dragend inconsistently, so also
    // clear when the page is hidden.
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('dragend', clear)
      window.removeEventListener('drop', clearSoon, true)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <DragContext.Provider value={{ drag, startDrag, endDrag, dropTargetPageId, setDropTargetPageId }}>
      {children}
    </DragContext.Provider>
  )
}

export function useDrag() {
  const ctx = useContext(DragContext)
  if (!ctx) throw new Error('useDrag must be used inside DragProvider')
  return ctx
}
