// components/admin/gallery-builder/EditorFeedbackContext.js
// Supplies per-photo client feedback to the editor's block cards and preview.
// Badges self-gate on this context, mirroring how the public EngagementActions
// self-gates on ClientEngagementContext — so no feedback props are threaded
// through the large BlockCard. `showFeedback` is a photographer view preference
// persisted in localStorage; it is never written to siteConfig.
import React, { createContext, useContext, useCallback, useMemo, useState } from 'react'
import PhotoFeedbackBadge from '../../image-displays/engagement/PhotoFeedbackBadge'
import PhotoFeedbackPopover from './PhotoFeedbackPopover'

const SHOW_KEY = 'sepia:show-feedback'
const Ctx = createContext(null)

export function useEditorFeedback() { return useContext(Ctx) }

function readShow() {
  try { return localStorage.getItem(SHOW_KEY) === '1' } catch { return false }
}

export function EditorFeedbackProvider({ pageId, feedbackByPhoto, hasFeedback, lastActivityTs, children }) {
  const [showFeedback, setShow] = useState(readShow)
  const [openUrl, setOpenUrl] = useState(null)

  const setShowFeedback = useCallback((next) => {
    setShow(next)
    try { localStorage.setItem(SHOW_KEY, next ? '1' : '0') } catch {}
  }, [])

  const value = useMemo(() => ({
    pageId,
    showFeedback,
    setShowFeedback,
    hasFeedback: !!hasFeedback,
    lastActivityTs: lastActivityTs || 0,
    feedbackByPhoto: feedbackByPhoto || {},
    openPhoto: (url) => setOpenUrl(url),
  }), [pageId, showFeedback, setShowFeedback, hasFeedback, lastActivityTs, feedbackByPhoto])

  const openFeedback = openUrl ? (feedbackByPhoto || {})[openUrl] : null

  return (
    <Ctx.Provider value={value}>
      {children}
      {openFeedback && <PhotoFeedbackPopover feedback={openFeedback} onClose={() => setOpenUrl(null)} />}
    </Ctx.Provider>
  )
}

export function EditorPhotoBadge({ url }) {
  const ctx = useEditorFeedback()
  if (!ctx || !ctx.showFeedback) return null
  const fb = ctx.feedbackByPhoto[url]
  if (!fb) return null
  return <PhotoFeedbackBadge compact favCount={fb.favCount} commentCount={fb.commentCount} onOpen={() => ctx.openPhoto(url)} />
}
