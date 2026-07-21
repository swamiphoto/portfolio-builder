// components/image-displays/engagement/ClientEngagementContext.js
// Client-gallery engagement state (favorites, comments, identity, submit),
// mirroring the PrintStoreProvider pattern: mounted only on public pages,
// consumers self-gate on a null context so the editor preview is untouched.
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { getClientIdentity, saveClientIdentity } from '../../../common/clientIdentity'
import IdentityPrompt from './IdentityPrompt'
import CommentsPanel from './CommentsPanel'
import SubmitPill from './SubmitPill'
import DownloadSheet from './DownloadSheet'
import PurchaseSheet from './PurchaseSheet'

const Ctx = createContext(null)
export function useClientEngagement() { return useContext(Ctx) }

export function ClientEngagementProvider({ username, pageId, pageSlug, clientFeatures, paymentsReady, branding, children }) {
  const enabled = !!clientFeatures?.enabled
  const features = useMemo(() => ({
    favorites: !!(enabled && clientFeatures?.favorites?.enabled),
    comments: !!(enabled && clientFeatures?.comments?.enabled),
    submitWorkflow: !!(enabled && clientFeatures?.favorites?.enabled),
    watermark: !!(enabled && clientFeatures?.watermark?.enabled),
    favoritesRequireEmail: !!(enabled && clientFeatures?.favorites?.enabled),
    commentsRequireEmail: !!(enabled && clientFeatures?.comments?.enabled),
    downloads: !!(enabled && clientFeatures?.downloads?.enabled),
    purchase: !!(enabled && clientFeatures?.purchase?.enabled && paymentsReady),
  }), [enabled, clientFeatures, paymentsReady])

  const [identity, setIdentity] = useState(null)
  const [data, setData] = useState({ people: {}, favorites: [], comments: [], submissions: [] })
  const [pendingAction, setPendingAction] = useState(null) // action queued behind the identity prompt
  const [commentsUrl, setCommentsUrl] = useState(null)
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [error, setError] = useState(null)
  const purchaseCfg = clientFeatures?.purchase || {}
  const [purchaseState, setPurchaseState] = useState(null) // { unlockedUrls, unlockedCount, ceiling, all, remaining }
  const [purchaseOpen, setPurchaseOpen] = useState(false)

  useEffect(() => { setIdentity(getClientIdentity(username)) }, [username])

  const interactive = features.favorites || features.comments || features.downloads || features.purchase
  const refetch = useCallback(() => {
    const id = getClientIdentity(username)
    const qs = new URLSearchParams({ username, pageId })
    if (id?.deviceId) qs.set('deviceId', id.deviceId)
    return fetch(`/api/client/engagement?${qs}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) { setData(d); if (d.purchase) setPurchaseState(d.purchase) } })
      .catch(() => {})
  }, [username, pageId])

  useEffect(() => {
    if (!interactive) return
    let alive = true
    refetch().then(() => { if (!alive) return })
    return () => { alive = false }
  }, [interactive, refetch])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!new URLSearchParams(window.location.search).get('purchase')) return
    let n = 0
    const tick = () => { refetch(); if (++n < 5) setTimeout(tick, 2000) }
    tick()
  }, [refetch])

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
    if (kind === 'download') return !identity.email
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
    paymentsReady: !!paymentsReady,
    packages: purchaseCfg.packages || [],
    purchaseCurrency: purchaseCfg.currency || 'USD',
    purchaseState,
    isUnlocked: (url) => !!purchaseState && (purchaseState.all || purchaseState.unlockedUrls?.includes(url)),
    canUnlockMore: () => !!purchaseState && (purchaseState.all || purchaseState.remaining > 0),
    openPurchase: () => setPurchaseOpen(true),
    startCheckout: async (packageId) => {
      const id = getClientIdentity(username)
      const res = await fetch('/api/client/purchase/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pageId, packageId, buyer: { email: id?.email, name: id?.name }, returnPath: window.location.pathname }),
      })
      const body = await res.json().catch(() => null)
      if (body?.url) window.location.href = body.url
    },
    openDownload: (photoUrl) => runOrPrompt('download', () => {
      if (features.purchase) {
        const unlocked = !!purchaseState && (purchaseState.all || purchaseState.unlockedUrls?.includes(photoUrl))
        const canMore = !!purchaseState && (purchaseState.all || purchaseState.remaining > 0)
        if (!unlocked && !canMore) { setPurchaseOpen(true); return }
      }
      setDownloadUrl(photoUrl)
    }),
    downloadUrl,
    closeDownload: () => setDownloadUrl(null),
    username,
    pageId,
    pageSlug,
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
    switchIdentity: () => setPendingAction({ kind: 'favorite', run: () => {} }),
  } : null, [enabled, features, branding, identity, data, myFavorites, submitted, runOrPrompt, performFavorite, performComment, post, downloadUrl, username, pageId, pageSlug, purchaseState, purchaseOpen, paymentsReady, purchaseCfg])

  if (!enabled) return children

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {pendingAction && (
        <IdentityPrompt
          requireEmail={
            pendingAction.kind === 'download'
              ? true
              : pendingAction.kind === 'comment'
                ? features.commentsRequireEmail
                : features.favoritesRequireEmail
          }
          initial={identity}
          onSave={completeIdentity}
          onCancel={() => setPendingAction(null)}
        />
      )}
      {commentsUrl && <CommentsPanel photoUrl={commentsUrl} onClose={() => setCommentsUrl(null)} />}
      {downloadUrl && <DownloadSheet photoUrl={downloadUrl} onClose={() => setDownloadUrl(null)} />}
      {purchaseOpen && <PurchaseSheet onClose={() => setPurchaseOpen(false)} />}
      {features.submitWorkflow && <SubmitPill />}
      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-stone-900 text-white text-sm px-4 py-2 rounded-full shadow-lg">
          {error}
        </div>
      )}
    </Ctx.Provider>
  )
}

// Read-only "review" context for the editor preview: EngagementActions renders
// a static feedback badge (no client interactions). Shares Ctx so the existing
// engagementOverlay slot in every gallery layout lights up unchanged.
export function ReviewFeedbackProvider({ feedbackByPhoto, onOpenPhoto, children }) {
  const value = useMemo(() => ({
    mode: 'review',
    features: { favorites: true, comments: true },
    favoriteCount: (url) => feedbackByPhoto?.[url]?.favCount || 0,
    commentCount: (url) => feedbackByPhoto?.[url]?.commentCount || 0,
    openReview: (url) => onOpenPhoto && onOpenPhoto(url),
    // no-op client surface so any accidental call is harmless
    isFavorited: () => false,
    toggleFavorite: () => {},
    openComments: (url) => onOpenPhoto && onOpenPhoto(url),
  }), [feedbackByPhoto, onOpenPhoto])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
