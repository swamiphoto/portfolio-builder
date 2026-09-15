import { useRef, useState, useCallback } from 'react'
import * as H from './history'

export function useHistory(depth = 50) {
  const ref = useRef(H.createHistory(depth))
  const [, bump] = useState(0)
  const sync = () => bump((v) => v + 1)

  const capture = useCallback((snapshot) => { ref.current = H.capture(ref.current, snapshot); sync() }, [])
  const takeUndo = useCallback((current) => {
    const { history, snapshot } = H.popUndo(ref.current, current)
    ref.current = history; sync(); return snapshot
  }, [])
  const takeRedo = useCallback((current) => {
    const { history, snapshot } = H.popRedo(ref.current, current)
    ref.current = history; sync(); return snapshot
  }, [])

  return { capture, takeUndo, takeRedo, canUndo: H.canUndo(ref.current), canRedo: H.canRedo(ref.current) }
}
