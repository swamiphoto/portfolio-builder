// Shared design controls — used by Site, Page, and Block design popovers.
// Keeps the visual language consistent across all design surfaces.

const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace'

export function DesignSection({ label, children }) {
  return (
    <div style={{ padding: '10px 14px' }}>
      {label && (
        <div
          style={{
            fontSize: 10,
            fontFamily: MONO,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            fontWeight: 500,
            marginBottom: 2,
          }}
        >
          {label}
        </div>
      )}
      {children}
    </div>
  )
}

// Segmented control — inset track, lifted cream pill for the active option.
// Pill fits snug around the text.
export function PillToggle({ value, onChange, options }) {
  return (
    <div
      className="inline-flex items-center"
      style={{
        background: 'rgba(120,90,60,0.11)',
        boxShadow: 'inset 0 1px 1.5px rgba(60,40,15,0.10)',
        padding: 2,
        borderRadius: 7,
        gap: 1,
      }}
    >
      {options.map(({ value: v, label }) => {
        const active = value === v
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className="transition-all"
            style={{
              padding: '3px 10px',
              fontSize: 11.5,
              fontWeight: active ? 500 : 400,
              borderRadius: 5,
              background: active ? '#f5ecd6' : 'transparent',
              color: active ? '#2c2416' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              boxShadow: active ? '0 1px 2px rgba(60,40,15,0.14), 0 0 0 0.5px rgba(60,40,15,0.08)' : 'none',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// Numbered toggle — small rounded pills for compact options like "1", "2", "3".
export function NumberToggle({ value, onChange, options }) {
  return (
    <div
      className="inline-flex items-center"
      style={{
        background: 'rgba(120,90,60,0.11)',
        boxShadow: 'inset 0 1px 1.5px rgba(60,40,15,0.10)',
        padding: 2,
        borderRadius: 999,
        gap: 1,
      }}
    >
      {options.map(({ value: v, label, title }) => {
        const active = value === v
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            title={title}
            className="transition-all"
            style={{
              minWidth: 24,
              height: 22,
              padding: '0 8px',
              fontSize: 11,
              fontFamily: MONO,
              fontWeight: active ? 500 : 400,
              borderRadius: 999,
              background: active ? '#f5ecd6' : 'transparent',
              color: active ? '#2c2416' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              boxShadow: active ? '0 1px 2px rgba(60,40,15,0.14), 0 0 0 0.5px rgba(60,40,15,0.08)' : 'none',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// Warm select dropdown styled to match the rest.
export function DesignSelect({ value, onChange, children, ...props }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="site-input"
      style={{
        width: '100%',
        background: 'transparent',
        border: 'none',
        borderBottom: '1px solid rgba(160,140,110,0.32)',
        padding: '0 16px 6px 0',
        fontSize: 13,
        lineHeight: 1.35,
        color: '#2c2416',
        outline: 'none',
        appearance: 'none',
        cursor: 'pointer',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23a8967a' stroke-width='2'><path d='M4 6l4 4 4-4'/></svg>")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0 center',
        backgroundSize: '12px',
        transition: 'border-color 0.15s',
      }}
      {...props}
    >
      {children}
    </select>
  )
}
