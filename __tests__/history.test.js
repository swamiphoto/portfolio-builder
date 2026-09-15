import { createHistory, capture, popUndo, popRedo, canUndo, canRedo } from '@/common/history'

test('capture pushes prev, clears redo, respects depth', () => {
  let h = createHistory(2)
  h = capture(h, 'a')
  h = capture(h, 'b')
  h = capture(h, 'c') // over depth 2 → 'a' dropped
  expect(h.undo).toEqual(['b', 'c'])
  expect(h.redo).toEqual([])
})

test('undo moves top to redo and returns snapshot; redo reverses', () => {
  let h = capture(createHistory(), 'v1') // undo:[v1]
  const u = popUndo(h, 'v2')             // current state is v2
  expect(u.snapshot).toBe('v1')
  expect(u.history.undo).toEqual([])
  expect(u.history.redo).toEqual(['v2'])
  const r = popRedo(u.history, 'v1')     // current state now v1
  expect(r.snapshot).toBe('v2')
  expect(r.history.undo).toEqual(['v1'])
  expect(r.history.redo).toEqual([])
})

test('popUndo/popRedo on empty stacks return null and leave history unchanged', () => {
  const h = createHistory()
  expect(popUndo(h, 'x')).toEqual({ history: h, snapshot: null })
  expect(popRedo(h, 'x')).toEqual({ history: h, snapshot: null })
})

test('a fresh capture clears the redo stack', () => {
  let h = capture(createHistory(), 'v1')
  h = popUndo(h, 'v2').history      // redo:[v2]
  h = capture(h, 'v1b')            // new action → redo cleared
  expect(h.redo).toEqual([])
  expect(canRedo(h)).toBe(false)
  expect(canUndo(h)).toBe(true)
})
