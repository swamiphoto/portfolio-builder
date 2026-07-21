// components/image-displays/engagement/SubmitPill.js
// Floating "N selected · Submit favorites" pill, shown once the visitor has
// hearted at least one photo and the photographer enabled the submit workflow.
import { useState } from 'react'
import { useClientEngagement } from './ClientEngagementContext'

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'
const INK = '#1a120a'
const INK_TEXT = '#f5f0e8'

const pillStyle = {
  position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
  display: 'flex', alignItems: 'center', gap: 10,
  background: 'rgba(20,14,8,0.92)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
  color: INK_TEXT, padding: '9px 9px 9px 16px', borderRadius: 999,
  fontFamily: MONO, fontSize: 11, letterSpacing: '0.04em',
  boxShadow: '0 8px 28px rgba(26,18,10,0.32)',
  whiteSpace: 'nowrap',
}

const submitBtnStyle = {
  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)',
  color: INK_TEXT, padding: '6px 14px', borderRadius: 999, cursor: 'pointer',
  fontFamily: MONO, fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase',
  transition: 'background 0.15s ease',
}

const toastStyle = {
  position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
  display: 'flex', alignItems: 'center', gap: 8,
  background: INK, color: INK_TEXT, padding: '10px 16px', borderRadius: 8,
  fontFamily: MONO, fontSize: 11, letterSpacing: '0.04em',
  boxShadow: '0 8px 28px rgba(26,18,10,0.28)',
}

export default function SubmitPill() {
  const ctx = useClientEngagement()
  const [toast, setToast] = useState(null)

  if (!ctx || !ctx.features.submitWorkflow) return null

  if (toast) {
    return (
      <div style={toastStyle}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#5aa76b', flexShrink: 0 }} />
        {toast.count} favorite{toast.count === 1 ? '' : 's'} sent
      </div>
    )
  }

  if (ctx.submitted || ctx.myFavoriteCount === 0) return null

  const handleSubmit = () => {
    const count = ctx.myFavoriteCount
    ctx.submitFavorites()
    setToast({ count })
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <div style={pillStyle}>
      <span>{ctx.myFavoriteCount} selected</span>
      <button
        style={submitBtnStyle}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
        onClick={handleSubmit}
      >
        Submit favorites
      </button>
    </div>
  )
}
