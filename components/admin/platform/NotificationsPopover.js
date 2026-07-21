// components/admin/platform/NotificationsPopover.js
// Client-activity feed behind the masthead bell: favorites, comments, and
// selection submissions across all pages, newest first.
import { useEffect, useState } from 'react'
import PopoverShell from './PopoverShell'
import { getSizedUrl } from '../../../common/imageUtils'

const LAST_SEEN_KEY = 'sepia:notif-last-seen'

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

function summary(e) {
  if (e.type === 'submit') return `${e.person.name} submitted ${e.count} favorite${e.count === 1 ? '' : 's'}`
  if (e.type === 'comment') return `${e.person.name}: "${e.text.length > 55 ? e.text.slice(0, 55) + '…' : e.text}"`
  return `${e.person.name} favorited a photo`
}

function PhotoThumb({ url }) {
  if (!url) return null
  const src = getSizedUrl(url, 'thumbnail') || url
  return (
    <img
      src={src}
      alt=""
      style={{
        width: 44, height: 44, objectFit: 'cover', borderRadius: 6, flexShrink: 0,
        boxShadow: '0 1px 4px rgba(20,14,8,0.14)',
      }}
      onError={(e) => { e.target.style.display = 'none' }}
    />
  )
}

export default function NotificationsPopover({ anchorEl, onClose, onSelectPage }) {
  const [events, setEvents] = useState(null)

  useEffect(() => {
    fetch('/api/admin/engagement')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setEvents(d?.events || []))
      .catch(() => setEvents([]))
    try { localStorage.setItem(LAST_SEEN_KEY, String(Date.now())) } catch {}
  }, [])

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={340} title="Notifications" placement="below">
      <div className="max-h-96 overflow-y-auto">
        {events === null && (
          <div className="px-4 py-6 text-xs text-center" style={{ color: 'var(--text-muted)' }}>Loading…</div>
        )}
        {events?.length === 0 && (
          <div className="px-4 py-8 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            No client activity yet. Enable client features on a page and share it.
          </div>
        )}
        {(events || []).map((e, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: '1px solid rgba(160,140,110,0.10)' }}
          >
            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="text-xs leading-snug" style={{ color: 'var(--text-secondary)' }}>
                {summary(e)}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => onSelectPage?.(e.pageId)}
                  className="text-[10px] font-medium hover:underline text-left"
                  style={{ color: 'var(--sepia-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {e.pageTitle}
                </button>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>· {timeAgo(e.ts)}</span>
              </div>
            </div>
            {/* Thumbnail */}
            <PhotoThumb url={e.photoUrl} />
          </div>
        ))}
      </div>
    </PopoverShell>
  )
}

export function useUnreadNotifications() {
  const [unread, setUnread] = useState(false)
  useEffect(() => {
    let alive = true
    fetch('/api/admin/engagement')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!alive || !d?.events?.length) return
        let lastSeen = 0
        try { lastSeen = parseInt(localStorage.getItem(LAST_SEEN_KEY) || '0', 10) } catch {}
        setUnread(d.events[0].ts > lastSeen)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])
  return [unread, () => setUnread(false)]
}
