// Fixed ribbon shown on a public page when it's rendered from the owner's
// unpublished draft (?preview=1). Makes it unmistakable this isn't the live site.
export default function DraftPreviewRibbon() {
  return (
    <div
      style={{
        position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 99999, background: '#2c2416', color: '#f3ece0',
        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', fontSize: 11, letterSpacing: '0.06em',
        padding: '7px 15px', borderRadius: 20, boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
        pointerEvents: 'none', whiteSpace: 'nowrap',
      }}
    >
      Draft preview — not published
    </div>
  )
}
