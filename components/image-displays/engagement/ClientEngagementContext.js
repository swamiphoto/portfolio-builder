// components/image-displays/engagement/ClientEngagementContext.js
// Client-gallery engagement state (favorites, comments, identity, submit),
// mirroring the PrintStoreProvider pattern: mounted only on public pages,
// consumers self-gate on a null context so the editor preview is untouched.
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { getClientIdentity, saveClientIdentity } from '../../../common/clientIdentity'
import IdentityPrompt from './IdentityPrompt'
import CommentsPanel from './CommentsPanel'
import SubmitPill from './SubmitPill'

const Ctx = createContext(null)
export function useClientEngagement() { return useContext(Ctx) }

export function ClientEngagementProvider({ username, pageId, clientFeatures, branding, children }) {
  const enabled = !!clientFeatures?.enabled
  const features = useMemo(() => ({
    favorites: !!(enabled && clientFeatures?.favorites?.enabled),
    comments: !!(enabled && clientFeatures?.comments?.enabled),
    submitWorkflow: !!(enabled && clientFeatures?.favorites?.submitWorkflow),
    watermark: !!(enabled && clientFeatures?.watermark?.enabled),
    favoritesRequireEmail: !!(enabled && clientFeatures?.favorites?.requireEmail),
    commentsRequireEmail: !!(enabled && clientFeatures?.comments?.requireEmail),
  }), [enabled, clientFeatures])

  const [identity, setIdentity] = useState(null)
  const [data, setData] = useState({ people: {}, favorites: [], comments: [], submissions: [] })
  const [pendingAction, setPendingAction] = useState(null) // action queued behind the identity prompt
  const [commentsUrl, setCommentsUrl] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => { setIdentity(getClientIdentity(username)) }, [username])

  const interactive = features.favorites || features.comments
  useEffect(() => {
    if (!interactive) return
    let alive = true
    fetch(`/api/client/engagement?username=${encodeURIComponent(username)}&pageId=${encodeURIComponent(pageId)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive && d) setData(d) })
      .catch(() => {})
    return () => { alive = false }
  }, [interactive, username, pageId])

  const post = useCallback(async (body) => {
    const res = await fetch('/api/client/engagement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pageId, ...body }),
    })
    if (!res.ok) throw new Error('request failed')
    return res.json()
  }, [username, pageId])

  const performFavorite = useCallback((id, photoUrl) => {
    const mine = data.favorites.some(f => f.photoUrl === photoUrl && f.deviceId === id.deviceId)
    const favorites = mine
      ? data.favorites.filter(f => !(f.photoUrl === photoUrl && f.deviceId === id.deviceId))
      : [...data.favorites, { photoUrl, deviceId: id.deviceId, ts: Date.now() }]
    const prevFavorites = data.favorites
    setData(prev => ({ ...prev, favorites }))
    post({ deviceId: id.deviceId, action: mine ? 'unfavorite' : 'favorite', photoUrl }).catch(() => {
      setData(p => ({ ...p, favorites: prevFavorites })) // rollback
      setError('Could not save — try again')
      setTimeout(() => setError(null), 2500)
    })
  }, [data, post])

  const performComment = useCallback((id, photoUrl, text) => {
    const entry = { id: `tmp_${Date.now()}`, photoUrl, deviceId: id.deviceId, text, ts: Date.now() }
    setData(prev => ({
      ...prev,
      comments: [...prev.comments, entry],
      people: { ...prev.people, [id.deviceId]: { name: id.name } },
    }))
    post({ deviceId: id.deviceId, action: 'comment', photoUrl, text }).catch(() => {
      setData(p => ({ ...p, comments: p.comments.filter(c => c.id !== entry.id) }))
      setError('Could not post comment — try again')
      setTimeout(() => setError(null), 2500)
    })
  }, [post])

  // requireEmail per feature: the identity prompt collects email when the toggle demands it.
  const needsIdentity = useCallback((kind) => {
    if (!identity) return true
    const wantEmail = kind === 'comment' ? features.commentsRequireEmail : features.favoritesRequireEmail
    return wantEmail && !identity.email
  }, [identity, features])

  const runOrPrompt = useCallback((kind, run) => {
    if (needsIdentity(kind)) { setPendingAction({ kind, run }); return }
    run(identity)
  }, [needsIdentity, identity])

  const completeIdentity = useCallback((name, email) => {
    const saved = saveClientIdentity(username, { name, email })
    setIdentity(saved)
    setData(prev => ({ ...prev, people: { ...prev.people, [saved.deviceId]: { name: saved.name } } }))
    post({ deviceId: saved.deviceId, action: 'identify', name: saved.name, email: saved.email }).catch(() => {})
    if (pendingAction) { pendingAction.run(saved); setPendingAction(null) }
  }, [username, post, pendingAction])

  const myFavorites = useMemo(() => new Set(
    identity ? data.favorites.filter(f => f.deviceId === identity.deviceId).map(f => f.photoUrl) : []
  ), [data.favorites, identity])

  const submitted = useMemo(() => {
    if (!identity) return false
    const mine = (data.submissions || []).filter(s => s.deviceId === identity.deviceId)
    return mine.length > 0 && mine[mine.length - 1].count === myFavorites.size
  }, [data.submissions, identity, myFavorites])

  const ctx = useMemo(() => enabled ? {
    features,
    branding: branding || {},
    identity,
    isFavorited: (url) => myFavorites.has(url),
    favoriteCount: (url) => data.favorites.filter(f => f.photoUrl === url).length,
    commentCount: (url) => data.comments.filter(c => c.photoUrl === url).length,
    commentsFor: (url) => data.comments
      .filter(c => c.photoUrl === url)
      .map(c => ({ id: c.id, name: data.people[c.deviceId]?.name || 'Someone', text: c.text, ts: c.ts })),
    myFavoriteCount: myFavorites.size,
    toggleFavorite: (photoUrl) => runOrPrompt('favorite', (id) => performFavorite(id, photoUrl)),
    openComments: (photoUrl) => setCommentsUrl(photoUrl),
    addComment: (photoUrl, text) => runOrPrompt('comment', (id) => performComment(id, photoUrl, text)),
    submitFavorites: () => runOrPrompt('favorite', (id) => {
      post({ deviceId: id.deviceId, action: 'submit' }).then(() => {
        setData(prev => ({ ...prev, submissions: [...(prev.submissions || []), { deviceId: id.deviceId, ts: Date.now(), count: myFavorites.size }] }))
      }).catch(() => {
        setError('Could not submit — try again')
        setTimeout(() => setError(null), 2500)
      })
    }),
    submitted,
  } : null, [enabled, features, branding, identity, data, myFavorites, submitted, runOrPrompt, performFavorite, performComment, post])

  if (!enabled) return children

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {pendingAction && (
        <IdentityPrompt
          requireEmail={pendingAction.kind === 'comment' ? features.commentsRequireEmail : features.favoritesRequireEmail}
          initial={identity}
          onSave={completeIdentity}
          onCancel={() => setPendingAction(null)}
        />
      )}
      {commentsUrl && <CommentsPanel photoUrl={commentsUrl} onClose={() => setCommentsUrl(null)} />}
      {features.submitWorkflow && <SubmitPill />}
      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-stone-900 text-white text-sm px-4 py-2 rounded-full shadow-lg">
          {error}
        </div>
      )}
    </Ctx.Provider>
  )
}
