import * as T from '@radix-ui/react-tooltip'

// Shared instant tooltip for the admin UI.
// Usage: <Tip label="Add photos"><button>...</button></Tip>
// Use side="bottom" | "top" | "left" | "right" (default: "top")

export default function Tip({ label, children, side = 'top' }) {
  if (!label) return children
  return (
    <T.Provider delayDuration={0} skipDelayDuration={0}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content side={side} sideOffset={6} className="admin-tip">
            {label}
            <T.Arrow className="admin-tip-arrow" />
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  )
}
