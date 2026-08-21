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
      // Freeze to a single fixed-width column to read the natural stacked height,
      // then restore the inline styles exactly (this runs before paint, so no flash).
      const s = el.style
      const saved = { columnCount: s.columnCount, columnGap: s.columnGap, columnFill: s.columnFill, width: s.width }
      s.columnCount = '1'
      s.columnGap = 'normal'
      s.columnFill = 'auto'
      s.width = colWidth
      const natural = el.scrollHeight
      s.columnCount = saved.columnCount
      s.columnGap = saved.columnGap
      s.columnFill = saved.columnFill
      s.width = saved.width
      // A little slack so a single line's rounding doesn't trip a second column.
      const n = natural > avail + 8 ? Math.min(maxCols, Math.ceil(natural / avail)) : 1
      setCols((prev) => (prev === n ? prev : n))
    }

    measure()
    const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure) }
    window.addEventListener('resize', onResize)
    // Web fonts change the measured height once they load.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure).catch(() => {})
    // Re-measure when the COLUMN settles to its final height. The horizontal wall
    // themes (Amsterdam especially) set column heights via layout + JS that isn't
    // final at first paint, so the initial measure can under-count columns and leave
    // long copy overflowing in one column until a resize. Observing the column
    // re-measures the moment its size resolves. (The column is fixed-size, so probing
    // the text's own width inside measure() can't feed back into a loop here.)
    let ro = null
    const col = el.closest('[data-block-index]')
    if (col && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(onResize)
      ro.observe(col)
    }
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(raf); if (ro) ro.disconnect() }
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
