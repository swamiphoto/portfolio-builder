// Fixed ribbon shown on a public page when it's rendered from the owner's
// unpublished draft (?preview=1, or the persisted preview cookie). Makes it
// unmistakable this isn't the live site, and offers a way back to published.
export default function DraftPreviewRibbon() {
  // ?preview=0 clears the preview cookie server-side and serves the published
  // page, so "Exit preview" drops back to the live site from wherever you are.
  const exit = () => {
    if (typeof window !== 'undefined') window.location.href = window.location.pathname + '?preview=0'
  }
  return (
    <div
      style={{
        position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 99999, background: '#2c2416', color: '#f3ece0',
        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', fontSize: 11, letterSpacing: '0.06em',
        padding: '7px 15px', borderRadius: 20, boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
        whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 10,
      }}
    >
      <span>Draft preview — not published</span>
      <button
        type="button"
        onClick={exit}
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          font: 'inherit', color: '#c9b99a', textDecoration: 'underline', textUnderlineOffset: 2,
        }}
      >
        Exit preview
      </button>
    </div>
  )
}
