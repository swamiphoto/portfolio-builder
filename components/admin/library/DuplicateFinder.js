import { useState, useEffect, useCallback, useRef } from 'react'
import { backfillHashes, applyHashes, groupDuplicates, runConsolidation } from '@/common/library/dedupClient'
import { chooseCanonical } from '@/common/library/dedup'
import ImportProgress from '@/components/admin/import/ImportProgress'
import { MONO, primaryBtn, CloseIcon } from '@/components/admin/import/importFlowStyles'

// ── phases ────────────────────────────────────────────────────────────────────
const PHASE_SCANNING = 'scanning'
const PHASE_REVIEW   = 'review'
const PHASE_MERGING  = 'merging'
const PHASE_DONE     = 'done'
const PHASE_CLEAN    = 'clean'

// ── tiny helpers ──────────────────────────────────────────────────────────────
function buildUsageLine(asset) {
  if (!asset) return null
  const gals  = asset.usage?.galleryIds || []
  const pages = asset.usage?.pageIds    || []
  if (!gals.length && !pages.length) return null
  const parts = []
  if (gals.length)  parts.push(`${gals.length} ${gals.length === 1 ? 'set' : 'sets'}`)
  if (pages.length) parts.push(`${pages.length} ${pages.length === 1 ? 'page' : 'pages'}`)
  return `Used in ${parts.join(' and ')}`
}

