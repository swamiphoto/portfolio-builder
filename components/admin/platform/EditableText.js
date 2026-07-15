// Text inputs that hold their value in LOCAL state so typing is instant and can
// never be reset by a slow parent re-render. They still propagate every keystroke
// up via onChange (autosave stays debounced upstream). External changes to `value`
// (e.g. switching pages) are adopted; echoes of the user's own edits are ignored.
import { useState, useRef, useEffect, useCallback } from 'react'

function useLocalValue(value) {
  const [local, setLocal] = useState(value ?? '')
  const last = useRef(value ?? '')
  useEffect(() => {
    const v = value ?? ''
    if (v !== last.current) { last.current = v; setLocal(v) }
  }, [value])
  const onLocalChange = useCallback((v) => { last.current = v; setLocal(v) }, [])
  return [local, onLocalChange]
}

export function EditableInput({ value, onChange, ...props }) {
  const [local, onLocalChange] = useLocalValue(value)
  return (
    <input
      {...props}
      value={local}
      onChange={(e) => { onLocalChange(e.target.value); onChange?.(e) }}
    />
  )
}

export function EditableTextarea({ value, onChange, maxHeight, style, ...props }) {
  const [local, onLocalChange] = useLocalValue(value)
  const ref = useRef(null)
  const adjust = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0'
    const sh = el.scrollHeight
    el.style.height = Math.min(sh, maxHeight || sh) + 'px'
    el.style.overflowY = maxHeight && sh > maxHeight ? 'auto' : 'hidden'
  }, [maxHeight])
  useEffect(() => { adjust() }, [local, adjust])
  return (
    <textarea
      {...props}
      ref={ref}
      value={local}
      style={style}
      onChange={(e) => { onLocalChange(e.target.value); onChange?.(e); adjust() }}
    />
  )
}
