// components/admin/onboarding/EmptyHint.js
// `active` deepens the box's own tint (used as a drop-target highlight when a
// page is dragged over an empty section) — no extra box, just a state change.
export default function EmptyHint({ children, active = false }) {
  return (
    <div
      style={{
        margin: '2px 8px 4px',
        padding: '10px 12px',
        borderRadius: 6,
        background: active ? 'rgba(139,111,71,0.14)' : 'rgba(139,111,71,0.05)',
        boxShadow: active ? 'inset 0 0 0 1px rgba(139,111,71,0.28)' : 'inset 0 0 0 1px rgba(139,111,71,0.10)',
        fontSize: 12,
        lineHeight: 1.5,
        color: 'var(--text-muted)',
        transition: 'background 120ms, box-shadow 120ms',
      }}
    >
      {children}
    </div>
  )
}
