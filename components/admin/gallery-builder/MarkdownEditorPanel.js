import { useEffect, useRef, useState } from 'react'
import PhotoPickerModal from '@/components/admin/gallery-builder/PhotoPickerModal'

const PANEL_WIDTH = 440

// Essay-style markdown editor for a text block. Layout-agnostic on purpose:
// the themed preview in the center is the live rendering; this panel only
// handles structure and emphasis. Any edit stamps format:'markdown'.
export default function MarkdownEditorPanel({ open, block, onChange, onClose, libraryImages, libraryConfig, libraryLoading }) {
  const taRef = useRef(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape' && !pickerOpen) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, pickerOpen, onClose])

  if (!block) return null
  const content = block.content || ''
  const emit = (nextContent, extraPatch = {}) =>
    onChange({ ...block, content: nextContent, format: 'markdown', ...extraPatch })

  const wrapSelection = (marker) => {
    const ta = taRef.current
    if (!ta) return
    const { selectionStart: s, selectionEnd: e } = ta
    const sel = content.slice(s, e) || 'text'
    emit(`${content.slice(0, s)}${marker}${sel}${marker}${content.slice(e)}`)
  }
  const prefixLine = (prefix) => {
    const ta = taRef.current
    if (!ta) return
    const s = ta.selectionStart
    const lineStart = content.lastIndexOf('\n', s - 1) + 1
    emit(`${content.slice(0, lineStart)}${prefix}${content.slice(lineStart)}`)
  }
  const insertImages = (refs) => {
    setPickerOpen(false)
    if (!refs?.length) return
    const ta = taRef.current
    const at = ta ? ta.selectionStart : content.length
    const md = refs.map((r) => `![](${r.url})`).join('\n\n')
    const before = content.slice(0, at)
    const after = content.slice(at)
    const next = `${before}${before && !before.endsWith('\n\n') ? '\n\n' : ''}${md}${after && !after.startsWith('\n') ? '\n\n' : ''}${after}`
    const seen = new Set((block.images || []).map((i) => i.assetId))
    const images = [...(block.images || []), ...refs.filter((r) => r.assetId && !seen.has(r.assetId)).map((r) => ({ assetId: r.assetId, url: r.url }))]
    emit(next, { images })
  }
  const onKeyDown = (e) => {
    // "/" on an empty line opens the photo picker
    if (e.key === '/') {
      const ta = taRef.current
      const s = ta.selectionStart
      const lineStart = content.lastIndexOf('\n', s - 1) + 1
      if (content.slice(lineStart, s).trim() === '') {
        e.preventDefault()
        setPickerOpen(true)
      }
    }
  }

  const TOOLBAR = [
    { name: 'Bold', act: () => wrapSelection('**'), label: 'B' },
    { name: 'Italic', act: () => wrapSelection('*'), label: 'I' },
    { name: 'Heading', act: () => prefixLine('# '), label: 'H' },
    { name: 'Quote', act: () => prefixLine('> '), label: '"' },
    { name: 'Image', act: () => setPickerOpen(true), label: 'Img' },
  ]

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(20,14,8,0.25)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.25s' }}
      />
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 81,
          width: PANEL_WIDTH, maxWidth: '92vw', background: '#fff',
          boxShadow: open ? '-24px 0 60px rgba(20,14,8,0.4)' : 'none',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div className="text-sm font-medium">Markdown editor</div>
          <div className="flex items-center gap-1">
            {TOOLBAR.map((t) => (
              <button key={t.name} type="button" aria-label={t.name} title={t.name} onClick={t.act}
                className="rounded px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900">
                {t.label}
              </button>
            ))}
            <button type="button" onClick={onClose} className="ml-2 rounded px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100">Done</button>
          </div>
        </div>
        <textarea
          ref={taRef}
          value={content}
          onChange={(e) => emit(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={'Write your story…\n\nUse **bold**, *italics*, # headings — or type / on an empty line to add a photo.'}
          className="scroll-thin flex-1 resize-none p-4 text-sm leading-relaxed outline-none"
        />
        <div className="border-t border-neutral-100 px-4 py-2 text-[11px] text-neutral-400">
          Formatting appears live in the preview. The theme decides the final look.
        </div>
      </div>
      {pickerOpen && (
        <PhotoPickerModal
          images={libraryImages || []}
          libraryConfig={libraryConfig}
          loading={libraryLoading}
          blockType="photo"
          onConfirm={insertImages}
          onClose={() => setPickerOpen(false)}
          anchorRight={PANEL_WIDTH}
        />
      )}
    </>
  )
}
