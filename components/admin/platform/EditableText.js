// Text inputs that hold their value in LOCAL state so typing is instant and can
// never be reset by a slow parent re-render.
//
// The key rule: while the field is FOCUSED (the user is typing), the local value
// is the single source of truth and the incoming `value` prop is ignored — this
// is what prevents a lagging round-trip from dropping characters. When the field
// is not focused, external changes to `value` (e.g. switching pages) are adopted.
// Every keystroke still calls onChange so upstream autosave works unchanged.
import { useState, useRef, useEffect, useCallback } from 'react'

function useLocalValue(value) {
  const [local, setLocal] = useState(value ?? '')
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) setLocal(value ?? '')
  }, [value])
  const onFocus = useCallback(() => { focused.current = true }, [])
  const onBlur = useCallback(() => { focused.current = false; setLocal(value ?? '') }, [value])
  const setTyped = useCallback((v) => setLocal(v), [])
  return { local, onFocus, onBlur, setTyped }
}

export function EditableInput({ value, onChange, onFocus, onBlur, ...props }) {
  const local = useLocalValue(value)
  return (
    <input
      {...props}
      value={local.local}
      onFocus={(e) => { local.onFocus(); onFocus?.(e) }}
      onBlur={(e) => { local.onBlur(); onBlur?.(e) }}
      onChange={(e) => { local.setTyped(e.target.value); onChange?.(e) }}
    />
  )
}

export function EditableTextarea({ value, onChange, onFocus, onBlur, maxHeight, style, ...props }) {
  const local = useLocalValue(value)
  const ref = useRef(null)
  const adjust = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0'
    const sh = el.scrollHeight
    el.style.height = Math.min(sh, maxHeight || sh) + 'px'
    el.style.overflowY = maxHeight && sh > maxHeight ? 'auto' : 'hidden'
  }, [maxHeight])
  useEffect(() => { adjust() }, [local.local, adjust])
  return (
    <textarea
      {...props}
      ref={ref}
      value={local.local}
      style={style}
      onFocus={(e) => { local.onFocus(); onFocus?.(e) }}
      onBlur={(e) => { local.onBlur(); onBlur?.(e) }}
      onChange={(e) => { local.setTyped(e.target.value); onChange?.(e); adjust() }}
    />
  )
}
