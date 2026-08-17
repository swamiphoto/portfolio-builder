import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import ImportFlow from '../components/admin/import/ImportFlow'
import UrlClaimStep from '../components/admin/onboarding/UrlClaimStep'
import { applyImportToConfig } from '../common/import/importClient'
import { composeSite, applyComposedPages } from '../common/import/composer'

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
        style={{ background: 'var(--desk, #e8e2d9)', position: 'relative', padding: '0 24px' }}
      >
        {/* Sepia logo, top-left — same script wordmark as the home page */}
        <div style={{ position: 'absolute', top: 0, left: 0, padding: '22px 28px' }}>
          <span style={{ fontFamily: "'Italianno', cursive", fontSize: 30, lineHeight: 1, color: '#2c2416' }}>Sepia</span>
        </div>

        <div style={{ width: '100%', maxWidth: 860, textAlign: 'center' }}>
          <p className="font-fraunces" style={{ fontSize: 21, fontStyle: 'italic', color: '#5a4a36', marginBottom: 22 }}>
            {isReturning
              ? `Welcome back${firstName ? `, ${firstName}` : ''}.`
              : `Welcome${firstName ? `, ${firstName}` : ''}.`}
          </p>

          {/* the hero: the studio address, big — the way it'll read on a card */}
          <div
            className="font-fraunces"
            style={{
              fontSize: 'clamp(34px, 7vw, 68px)', fontWeight: 400, lineHeight: 1.05, color: '#2c2416',
              wordBreak: 'break-word',
            }}
          >
            <span>{claimedSlug}</span>
            <span style={{ color: '#b0a084', fontWeight: 300 }}>.{rootDomain}</span>
          </div>

          <p style={{ fontSize: 16, color: '#7a6b55', marginTop: 26, lineHeight: 1.6, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto', textWrap: 'balance' }}>
            Let's get your site set up. Do you have photos on another site you want to bring over?
          </p>

          <button
            onClick={() => setShowImport(true)}
            style={{
              marginTop: 34, padding: '14px 30px',
              background: '#2c2416',
              color: '#f6f3ec',
              fontFamily: '"SF Mono", Menlo, Monaco, Consolas, monospace',
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#3d2d18' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#2c2416' }}
          >
            Import from an existing site
          </button>

          <div style={{ marginTop: 18 }}>
            <button
              onClick={() => goToAdmin(claimedSlug)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9a876b',
                fontFamily: '"SF Mono", Menlo, Monaco, Consolas, monospace',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                padding: '8px 10px',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#2c2416' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#9a876b' }}
            >
              I'll set this up later
            </button>
          </div>
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
              try {
                if (summary.replicate && summary.siteMap?.pages?.length) {
                  const scRes = await fetch('/api/admin/site-config')
                  const siteConfig = scRes.ok ? await scRes.json() : { pages: [] }
                  const { pages } = composeSite({
                    siteMap: summary.siteMap,
                    collections: summary.collections,
                    imported: summary.imported,
                    importBatchId: summary.importBatchId,
                    existingPages: siteConfig.pages || [],
                  })
                  if (pages.length) {
                    await fetch('/api/admin/site-config', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(applyComposedPages(siteConfig, pages)),
                    })
                  }
                }
              } catch (err) {
                // Non-fatal — user still lands in admin, pages just won't be auto-created
                console.error('import page composition failed', err)
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
    <UrlClaimStep
      rootDomain={rootDomain}
      username={username}
      setUsername={(v) => { setUsername(v); setError('') }}
      slug={slug}
      error={error}
      saving={saving}
      onSubmit={handleSubmit}
    />
  )
}
