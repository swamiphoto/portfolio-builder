// components/admin/onboarding/EmptyHint.js
export default function EmptyHint({ children }) {
  return (
    <div
      style={{
        margin: '2px 8px 4px',
        padding: '10px 12px',
        borderRadius: 6,
        background: 'rgba(139,111,71,0.05)',
        boxShadow: 'inset 0 0 0 1px rgba(139,111,71,0.10)',
        fontSize: 12,
        lineHeight: 1.5,
        color: 'var(--text-muted)',
      }}
    >
      {children}
    </div>
  )
}