// ── GroupRow ──────────────────────────────────────────────────────────────────
function GroupRow({ group, assets, canonicalId, onSetCanonical, skipped, onToggleSkip }) {
  const canonical = assets[canonicalId]
  const usageLine = buildUsageLine(canonical)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 0',
        borderBottom: '1px solid rgba(160,140,110,0.14)',
        opacity: skipped ? 0.45 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {/* Thumbnail */}
      {canonical?.publicUrl && (
        <img
          src={canonical.publicUrl}
          alt=""
          style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 3, flexShrink: 0, background: 'rgba(160,140,110,0.15)' }}
        />
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.07em', color: '#8b6f47' }}>
          {group.assetIds.length} copies
        </span>
        {usageLine && (
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{usageLine}</div>
        )}
        {/* Copies — pick the one to keep (the selected row is marked, so identical
            filenames aren't ambiguous). Keeping any one is equivalent; usage merges either way. */}
        <div style={{ marginTop: 6 }}>
          {group.assetIds.map(id => {
            const isCanonical = canonicalId === id
            const fileName = (() => {
              const raw = assets[id]?.publicUrl?.split('/').pop() || ''
              try { return decodeURIComponent(raw) } catch { return raw }
            })()
            return (
              <button
                key={id}
                onClick={() => onSetCanonical(id)}
                title={isCanonical ? 'This copy will be kept' : 'Keep this copy instead'}
                className="rounded transition-colors"
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, width: '100%',
                  textAlign: 'left', background: 'transparent', border: 'none',
                  cursor: 'pointer', padding: '3px 6px', marginLeft: -6,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(44,36,22,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span
                  style={{
                    width: 11, height: 11, borderRadius: '50%', flexShrink: 0,
                    border: '1.5px solid',
                    borderColor: isCanonical ? '#8b6f47' : 'rgba(160,140,110,0.5)',
                    background: isCanonical ? '#8b6f47' : 'transparent',
                    boxShadow: isCanonical ? 'inset 0 0 0 2px var(--popover, #faf6ef)' : 'none',
                  }}
                />
                <span
                  style={{
                    fontFamily: MONO, fontSize: 11, minWidth: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: isCanonical ? '#5c4f3a' : '#a8967a',
                    fontWeight: isCanonical ? 500 : 400,
                  }}
                >
                  {fileName || 'this copy'}
                </span>
                {isCanonical && (
                  <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#8b6f47', flexShrink: 0 }}>
                    keep
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Skip toggle */}
      <button
        onClick={onToggleSkip}
        className="rounded transition-colors"
        style={{
          fontFamily: MONO,
          fontSize: 10.5,
          letterSpacing: '0.07em',
          color: skipped ? '#8b6f47' : '#c4b49a',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '3px 6px',
          flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(44,36,22,0.08)'; if (!skipped) e.currentTarget.style.color = '#8b6f47' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; if (!skipped) e.currentTarget.style.color = '#c4b49a' }}
      >
        {skipped ? 'un-skip' : 'skip'}
      </button>
    </div>
  )
}

// ── DuplicateFinder ───────────────────────────────────────────────────────────
export default function DuplicateFinder({ libraryData, siteConfig, onClose, onComplete, minScanMs = 1100 }) {
  const [phase, setPhase]       = useState(PHASE_SCANNING)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [groups, setGroups]     = useState([])
  const [canonicals, setCanonicals] = useState({})   // hash → canonicalId
  const [skipped, setSkipped]   = useState({})        // hash → bool
  const [summary, setSummary]   = useState(null)
  const [error, setError]       = useState(null)

  const assets = libraryData?.assets || {}
  const abortRef = useRef(null)

  // Cancel the scan and close the modal.
  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
    if (onClose) onClose()
  }, [onClose])

  // ── scan on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    let tick = null
    const controller = new AbortController()
    abortRef.current = controller
    const startedAt = Date.now()
    const total = Math.max(1, Object.keys(assets).length)
    const rampDenom = Math.max(1, minScanMs)

    // The real fingerprinting (one storage listing) is near-instant, so the bar
    // would flash. Animate it toward ~92% over minScanMs so the user sees it
    // working, then snap to 100% once the work is done and the minimum elapsed.
    setProgress({ done: 0, total })
    if (minScanMs > 0) {
      tick = setInterval(() => {
        if (cancelled) return
        const frac = Math.min(0.92, (Date.now() - startedAt) / rampDenom)
        setProgress({ done: Math.round(frac * total), total })
      }, 60)
    }
    const clearTick = () => { if (tick) { clearInterval(tick); tick = null } }

    async function scan() {
      try {
        const { hashes } = await backfillHashes(assets, { signal: controller.signal })
        if (cancelled) return

        const merged = applyHashes({ assets }, hashes)
        const found  = groupDuplicates(merged.assets || merged)

        // Hold for the remainder of the minimum, then finish the bar.
        const remaining = minScanMs - (Date.now() - startedAt)
        if (remaining > 0) await new Promise(r => setTimeout(r, remaining))
        if (cancelled) return
        clearTick()
        setProgress({ done: total, total })
        if (minScanMs > 0) await new Promise(r => setTimeout(r, 220)) // let 100% register
        if (cancelled) return

        if (!found || found.length === 0) {
          setPhase(PHASE_CLEAN)
          return
        }

        const defaultCanonicals = {}
        for (const g of found) {
          defaultCanonicals[g.hash] = chooseCanonical(assets, g.assetIds)
        }
        setGroups(found)
        setCanonicals(defaultCanonicals)
        setSkipped({})
        setPhase(PHASE_REVIEW)
      } catch (err) {
        clearTick()
        if (!cancelled) setError(err.message || 'Scan failed')
      }
    }

    scan()
    return () => { cancelled = true; controller.abort(); clearTick() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── merge ──────────────────────────────────────────────────────────────────
  const handleMerge = useCallback(async () => {
    setPhase(PHASE_MERGING)
    try {
      const activeGroups = groups.filter(g => !skipped[g.hash])
      const decisions = activeGroups.map(g => {
        const canonicalId = canonicals[g.hash]
        return {
          canonicalId,
          redundantIds: g.assetIds.filter(id => id !== canonicalId),
        }
      })

      const result = await runConsolidation({
        libraryConfig: {
          assets:      libraryData.assets      || {},
          galleries:   libraryData.galleries   || {},
          portfolios:  libraryData.portfolios  || {},
          sets:        libraryData.sets        || {},
          assetOrder:  libraryData.assetOrder  || [],
        },
        siteConfig,
        decisions,
      })

      setSummary(result)
      setPhase(PHASE_DONE)
    } catch (err) {
      setError(err.message || 'Merge failed')
      setPhase(PHASE_REVIEW)
    }
  }, [groups, skipped, canonicals, libraryData, siteConfig])

  // ── "Merge all" button label ───────────────────────────────────────────────
  const activeGroupCount = groups.filter(g => !skipped[g.hash]).length

  // ── backdrop + modal shell ─────────────────────────────────────────────────
  const scanning = phase === PHASE_SCANNING || phase === PHASE_MERGING
  const canClose = !scanning

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(20,12,4,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={canClose ? onClose : undefined}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--popover, #faf6ef)',
          boxShadow: 'var(--popover-shadow, 0 8px 48px rgba(26,18,10,0.22))',
          borderRadius: 12,
          width: 480,
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 80px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex', alignItems: 'center',
            padding: '18px 20px 14px',
            borderBottom: '1px solid rgba(160,140,110,0.16)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--text-secondary)', flex: 1 }}>
            Find duplicates
          </span>
          {canClose ? (
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded transition-colors"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(44,36,22,0.08)'; e.currentTarget.style.color = '#2c2416' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <CloseIcon />
            </button>
          ) : phase === PHASE_SCANNING ? (
            <button
              onClick={handleCancel}
              className="rounded transition-colors"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 6px' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(44,36,22,0.08)'; e.currentTarget.style.color = '#2c2416' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              Cancel
            </button>
          ) : null}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>

          {/* Scanning phase */}
          {phase === PHASE_SCANNING && (
            <div style={{ padding: '24px 0' }}>
              <ImportProgress progress={progress} />
              <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-secondary)', textAlign: 'center', marginTop: 8 }}>
                Checking {Object.keys(assets).length} photos for duplicates…
              </p>
            </div>
          )}

          {/* Clean phase */}
          {phase === PHASE_CLEAN && (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Schibsted Grotesk, system-ui, sans-serif', fontSize: 18, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                No duplicates found. Your library is clean.
              </p>
            </div>
          )}

          {/* Review phase */}
          {phase === PHASE_REVIEW && (
            <div style={{ padding: '12px 0' }}>
              {/* What this does */}
              <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)', margin: '4px 0 14px' }}>
                We found {groups.length} {groups.length === 1 ? 'group' : 'groups'} of duplicate photos.
                Each group is the same image saved more than once. Merging keeps one copy and repoints any
                page or set that used another, so your site keeps working and looks the same. Nothing
                changes until you click Merge.
              </p>

              {/* Groups */}
              {groups.map(g => (
                <GroupRow
                  key={g.hash}
                  group={g}
                  assets={assets}
                  canonicalId={canonicals[g.hash]}
                  onSetCanonical={id => setCanonicals(prev => ({ ...prev, [g.hash]: id }))}
                  skipped={!!skipped[g.hash]}
                  onToggleSkip={() => setSkipped(prev => ({ ...prev, [g.hash]: !prev[g.hash] }))}
                />
              ))}
            </div>
          )}

          {/* Merging phase */}
          {phase === PHASE_MERGING && (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.09em', color: 'var(--text-secondary)' }}>
                Merging…
              </div>
            </div>
          )}

          {/* Done phase */}
          {phase === PHASE_DONE && (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Schibsted Grotesk, system-ui, sans-serif', fontSize: 18, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: summary?.failedDeletes > 0 ? 8 : 20 }}>
                {summary
                  ? `Merged ${summary.mergedCount} ${summary.mergedCount === 1 ? 'duplicate' : 'duplicates'} into ${summary.groupCount} ${summary.groupCount === 1 ? 'photo' : 'photos'}.`
                  : 'Done.'}
              </p>
              {summary?.failedDeletes > 0 && (
                <p style={{ fontFamily: MONO, fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 20 }}>
                  {summary.failedDeletes} {summary.failedDeletes === 1 ? 'file' : 'file(s)'} couldn&apos;t be removed. Run the scan again to retry.
                </p>
              )}
              <button
                onClick={() => onComplete && onComplete(summary)}
                style={primaryBtn(false)}
                onMouseEnter={e => e.currentTarget.style.background = '#3d3020'}
                onMouseLeave={e => e.currentTarget.style.background = '#2c2416'}
              >
                Done
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding: '12px 0', color: '#b94040', fontSize: 12.5 }}>
              {error}
            </div>
          )}
        </div>

        {/* Fixed footer — Merge always visible during review */}
        {phase === PHASE_REVIEW && (
          <div
            style={{
              flexShrink: 0,
              padding: '14px 20px',
              borderTop: '1px solid rgba(160,140,110,0.18)',
              background: 'var(--popover, #faf6ef)',
            }}
          >
            <button
              onClick={handleMerge}
              style={{ ...primaryBtn(activeGroupCount === 0), width: '100%' }}
              disabled={activeGroupCount === 0}
              onMouseEnter={e => { if (activeGroupCount !== 0) e.currentTarget.style.background = '#3d3020' }}
              onMouseLeave={e => { if (activeGroupCount !== 0) e.currentTarget.style.background = '#2c2416' }}
            >
              Merge all ({activeGroupCount} {activeGroupCount === 1 ? 'group' : 'groups'})
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
