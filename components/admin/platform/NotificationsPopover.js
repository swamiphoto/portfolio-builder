// components/admin/platform/NotificationsPopover.js
// Client-activity feed behind the masthead bell: favorites, comments, and
// selection submissions across all pages, newest first.
import { useEffect, useState } from 'react'
import PopoverShell from './PopoverShell'

const LAST_SEEN_KEY = 'sepia:notif-last-seen'

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

function line(e) {
  if (e.type === 'submit') return `${e.person.name} submitted ${e.count} favorite${e.count === 1 ? '' : 's'}`
  if (e.type === 'comment') return `${e.person.name} commented: “${e.text.length > 60 ? e.text.slice(0, 60) + '…' : e.text}”`
  return `${e.person.name} favorited a photo`
}

export default function NotificationsPopover({ anchorEl, onClose }) {
  const [events, setEvents] = useState(null)

  useEffect(() => {
    fetch('/api/admin/engagement')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setEvents(d?.events || []))
      .catch(() => setEvents([]))
    try { localStorage.setItem(LAST_SEEN_KEY, String(Date.now())) } catch {}
  }, [])

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Notifications" placement="below">
      <div className="max-h-96 overflow-y-auto">
        {events === null && <div className="px-4 py-6 text-xs text-center" style={{ color: 'var(--text-muted)' }}>Loading…</div>}
        {events?.length === 0 && (
          <div className="px-4 py-8 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            No client activity yet. Enable client features on a page and share it.
          </div>
        )}
        {(events || []).map((e, i) => (
          <div key={i} className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(160,140,110,0.12)' }}>
            <div className="text-xs leading-snug" style={{ color: 'var(--text-secondary)' }}>{line(e)}</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{e.pageTitle} · {timeAgo(e.ts)}</div>
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
