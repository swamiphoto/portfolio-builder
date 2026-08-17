import { forwardRef, useEffect, useRef, useState } from 'react'
import PhotoPickerModal from '@/components/admin/gallery-builder/PhotoPickerModal'
import Tip from '@/components/admin/Tip'
import { blockToMarkdownSeed } from '@/common/markdown'
import { renderMarkdownToElement, serializeDomToMarkdown, createImageBlockNode } from '@/common/markdownDom'

const PANEL_WIDTH = 440

// Warm hover state for the toolbar buttons. Kept as a handler (rather than a
// Tailwind `hover:` class) because these buttons sit next to others that carry
// inline `background` — Tailwind's `hover:` utilities silently lose to any
// inline background on the same element, so onMouseEnter/Leave is the only
// reliable way to get a visible hover here.
// forwardRef so Tip's Radix Tooltip.Trigger (asChild) can attach its ref —
// without it Radix warns and the hover trigger silently fails to attach.
const ToolbarButton = forwardRef(function ToolbarButton({ name, label, onClick }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={name}
      title={name}
      onClick={onClick}
      style={{
        borderRadius: 4,
        padding: '4px 9px',
        fontSize: 13,
        lineHeight: 1,
        color: 'var(--text-secondary)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(160,140,110,0.14)'; e.currentTarget.style.color = '#2c2416' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
    >
      {label}
    </button>
  )
})

// Walks up from `node` to find the direct block-level child of `root` that
// contains it (the <p>/<h3>/<blockquote>/<li>'s ancestor list-item, etc).
// Used so toolbar heading/quote actions act on "the block the caret is in"
// rather than requiring precise range math.
function closestTopLevelBlock(root, node) {
  let target = node
  if (!target) return null
  if (target.nodeType !== 1) target = target.parentElement
  while (target && target.parentElement !== root && target !== root) {
    target = target.parentElement
  }
  return target === root ? null : target
}

function currentBlockElement(root) {
  if (!root) return null
  const sel = typeof window !== 'undefined' ? window.getSelection() : null
  const anchor = sel && sel.rangeCount ? sel.anchorNode : null
  if (anchor && root.contains(anchor)) {
    const found = closestTopLevelBlock(root, anchor)
    if (found) return found
  }
  return root.lastElementChild || null
}

// Essay-style markdown editor for a text block. Layout-agnostic on purpose:
// the themed preview in the center is the live rendering; this panel only
// handles structure and emphasis. Any edit stamps format:'markdown'.
//
// The editable surface is a contentEditable div that shows basic formatting
// (headings, bold/italic, quotes, lists, inline image previews) while the
// block still persists `content` as plain markdown text — nothing about the
// stored format changes. Caret stability: the div is re-rendered from
// markdown ONLY when the panel opens (the seeding effect depends on `open`
// alone); after that the div owns its own DOM and every edit flows
// DOM -> serializeDomToMarkdown -> emit, so React never touches the div's
// children mid-edit and the caret never jumps.
export default function MarkdownEditorPanel({ open, block, onChange, onClose, libraryImages, libraryConfig, libraryLoading }) {
  const editableRef = useRef(null)
  const blockRef = useRef(block)
  blockRef.current = block
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape' && !pickerOpen) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, pickerOpen, onClose])

  // Seed the editable DOM from markdown exactly once per "open" — never on
  // every render — so typing doesn't fight React for caret position.
  useEffect(() => {
    if (!open) return undefined
    const el = editableRef.current
    const b = blockRef.current
    if (!el || !b) return undefined
    const seedMd = blockToMarkdownSeed(b)
    const rendered = renderMarkdownToElement(seedMd, document)
    el.replaceChildren(...rendered.childNodes)
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!block) return null

  const emit = (extraPatch = {}) => {
    const el = editableRef.current
    const nextContent = el ? serializeDomToMarkdown(el) : (block.content || '')
    onChange({ ...block, content: nextContent, format: 'markdown', ...extraPatch })
  }

  const applyInlineCommand = (command) => {
    const el = editableRef.current
    if (el) el.focus()
    // execCommand is deprecated but still the pragmatic way to toggle
    // bold/italic on an existing selection inside contentEditable; it isn't
    // implemented in jsdom, so guard it (see MarkdownEditorPanel.test.js).
    if (typeof document !== 'undefined' && typeof document.execCommand === 'function') {
      try { document.execCommand(command, false, null) } catch { /* not supported in this environment */ }
    }
    emit()
  }

  const setBlockElementTag = (tagName) => {
    const el = editableRef.current
    if (!el) { emit(); return }
    const target = currentBlockElement(el)
    if (!target) { emit(); return }
    if (target.tagName === tagName.toUpperCase()) { emit(); return }
    const replacement = document.createElement(tagName)
    while (target.firstChild) replacement.appendChild(target.firstChild)
    target.replaceWith(replacement)
    emit()
  }

  const insertImages = (refs) => {
    setPickerOpen(false)
    if (!refs?.length) return
    const el = editableRef.current
    if (el) {
      const sel = typeof window !== 'undefined' ? window.getSelection() : null
      let range = null
      if (sel && sel.rangeCount && el.contains(sel.anchorNode)) {
        range = sel.getRangeAt(0)
      } else {
        range = document.createRange()
        range.selectNodeContents(el)
        range.collapse(false)
      }
      refs.forEach((r) => {
        const node = createImageBlockNode(document, r.url, '')
        range.deleteContents()
        range.insertNode(node)
        range.setStartAfter(node)
        range.collapse(true)
      })
      if (sel) { sel.removeAllRanges(); sel.addRange(range) }
    }
    const seen = new Set((block.images || []).map((i) => i.assetId))
    const images = [...(block.images || []), ...refs.filter((r) => r.assetId && !seen.has(r.assetId)).map((r) => ({ assetId: r.assetId, url: r.url }))]
    emit({ images })
  }

  const onKeyDown = (e) => {
    // "/" on an empty block opens the photo picker
    if (e.key === '/') {
      const el = editableRef.current
      const target = el ? currentBlockElement(el) : null
      const isEmpty = target ? (target.textContent || '').trim() === '' : (el?.textContent || '').trim() === ''
      if (isEmpty) {
        e.preventDefault()
        setPickerOpen(true)
      }
    }
  }

  const TOOLBAR = [
    { name: 'Bold', tip: 'Bold', act: () => applyInlineCommand('bold'), label: 'B' },
    { name: 'Italic', tip: 'Italic', act: () => applyInlineCommand('italic'), label: 'I' },
    { name: 'Heading', tip: 'Heading', act: () => setBlockElementTag('h3'), label: 'H' },
    { name: 'Quote', tip: 'Quote', act: () => setBlockElementTag('blockquote'), label: '"' },
    { name: 'Image', tip: 'Insert photo', act: () => setPickerOpen(true), label: 'Img' },
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
          width: PANEL_WIDTH, maxWidth: '92vw', background: 'var(--panel)',
          boxShadow: open ? '-24px 0 60px rgba(20,14,8,0.4)' : 'none',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid rgba(160,140,110,0.22)' }}
        >
          <div className="flex items-center gap-1">
            {TOOLBAR.map((t) => (
              <Tip key={t.name} label={t.tip} side="bottom">
                <ToolbarButton name={t.name} label={t.label} onClick={t.act} />
              </Tip>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              color: '#2c2416',
              borderRadius: 4,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 500,
              border: '1px solid rgba(44,36,22,0.4)',
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
        <div
          ref={editableRef}
          className="md-editable scroll-thin flex-1 resize-none p-4 text-sm leading-relaxed outline-none"
          contentEditable
          suppressContentEditableWarning
          onInput={() => emit()}
          onKeyDown={onKeyDown}
          data-placeholder="Write your story… Use bold, italics, headings — or type / on an empty line to add a photo."
          style={{ background: 'transparent', color: 'var(--text-primary)', overflowY: 'auto' }}
        />
        <div
          className="px-4 py-2 text-[11px]"
          style={{ borderTop: '1px solid rgba(160,140,110,0.18)', color: 'var(--text-muted)' }}
        >
          The final look depends on your site&apos;s theme.
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
