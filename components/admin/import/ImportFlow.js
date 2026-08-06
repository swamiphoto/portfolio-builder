import { useState, useEffect } from 'react'
import { discoverSource, importSelected, makeImportBatchId } from '@/common/import/importClient'
import { MONO, monoLabel, primaryBtn, CloseIcon } from './importFlowStyles'
import ReviewStep from './ReviewStep'
import ImportShowcase from './ImportShowcase'
import ImportDoneStep from './ImportDoneStep'

// Warm darkroom backdrop shared by the import takeover + done screens.
const SHOWCASE_BG = 'radial-gradient(120% 90% at 50% 8%, #efe8dc 0%, #e4dccf 45%, #d8cdba 100%)'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function hostOf(input) {
  try {
    return new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`).hostname.replace(/^www\./, '')
  } catch {
    return input
  }
}

export default function ImportFlow({ variant = 'modal', initialInput = '', onClose, onComplete }) {
  const [step, setStep] = useState('source')
  const [input, setInput] = useState(initialInput)
  const [error, setError] = useState(null)
  const [discovery, setDiscovery] = useState(null)
  const [progress, setProgress] = useState(null)
  const [photoUrls, setPhotoUrls] = useState([])

  // Escape closes the modal (except mid-import, to avoid losing an in-progress import).
  useEffect(() => {
    if (variant !== 'modal') return
    const onKey = (e) => { if (e.key === 'Escape' && step !== 'importing' && onClose) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [variant, step, onClose])
  const [summary, setSummary] = useState(null)

  async function handleDiscover() {
    const trimmed = input.trim()
    if (!trimmed) return
    setError(null)
    setStep('discovering')
    try {
      const result = await discoverSource(trimmed, undefined)
      setDiscovery(result)
      setStep('review')
    } catch (err) {
      setError(err?.message || 'We could not read that link.')
      setStep('source')
    }
  }

  async function handleImport(selectedCollections) {
    // The source photos are already in hand from discovery — feed them to the
    // showcase so it can start dropping prints immediately, shuffled for variety.
    const srcUrls = []
    for (const c of selectedCollections || []) {
      for (const r of c.assetRefs || []) if (r.remoteUrl) srcUrls.push(r.remoteUrl)
    }
    setPhotoUrls(shuffle(srcUrls))
    setStep('importing')
    setProgress({ done: 0, total: selectedCollections.reduce((n, c) => n + (c.assetRefs?.length || 0), 0), importedCount: 0, failedCount: 0 })
    try {
      // Store the domain (e.g. "swamifoto.com") as the source label, not the site
      // title — it's what the library + showcase surface as "where it came from".
      const label = hostOf(input)
      const batchId = makeImportBatchId(discovery.provider, input, Date.now())
      const result = await importSelected({
        provider: discovery.provider,
        label,
        importBatchId: batchId,
        selectedCollections,
        onProgress: setProgress,
      })
      const collectionIds = new Set(result.imported.map((a) => a.source?.externalCollectionId).filter(Boolean))
      const setsCount = collectionIds.size || selectedCollections.length
      const s = {
        importedCount: result.imported.length,
        failedCount: result.failed.length,
        setsCount,
        site: discovery.site,
        imported: result.imported,
        collections: discovery.collections,
      }
      setSummary(s)
      setStep('done')
    } catch (err) {
      setError(err?.message || 'Something went wrong during import.')
      setStep('review')
    }
  }

  const body = (
    <>
      {step === 'source' && (
        <div style={{ padding: '28px 28px 24px' }}>
          <h2 className="font-fraunces" style={{ fontSize: 22, color: 'var(--text-primary)', marginBottom: 6 }}>
            Bring in your existing photos
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
            Paste a link to your photos: your website, SmugMug, Squarespace, and more.
          </p>
          <input
            autoFocus
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleDiscover() }}
            placeholder="yourwebsite.com"
            className="w-full text-[15px] outline-none bg-transparent border-b py-2 text-[#2c2416] placeholder:text-[#a8967a] focus:border-[#8b6f47]"
            style={{ borderColor: 'rgba(160,140,110,0.3)' }}
          />
          {error && <p style={{ marginTop: 10, fontSize: 12.5, color: '#a15c4a' }}>{error}</p>}
          <div className="flex items-center" style={{ marginTop: 22 }}>
            <button
              onClick={handleDiscover}
              disabled={!input.trim()}
              style={{ ...primaryBtn(!input.trim()), whiteSpace: 'nowrap' }}
            >
              Find my photos
            </button>
          </div>
        </div>
      )}

      {step === 'discovering' && (
        <div className="flex flex-col items-center justify-center" style={{ padding: '56px 28px' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#8b6f47', animation: 'importPulse 1.1s ease-in-out infinite' }} />
          <p style={{ marginTop: 18, ...monoLabel }}>{`Looking through ${hostOf(input)}…`}</p>
          <style>{`@keyframes importPulse { 0%,100%{opacity:.3;transform:scale(.85)} 50%{opacity:1;transform:scale(1)} }`}</style>
        </div>
      )}

      {step === 'review' && (
        <ReviewStep
          discovery={discovery}
          onBack={() => setStep('source')}
          onImport={handleImport}
        />
      )}

    </>
  )

  // The import wait + the success screen take over the whole viewport on a shared
  // warm backdrop, so the flow feels like one continuous moment rather than a bar
  // in a small box.
  if (step === 'importing') {
    return (
      <ImportShowcase
        progress={progress}
        photos={photoUrls}
        sourceLabel={hostOf(input)}
        onCancel={onClose}
      />
    )
  }

  if (step === 'done' && summary) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: SHOWCASE_BG }}>
        <div className="rounded-xl overflow-hidden" style={{ width: 460, maxWidth: '90vw', background: 'var(--popover, #faf7f2)', boxShadow: 'var(--popover-shadow, 0 24px 64px rgba(60,40,15,0.28))' }}>
          <ImportDoneStep
            summary={summary}
            onEnter={() => onComplete(summary)}
            onImportAnother={() => {
              setSummary(null)
              setDiscovery(null)
              setError(null)
              setInput('')
              setPhotoUrls([])
              setStep('source')
            }}
          />
        </div>
      </div>
    )
  }

  if (variant === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--desk)' }}>
        <div className="rounded-xl overflow-hidden" style={{ width: 520, maxHeight: '86vh', background: 'var(--popover)', boxShadow: 'var(--popover-shadow)' }}>
          {body}
        </div>
      </div>
    )
  }

  const busy = step === 'importing' || step === 'discovering'
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(20,12,4,0.55)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' }}
      onClick={step !== 'importing' ? onClose : undefined}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="flex flex-col rounded-xl overflow-hidden"
        style={{ width: 520, maxHeight: '86vh', background: 'var(--popover)', boxShadow: 'var(--popover-shadow)' }}
      >
        <div className="flex items-center px-4 flex-shrink-0" style={{ height: 44, borderBottom: '1px solid rgba(160,140,110,0.22)' }}>
          <span style={{ ...monoLabel, flex: 1 }}>Import from your other sites</span>
          {busy ? (
            <button
              onClick={onClose}
              className="rounded transition-colors"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 6px' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(44,36,22,0.08)'; e.currentTarget.style.color = '#2c2416' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded transition-colors"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(44,36,22,0.08)'; e.currentTarget.style.color = '#2c2416' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          )}
        </div>
        <div style={{ overflowY: 'auto' }}>{body}</div>
      </div>
    </div>
  )
}
