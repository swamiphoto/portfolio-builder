// Pure undo/redo stacks. Snapshots are opaque (whole config objects).
export function createHistory(depth = 50) {
  return { undo: [], redo: [], depth }
}

export function capture(h, snapshot) {
  const undo = [...h.undo, snapshot]
  while (undo.length > h.depth) undo.shift()
  return { ...h, undo, redo: [] }
}

export function popUndo(h, current) {
  if (!h.undo.length) return { history: h, snapshot: null }
  const snapshot = h.undo[h.undo.length - 1]
  return { history: { ...h, undo: h.undo.slice(0, -1), redo: [...h.redo, current] }, snapshot }
}

export function popRedo(h, current) {
  if (!h.redo.length) return { history: h, snapshot: null }
  const snapshot = h.redo[h.redo.length - 1]
  return { history: { ...h, redo: h.redo.slice(0, -1), undo: [...h.undo, current] }, snapshot }
}

export const canUndo = (h) => h.undo.length > 0
export const canRedo = (h) => h.redo.length > 0
