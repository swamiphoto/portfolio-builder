// components/image-displays/engagement/DownloadSheet.js
import { useState } from 'react'
import { useClientEngagement } from './ClientEngagementContext'

export default function DownloadSheet({ photoUrl, onClose }) {
  const ctx = useClientEngagement()
  const [loading, setLoading] = useState(null)

  if (!ctx?.identity) return null

  function triggerDownload(quality) {
    setLoading(quality)
    const params = new URLSearchParams({
      username: ctx.username,
      pageId: ctx.pageId,
      photoUrl,
      quality,
      deviceId: ctx.identity.deviceId,
    })
    const a = document.createElement('a')
    a.href = `/api/client/download?${params}`
    a.download = quality === 'display' ? 'photo-web.jpg' : 'photo-original.jpg'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => { setLoading(null); onClose() }, 500)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: 'rgba(20,14,8,0.32)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card, #fdf9f4)',
          borderRadius: '16px 16px 0 0',
          boxShadow: 'var(--popover-shadow, 0 8px 40px rgba(20,14,8,0.28))',
          padding: '20px 24px 32px',
          width: '100%',
          maxWidth: 420,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 3, background: 'rgba(44,36,22,0.18)', borderRadius: 99, margin: '0 auto 20px' }} />

        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary, #2c2416)', marginBottom: 16 }}>
          Download photo
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { quality: 'display', label: 'Web', sub: 'Display quality' },
            { quality: 'original', label: 'Full res', sub: 'Original file' },
          ].map(({ quality, label, sub }) => (
            <button
              key={quality}
              type="button"
              disabled={!!loading}
              onClick={() => triggerDownload(quality)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                background: loading === quality ? 'rgba(44,36,22,0.08)' : 'rgba(44,36,22,0.04)',
                border: '1px solid rgba(44,36,22,0.10)',
                borderRadius: 10,
                cursor: loading ? 'default' : 'pointer',
                transition: 'background 0.15s ease',
                width: '100%',
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary, #2c2416)' }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted, #8a7560)', marginTop: 2 }}>{sub}</div>
              </div>
              {loading === quality
                ? <span style={{ fontSize: 11, color: 'var(--text-muted, #8a7560)' }}>Downloading…</span>
                : <DownloadArrow />}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 16, width: '100%', padding: '10px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--text-muted, #8a7560)',
          }}
        >
          Cancel
        </button>
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
