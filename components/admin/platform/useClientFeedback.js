// components/admin/platform/useClientFeedback.js
// Fetches one page's per-photo client feedback for the editor. Fetches only when
// client features are enabled on the page; failures degrade to "no feedback".
import { useEffect, useState } from 'react'

const EMPTY = { byPhoto: {}, lastActivityTs: 0, hasFeedback: false }

export function useClientFeedback(pageId, enabled) {
  const [state, setState] = useState({ ...EMPTY, loading: !!(enabled && pageId) })

  useEffect(() => {
    if (!enabled || !pageId) { setState({ ...EMPTY, loading: false }); return }
    let alive = true
    setState((s) => ({ ...s, loading: true }))
    fetch(`/api/admin/engagement?pageId=${encodeURIComponent(pageId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return
        if (!d) { setState({ ...EMPTY, loading: false }); return }
        setState({
          byPhoto: d.byPhoto || {},
          lastActivityTs: d.lastActivityTs || 0,
          hasFeedback: !!d.hasFeedback,
          loading: false,
        })
      })
      .catch(() => { if (alive) setState({ ...EMPTY, loading: false }) })
    return () => { alive = false }
  }, [pageId, enabled])

  return state
}
