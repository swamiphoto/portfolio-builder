import { useEffect } from 'react'

// getHandlers() returns the active surface's { undo, redo }. Inert while a text
// field is focused (native undo owns those).
export function useUndoRedoKeys(getHandlers) {
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod || e.key.toLowerCase() !== 'z' && e.key.toLowerCase() !== 'y') return
      const el = document.activeElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      const h = getHandlers()
      if (!h) return
      const isRedo = (e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y'
      e.preventDefault()
      isRedo ? h.redo?.() : h.undo?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [getHandlers])
}
