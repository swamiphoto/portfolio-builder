// components/image-displays/themes/shared/useBalancedColumns.js
// Long text in the horizontal wall themes (Amsterdam, Florence) must never run
// past the top/bottom margins of its fixed-height column. This hook measures the
// copy's natural single-column height and, when it would overflow the available
// height, splits it into N *balanced* columns so the overflow reads as an even,
// pleasant panel — never a lone stub line stranded in column two.
//
// Balance (not fill-first) is the whole point: we compute N = ceil(natural / avail)
// and let column-fill:balance divide the copy into N roughly-equal columns, each a
// little shorter than the available height. No definite height is set on the flow —
// a definite height makes browsers fill column-by-column instead of balancing.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIso = typeof window !== 'undefined' ? useLayoutEffect : useEffect

// deps      — re-measure when these change (content, font, size).
// colWidth  — CSS length for a single column (a fixed probe width keeps the count
//             stable across re-measures; a wider element reports a shorter height).
// gap       — CSS length between columns.
// availVh   — the column's usable height as a fraction of the viewport (margins removed).
// maxCols   — hard cap so a runaway passage can't spawn dozens of columns.
export function useBalancedColumns(deps, { colWidth, gap, availVh = 82, maxCols = 5 } = {}) {
  const ref = useRef(null)
  const [cols, setCols] = useState(1)

  useIso(() => {
    const el = ref.current
    if (!el || typeof window === 'undefined') return
    let raf = 0

    const measure = () => {
      // Available height is the COLUMN's real content box — not the window. On the
      // published site the column is the full viewport (100vh), but in the shorter
      // admin preview pane it isn't; measuring the window there overestimates the
      // room, so the copy under-splits and overruns the pane. Use the column's
      // client height minus its (viewport-based) padding so the fit is exact.
      const col = el.closest('[data-block-index]')
      let avail
      if (col && col.clientHeight) {
        const cs = window.getComputedStyle(col)
        avail = (col.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) * 0.98
      } else {
        avail = window.innerHeight * (availVh / 100)
      }
      // Read the natural single-column height from an OFFSCREEN CLONE, not by mutating
      // the live element. Mutating the live element to probe was unstable: once the
      // copy was balanced into N columns, the probe read the wrong height (the widened
      // multi-column parent skewed it), so a later re-measure knocked a correctly
      // balanced block back to one overflowing column. A detached clone in the same
      // parent (for inherited layout) with the real font metrics reads the same height
      // every time, regardless of the live element's current state.
      const cs0 = window.getComputedStyle(el)
      const probe = el.cloneNode(true)
      probe.className = el.className
      probe.style.cssText = ''
      probe.style.position = 'fixed'
      probe.style.left = '0'
      probe.style.top = '0'
      probe.style.visibility = 'hidden'
      probe.style.pointerEvents = 'none'
      probe.style.zIndex = '-1'
      probe.style.columnCount = '1'
      probe.style.columnGap = 'normal'
      probe.style.columnFill = 'auto'
      probe.style.width = colWidth
      probe.style.maxWidth = 'none'
      probe.style.height = 'auto'
      probe.style.fontFamily = cs0.fontFamily
      probe.style.fontSize = cs0.fontSize
      probe.style.fontWeight = cs0.fontWeight
      probe.style.lineHeight = cs0.lineHeight
      probe.style.letterSpacing = cs0.letterSpacing
      const parent = el.parentElement || document.body
      parent.appendChild(probe)
      const natural = probe.scrollHeight
      parent.removeChild(probe)
      // A little slack so a single line's rounding doesn't trip a second column.
      const n = natural > avail + 8 ? Math.min(maxCols, Math.ceil(natural / avail)) : 1
      setCols((prev) => (prev === n ? prev : n))
    }

    measure()
    const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure) }
    window.addEventListener('resize', onResize)
    // The initial measure runs before the web font has reflowed the text and before
    // the horizontal wall's JS-driven column height has settled, so it can under-count
    // columns. `fonts.ready` can resolve a hair before the reflow lands and observers
    // get starved by the wall's animations, so re-measure at a few fixed delays after
    // mount — one always lands after everything settles. The clone-based measure is
    // stable, so these can't oscillate a balanced block.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure).catch(() => {})
    const timers = [50, 250, 700, 1500].map((ms) => setTimeout(measure, ms))
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(raf); timers.forEach(clearTimeout) }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  // Applied only when cols > 1: N balanced, equal-width columns. Height stays auto
  // so the browser balances instead of filling column-by-column; width is pinned to
  // exactly N columns + gaps so the flow can't spread wider than intended.
  const columnStyle = cols > 1
    ? {
        columnCount: cols,
        columnGap: gap,
        columnFill: 'balance',
        width: `calc(${cols} * (${colWidth}) + ${cols - 1} * (${gap}))`,
      }
    : null

  return { ref, cols, columnStyle }
}
