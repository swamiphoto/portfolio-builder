import { createContext, useContext, useState, useCallback } from 'react'

const DragContext = createContext(null)

export function DragProvider({ children }) {
  const [drag, setDrag] = useState(null)
  const [dropTargetPageId, setDropTargetPageId] = useState(null)
  const startDrag = useCallback((payload) => setDrag(payload), [])
  const endDrag = useCallback(() => { setDrag(null); setDropTargetPageId(null) }, [])
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
