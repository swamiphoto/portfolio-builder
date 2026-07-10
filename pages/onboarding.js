import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import ImportFlow from '../components/admin/import/ImportFlow'
import { applyImportToConfig } from '../common/import/importClient'

function goToAdmin(slug, { imported = false } = {}) {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3005'
  const protocol = rootDomain.includes('lvh.me') || rootDomain.includes('localhost') ? 'http' : 'https'
  const query = imported ? '?imported=1' : ''
  window.location.href = `${protocol}://${slug}.${rootDomain}/admin${query}`
}

export default function Onboarding() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [step, setStep] = useState('url') // 'url' | 'import-offer'
  const [isReturning, setIsReturning] = useState(false)
  const [username, setUsername] = useState('')
  const [claimedSlug, setClaimedSlug] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/auth/signin')
    if (status === 'authenticated' && session?.user?.username && step === 'url') {
      // They already have a username — post-login sent them here because they
      // have no photos yet, so go straight to the import offer.
      setClaimedSlug(session.user.username)
      setIsReturning(true)
      setStep('import-offer')
    }
  }, [status, session, router, step])

  const slug = username.toLowerCase().replace(/[^a-z0-9-]/g, '')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!slug) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: slug, displayName: session?.user?.name || '' }),
      })
      if (res.status === 409) {
        setError('That username is taken. Try another.')
        setSaving(false)
        return
      }
      if (!res.ok) throw new Error('Save failed')
      setClaimedSlug(slug)
      setStep('import-offer')
      setSaving(false)
    } catch {
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  if (status === 'loading' || status === 'unauthenticated') return null

  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'sepia.photo').replace(/:\d+$/, '')
  const firstName = session?.user?.name?.split(' ')[0] || null

  // ── Step 2: import offer ──────────────────────────────────────────────────
  if (step === 'import-offer') {
    return (
      <div
        className="flex flex-col items-center justify-center h-screen font-sans"
        style={{ background: 'var(--desk, #e8e2d9)' }}
      >
        <div style={{ width: '100%', maxWidth: 420, padding: '0 32px' }}>
          <p style={{
            fontFamily: '"SF Mono", Menlo, Monaco, Consolas, monospace',
            fontSize: 10.5,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#a8967a',
            fontWeight: 500,
            marginBottom: 20,
          }}>
            {claimedSlug}.{rootDomain}
          </p>

          <h1 style={{
            fontFamily: '"Fraunces", Georgia, serif',
            fontSize: 30,
            fontWeight: 300,
            fontStyle: 'italic',
            color: '#2c2416',
            marginBottom: 10,
            lineHeight: 1.15,
          }}>
            {isReturning
              ? `Welcome back${firstName ? `, ${firstName}` : ''}.`
              : `Welcome${firstName ? `, ${firstName}` : ''}.`}
          </h1>
          <p style={{ fontSize: 14.5, color: '#7a6b55', marginBottom: 40, lineHeight: 1.6, maxWidth: 340 }}>
            Your site is almost ready. Do you have photos on another site you want to bring over?
          </p>

          <button
            onClick={() => setShowImport(true)}
            style={{
              width: '100%',
              padding: '13px 16px',
              background: '#2c2416',
              color: '#f5ecd6',
              fontSize: 14,
              fontWeight: 500,
              borderRadius: 5,
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.15s',
              letterSpacing: '0.01em',
              marginBottom: 14,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#3d2d18' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#2c2416' }}
          >
            Import from an existing site
          </button>

          <button
            onClick={() => goToAdmin(claimedSlug)}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              color: '#7a6b55',
              fontSize: 13.5,
              fontWeight: 400,
              borderRadius: 5,
              border: '1px solid rgba(160,140,110,0.35)',
              cursor: 'pointer',
              transition: 'all 0.15s',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(160,140,110,0.10)'; e.currentTarget.style.color = '#2c2416' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7a6b55' }}
          >
            Skip and start with a blank canvas
          </button>
        </div>

        {showImport && (
          <ImportFlow
            variant="modal"
            onClose={() => goToAdmin(claimedSlug)}
            onComplete={async (summary) => {
              // Save the imported assets (with their source metadata) before redirecting,
              // otherwise the library GET will create them from the GCS listing with no
              // source info, defaulting to provider:'manual' → shows as "Uploaded".
              try {
                const res = await fetch('/api/admin/library')
                const currentConfig = res.ok ? await res.json() : {}
                const next = applyImportToConfig(currentConfig, summary)
                await fetch('/api/admin/library', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(next),
                })
              } catch {
                // Non-fatal — user still lands in admin, source just won't be labelled
              }
              goToAdmin(claimedSlug, { imported: true })
            }}
          />
        )}
      </div>
    )
  }

  // ── Step 1: choose URL ────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col items-center justify-center h-screen font-sans"
      style={{ background: 'var(--desk, #e8e2d9)' }}
    >
      <div style={{ width: '100%', maxWidth: 420, padding: '0 32px' }}>
        <h1 style={{
          fontFamily: '"Fraunces", Georgia, serif',
          fontSize: 30,
          fontWeight: 300,
          fontStyle: 'italic',
          color: '#2c2416',
          marginBottom: 10,
          lineHeight: 1.15,
        }}>
          Welcome to Sepia.
        </h1>
        <p style={{ fontSize: 14.5, color: '#7a6b55', marginBottom: 40, lineHeight: 1.6, maxWidth: 320 }}>
          Your portfolio is almost ready. Choose the address where your work will live.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{
            display: 'block',
            fontFamily: '"SF Mono", Menlo, Monaco, Consolas, monospace',
            fontSize: 10.5,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#a8967a',
            fontWeight: 500,
            marginBottom: 8,
          }}>
            Your URL
          </label>

          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'stretch',
                border: '1px solid rgba(160,140,110,0.45)',
                borderRadius: 6,
                overflow: 'hidden',
                transition: 'border-color 0.15s',
                background: '#faf7f2',
                boxShadow: '0 1px 3px rgba(60,40,15,0.06)',
              }}
              onFocusCapture={(e) => e.currentTarget.style.borderColor = 'rgba(120,100,70,0.65)'}
              onBlurCapture={(e) => e.currentTarget.style.borderColor = 'rgba(160,140,110,0.45)'}
            >
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError('') }}
                placeholder="yourname"
                autoFocus
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  fontSize: 15,
                  color: '#2c2416',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <span style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 14px',
                fontSize: 12.5,
                fontFamily: '"SF Mono", Menlo, Monaco, Consolas, monospace',
                color: '#a8967a',
                background: 'rgba(160,140,110,0.10)',
                borderLeft: '1px solid rgba(160,140,110,0.28)',
                whiteSpace: 'nowrap',
              }}>
                .{rootDomain}
              </span>
            </div>

            {slug && slug !== username.toLowerCase() && (
              <p style={{
                fontSize: 11.5,
                color: '#a8967a',
                marginTop: 6,
                fontFamily: '"SF Mono", Menlo, Monaco, Consolas, monospace',
              }}>
                → {slug}.{rootDomain}
              </p>
            )}
            {error && (
              <p style={{ fontSize: 13, color: '#a0451e', marginTop: 7, lineHeight: 1.4 }}>
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!slug || saving}
            style={{
              width: '100%',
              padding: '13px 16px',
              background: !slug || saving ? 'rgba(60,40,15,0.18)' : '#2c2416',
              color: !slug || saving ? 'rgba(245,236,214,0.5)' : '#f5ecd6',
              fontSize: 14,
              fontWeight: 500,
              borderRadius: 5,
              border: 'none',
              cursor: !slug || saving ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={(e) => { if (slug && !saving) e.currentTarget.style.background = '#3d2d18' }}
            onMouseLeave={(e) => { if (slug && !saving) e.currentTarget.style.background = '#2c2416' }}
          >
            {saving ? 'Saving…' : 'Claim your URL'}
          </button>
        </form>
      </div>
    </div>
  )
}
