// components/admin/platform/ClientFeedbackBanner.js
// One-time, per-page discovery banner for new client feedback. Appears when a
// page has feedback the photographer hasn't seen; "Show on photos" turns on the
// editor badges. "Seen" is tracked per page in localStorage, distinct from the
// masthead bell's own last-seen key.
import React, { useMemo, useState } from 'react'
import { useEditorFeedback } from '../gallery-builder/EditorFeedbackContext'

const seenKey = (pageId) => `sepia:feedback-seen:${pageId}`

function readSeen(pageId) {
  try { return parseInt(localStorage.getItem(seenKey(pageId)) || '0', 10) } catch { return 0 }
}
function markSeen(pageId, ts) {
  try { localStorage.setItem(seenKey(pageId), String(ts)) } catch {}
}

export default function ClientFeedbackBanner() {
  const ctx = useEditorFeedback()
  const [dismissed, setDismissed] = useState(false)

  const { favTotal, comTotal } = useMemo(() => {
    let favTotal = 0, comTotal = 0
    for (const fb of Object.values(ctx?.feedbackByPhoto || {})) {
      favTotal += fb.favCount || 0
      comTotal += fb.commentCount || 0
    }
    return { favTotal, comTotal }
  }, [ctx?.feedbackByPhoto])

  if (!ctx || !ctx.hasFeedback || dismissed) return null
  if (ctx.lastActivityTs <= readSeen(ctx.pageId)) return null

  const close = () => { markSeen(ctx.pageId, ctx.lastActivityTs); setDismissed(true) }
  const show = () => { ctx.setShowFeedback(true); close() }

  const parts = []
  if (favTotal) parts.push(`${favTotal} favorite${favTotal === 1 ? '' : 's'}`)
  if (comTotal) parts.push(`${comTotal} comment${comTotal === 1 ? '' : 's'}`)

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 text-xs"
      style={{ background: 'rgba(193,74,74,0.08)', borderBottom: '1px solid rgba(193,74,74,0.18)', color: 'var(--text-secondary)' }}
    >
      <span><span style={{ color: '#c14a4a' }}>❤</span> Your client left {parts.join(' and ')}.</span>
      <button type="button" onClick={show} className="font-semibold underline" style={{ color: '#c14a4a', background: 'transparent' }}>
        Show on photos
      </button>
      <button type="button" aria-label="Dismiss" onClick={close} className="ml-auto" style={{ color: 'var(--text-muted)', background: 'transparent' }}>
        ✕
      </button>
    </div>
  )
}
