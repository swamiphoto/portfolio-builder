// components/image-displays/engagement/DownloadSheet.js
import { useState } from 'react'
import { useClientEngagement } from './ClientEngagementContext'

export default function DownloadSheet({ photoUrl, onClose }) {
  const ctx = useClientEngagement()
  const [loading, setLoading] = useState(null)

  if (!ctx?.identity) return null

  const slug = ctx.pageSlug || ctx.pageId || 'photo'

  async function triggerDownload(quality) {
    setLoading(quality)
    const params = new URLSearchParams({
      username: ctx.username,
      pageId: ctx.pageId,
      photoUrl,
      quality,
      deviceId: ctx.identity.deviceId,
    })
    const filename = quality === 'display' ? `${slug}-web.jpg` : `${slug}-full.jpg`

    if (ctx.features?.purchase) {
      try {
        const res = await fetch(`/api/client/download?${params}`)
        if (res.status === 402) {
          setLoading(null)
          onClose()
          ctx.openPurchase?.()
          return
        }
        if (!res.ok) {
          setLoading(null)
          return
        }
        const blob = await res.blob()
        const objectUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = objectUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(objectUrl)
        setLoading(null)
        onClose()
      } catch {
        setLoading(null)
      }
      return
    }

    const a = document.createElement('a')
    a.href = `/api/client/download?${params}`
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => { setLoading(null); onClose() }, 500)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(20,14,8,0.38)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fdf9f4',
          borderRadius: 14,
          border: '1px solid rgba(160,140,110,0.22)',
          boxShadow: '0 12px 48px rgba(20,14,8,0.28)',
          padding: '24px',
          width: 'calc(100% - 40px)',
          maxWidth: 320,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2c2416', letterSpacing: '-0.01em' }}>
            Download
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: '#a8967a', lineHeight: 1,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#2c2416' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#a8967a' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            { quality: 'display', label: 'Web', sub: 'Display size, ~2000px' },
            { quality: 'original', label: 'Full resolution', sub: 'Original file' },
          ].map(({ quality, label, sub }) => (
            <button
              key={quality}
              type="button"
              disabled={!!loading}
              onClick={() => triggerDownload(quality)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '11px 14px',
                background: loading === quality ? 'rgba(44,36,22,0.07)' : 'rgba(44,36,22,0.03)',
                border: '1px solid rgba(160,140,110,0.22)',
                borderRadius: 9,
                cursor: loading ? 'default' : 'pointer',
                transition: 'background 0.15s ease',
                width: '100%',
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'rgba(44,36,22,0.07)' }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = 'rgba(44,36,22,0.03)' }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#2c2416' }}>{label}</div>
                <div style={{ fontSize: 11, color: '#a8967a', marginTop: 2 }}>{sub}</div>
              </div>
              {loading === quality
                ? <span style={{ fontSize: 11, color: '#a8967a' }}>Saving…</span>
                : <DownloadArrow />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function DownloadArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: 'var(--text-muted, #8a7560)', flexShrink: 0 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}
