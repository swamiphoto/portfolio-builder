// components/image-displays/engagement/CommentsPanel.js
// Per-photo comments: bottom sheet on small screens, centered card on desktop.
// Visible to anyone with gallery access.
import { useState } from 'react'
import { useClientEngagement } from './ClientEngagementContext'
import { getSizedUrl } from '../../../common/imageUtils'

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function CommentsPanel({ photoUrl, onClose }) {
  const ctx = useClientEngagement()
  const [draft, setDraft] = useState('')
  if (!ctx) return null
  const comments = ctx.commentsFor(photoUrl)

  function submit(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    ctx.addComment(photoUrl, text)
    setDraft('')
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center gap-3 p-4 border-b border-stone-100">
          <img src={getSizedUrl(photoUrl, 'thumbnail')} alt="" className="w-12 h-12 object-cover rounded-lg" />
          <div className="flex-1 text-sm font-medium text-stone-700">Comments</div>
          <button onClick={onClose} aria-label="Close comments" className="text-stone-400 text-2xl leading-none px-1">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {comments.length === 0 && <p className="text-sm text-stone-400">No comments yet — be the first.</p>}
          {comments.map(c => (
            <div key={c.id}>
              <div className="text-xs text-stone-400">{c.name} · {timeAgo(c.ts)}</div>
              <div className="text-sm text-stone-700 whitespace-pre-line">{c.text}</div>
            </div>
          ))}
        </div>
        {ctx.features.comments && (
          <form onSubmit={submit} className="p-3 border-t border-stone-100 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a comment…"
              maxLength={1000}
              className="flex-1 border border-stone-300 rounded-full px-4 py-2 text-sm outline-none focus:border-stone-500"
            />
            <button type="submit" disabled={!draft.trim()} className="text-sm bg-stone-900 text-white px-4 py-2 rounded-full disabled:opacity-40">Post</button>
          </form>
        )}
      </div>
    </div>
  )
}
