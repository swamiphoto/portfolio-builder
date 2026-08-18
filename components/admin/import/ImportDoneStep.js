import { MONO, primaryBtn } from './importFlowStyles'

// The subdued text-button style already used for "Import from another site",
// reused here for the "keep photos only" choice so the two secondary actions
// read as one family.
const textBtnStyle = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: 'var(--text-secondary)', fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: 0,
}
const textBtnHoverOn = (e) => { e.currentTarget.style.color = '#2c2416' }
const textBtnHoverOff = (e) => { e.currentTarget.style.color = 'var(--text-secondary)' }

function pluralize(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`
}

function joinWithAnd(parts) {
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`
}

// Describes only what composeSite would actually create: gallery pages are
// counted when their collection had at least one imported asset, OR when any
// of the collection's assetRefs were dedupe-skipped (already in the library —
// resolveComposableAssets will still resolve those into composable assets).
// About and contact pages always count (they don't depend on a collection).
function describeFoundPages(summary) {
  const pages = summary?.siteMap?.pages || []
  const importedCollectionIds = new Set(
    (summary?.imported || []).map((a) => a.source?.externalCollectionId).filter(Boolean)
  )
  const skippedUrls = new Set(summary?.skipped || [])
  const collectionsById = new Map((summary?.collections || []).map((c) => [c.id, c]))
  const collectionHasSkippedRefs = (collectionId) => {
    const collection = collectionsById.get(collectionId)
    return (collection?.assetRefs || []).some((r) => skippedUrls.has(r.remoteUrl))
  }
  let galleryCount = 0
  let aboutCount = 0
  let contactCount = 0
  for (const p of pages) {
    if (p.kind === 'gallery') {
      if (importedCollectionIds.has(p.collectionId) || collectionHasSkippedRefs(p.collectionId)) galleryCount += 1
    } else if (p.kind === 'about') {
      aboutCount += 1
    } else if (p.kind === 'contact') {
      contactCount += 1
    }
  }
  const parts = []
  if (galleryCount) parts.push(pluralize(galleryCount, 'gallery', 'galleries'))
  if (aboutCount) parts.push(aboutCount === 1 ? 'an about page' : `${aboutCount} about pages`)
  if (contactCount) parts.push(contactCount === 1 ? 'a contact page' : `${contactCount} contact pages`)
  return joinWithAnd(parts)
}

export default function ImportDoneStep({ summary, onEnter, onImportAnother }) {
  const hasSiteMapPages = (summary?.siteMap?.pages?.length || 0) > 0
  const found = hasSiteMapPages ? describeFoundPages(summary) : ''
  // Only offer the rebuild choice when there's something to describe — a
  // siteMap whose pages are all `kind: 'other'` (or otherwise produce no
  // describable gallery/about/contact pages) would rebuild nothing, so the
  // "Build these pages for me on Sepia" button would be a no-op.
  const canReplicate = found !== ''

  // Body copy is real body text: secondary color at 14px, not the muted hint
  // token this screen originally borrowed (illegible on the cream surface).
  const bodyText = { fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55 }
  const outlineBtn = {
    background: 'transparent', color: '#2c2416', border: '1px solid rgba(44,36,22,0.4)',
    borderRadius: 4, padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
  }

  return (
    <div style={{ padding: '32px 28px 28px' }}>
      <h2 className="font-fraunces" style={{ fontSize: 21, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.3 }}>
        You're all set.
      </h2>
      <p style={{ ...bodyText, marginBottom: summary?.failedCount > 0 ? 6 : 22 }}>
        {canReplicate
          ? "You'll find all your photos in your library, ready to use on any page. If you'd like, we can give you a head start by building your first pages with these images."
          : "You'll find all your photos in your library, ready to use on any page you build."}
      </p>
      {summary?.failedCount > 0 && (
        <p style={{ ...bodyText, marginBottom: 22 }}>
          A few photos couldn't be copied over. You can upload those to your library anytime.
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        {canReplicate ? (
          <>
            <button onClick={() => onEnter({ replicate: true })} style={{ ...primaryBtn(false) }}>
              Build my pages for me
            </button>
            <button onClick={() => onEnter({ replicate: false })} style={outlineBtn}>
              I'll build my own
            </button>
          </>
        ) : (
          <button onClick={() => onEnter({ replicate: false })} style={{ ...primaryBtn(false) }}>
            Go to my studio
          </button>
        )}
        <button onClick={onImportAnother} style={textBtnStyle} onMouseEnter={textBtnHoverOn} onMouseLeave={textBtnHoverOff}>
          Import from another site
        </button>
      </div>
    </div>
  )
}
