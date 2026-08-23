import { useEffect, useRef, useState } from 'react'

// Theme morph v2: the same gallery ("Portraits") shown in four of Sepia's real
// themes. Each theme AUTO-SCROLLS through its images the way you'd actually
// browse it — horizontal museum/poster walls pan sideways, the editorial and
// grid themes scroll down — then it cross-fades slowly to the next theme. The
// gallery name and photos stay constant while the whole look restyles: a live
// demo of "toggle through themes, your content stays put." Panels are
// simplified *signatures* of the real themes, not the actual theme engines.

const GALLERY = 'Portraits'
const DWELL_MS = 7000      // how long each theme is shown
const CROSSFADE_MS = 1800  // slow, gentle fade between themes
const SCROLL_MS = 6300     // scroll finishes just before the fade starts

const HAIR = '1px solid rgba(28,26,23,0.16)'

function Cover({ src, radius = 0, scale = 1 }) {
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: radius, transform: scale !== 1 ? `scale(${scale})` : undefined }}
    />
  )
}

// ---- Florence: horizontal museum wall, hairline columns, Fraunces + IBM Plex
// Mono wall-labels, warm paper, sharp corners. Pans sideways. ----
function Florence({ images, trackRef }) {
  const cols = [
    { photo: images[4], label: 'PLATE 01' }, // portrait
    { photo: images[0], label: 'PLATE 02' },
    { pair: [images[5], images[6]] },
    { photo: images[1], label: 'PLATE 03' },
    { pair: [images[7], images[8]] },
    { photo: images[2], label: 'PLATE 04' },
  ]
  return (
    <div style={{ width: '100%', height: '100%', background: '#f4f1ea', color: '#1c1a17', display: 'flex' }}>
      <div style={{ width: 46, flex: '0 0 46px', borderRight: HAIR, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0' }}>
        <span style={{ width: 16, height: 1.5, background: '#1c1a17' }} />
        <span style={{ writingMode: 'vertical-rl', fontFamily: '"Fraunces", Georgia, serif', fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8b8378' }}>Sepia Studio</span>
        <span style={{ width: 6, height: 6, borderRadius: '50%', border: '1px solid #1c1a17' }} />
      </div>
      <div ref={trackRef} style={{ display: 'flex', height: '100%', width: 'max-content', willChange: 'transform' }}>
        <div style={{ width: 230, flex: '0 0 230px', borderRight: HAIR, padding: '30px 26px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 400, fontSize: 40, lineHeight: 0.98, letterSpacing: '-0.015em' }}>{GALLERY}</div>
          <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, letterSpacing: '0.03em', color: '#8b8378', marginTop: 16, lineHeight: 1.75 }}>
            A winter series photographed across the old city of Jaipur, 2015. Eighteen frames, printed on cotton rag.
          </div>
        </div>
        {cols.map((c, i) => (
          <div key={i} style={{ width: c.pair ? 170 : 250, flex: `0 0 ${c.pair ? 170 : 250}px`, borderRight: HAIR, padding: '26px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {c.pair ? (
              c.pair.map((p, k) => <div key={k} style={{ flex: 1, minHeight: 0 }}><Cover src={p} /></div>)
            ) : (
              <>
                <div style={{ flex: 1, minHeight: 0 }}><Cover src={c.photo} /></div>
                <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, letterSpacing: '0.05em', color: '#8b8378' }}>{c.label}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Kyoto: quiet editorial, pure white, centered single-column that scrolls
// down through photos, Cormorant serif with italic captions, rounded. ----
function Kyoto({ images, trackRef }) {
  const items = [
    { photo: images[0], cap: 'first light over the haveli' },
    { photo: images[4], cap: 'a quiet afternoon in the old city' },
    { photo: images[2], cap: 'the last of the winter sun' },
  ]
  return (
    <div style={{ width: '100%', height: '100%', background: '#ffffff', color: '#2c2416', overflow: 'hidden' }}>
      <div ref={trackRef} style={{ width: '100%', willChange: 'transform', padding: '30px 0 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34 }}>
        <div style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500, fontSize: 16, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7a6b55' }}>{GALLERY}</div>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 260, maxWidth: '58%', aspectRatio: '4 / 5', borderRadius: 5, overflow: 'hidden', boxShadow: '0 16px 40px -22px rgba(44,36,22,0.5)' }}>
              <Cover src={it.photo} />
            </div>
            <div style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: 'italic', fontSize: 17, color: '#2c2416' }}>{it.cap}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Amsterdam: Dutch poster wall that pans sideways — poster hero, solid
// vermilion ink panel with crisp Fraunces display type, photo columns, parallax. ----
function Amsterdam({ images, trackRef }) {
  const INK = '#e02b20'
  return (
    <div style={{ width: '100%', height: '100%', background: '#f6efe4', color: '#141210', overflow: 'hidden' }}>
      <div ref={trackRef} style={{ display: 'flex', height: '100%', width: 'max-content', willChange: 'transform' }}>
        {/* poster hero */}
        <div style={{ width: 420, flex: '0 0 420px', position: 'relative', background: '#141210', overflow: 'hidden' }}>
          <Cover src={images[3]} scale={1.08} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(20,16,12,0.55), rgba(20,16,12,0.05) 55%)' }} />
          <div style={{ position: 'absolute', top: '7%', left: '6%', right: '6%', margin: 0, fontFamily: '"Fraunces", "Playfair Display", Georgia, serif', fontWeight: 500, textTransform: 'uppercase', color: INK, fontSize: 66, lineHeight: 0.9, letterSpacing: '-0.015em', overflowWrap: 'break-word' }}>{GALLERY}</div>
          <div style={{ position: 'absolute', left: '6%', bottom: '7%', fontFamily: 'Inter, sans-serif', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f6efe4', textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>Jaipur · 2015</div>
        </div>
        {/* ink panel */}
        <div style={{ width: 210, flex: '0 0 210px', background: INK, color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '24px 20px' }}>
          <div style={{ fontFamily: '"Fraunces", "Playfair Display", Georgia, serif', fontWeight: 500, textTransform: 'uppercase', fontSize: 58, lineHeight: 0.84, letterSpacing: '0.01em' }}>On<br />View</div>
          <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 12, lineHeight: 1.4, marginTop: 14, opacity: 0.95 }}>Eighteen portraits, hung as a single wall.</div>
        </div>
        {/* photo columns */}
        {[images[0], images[2], images[5]].map((p, i) => (
          <div key={i} style={{ width: 240, flex: '0 0 240px', position: 'relative', overflow: 'hidden' }}>
            <Cover src={p} scale={1.08} />
            <div style={{ position: 'absolute', left: 12, bottom: 12, fontFamily: 'Inter, sans-serif', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#fff', textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>Plate {String(i + 1).padStart(2, '0')}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Copenhagen (manhattan): wide left rail, terracotta accent, Inter sans,
// tight sharp masonry that scrolls down. ----
function Copenhagen({ images, trackRef }) {
  const grid = [images[0], images[5], images[2], images[6], images[1], images[7], images[3], images[8], images[4]]
  return (
    <div style={{ width: '100%', height: '100%', background: '#fafafa', color: '#141414', display: 'flex', overflow: 'hidden' }}>
      <div style={{ flex: '0 0 32%', padding: '26px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 19, letterSpacing: '-0.015em' }}>{GALLERY}</div>
        <div style={{ width: 26, height: 2, background: '#b5502e' }} />
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, lineHeight: 2.1, color: '#6b6b6b' }}>Portraits<br />Landscapes<br />About<br />Contact</div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', padding: '0 16px 0 0' }}>
        <div ref={trackRef} style={{ willChange: 'transform', columnCount: 2, columnGap: 8, paddingTop: 20 }}>
          {grid.map((src, i) => (
            <div key={i} style={{ marginBottom: 8, breakInside: 'avoid' }}>
              <img src={src} alt="" draggable={false} style={{ width: '100%', display: 'block', borderRadius: 0 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---- Blantyre: sage surf-journal — Marcellus wordmark, mono nav + captions,
// keyline-framed photos in a staggered offset scatter that scrolls down. ----
function Blantyre({ images, trackRef }) {
  const FRAME = '2px solid #b1b6a2'
  const MONO = '"Roboto Mono", ui-monospace, monospace'
  const rows = [
    { wide: images[4], narrow: images[0], wcap: 'volcom photoshoot', ncap: 'skaters, venice beach' },
    { wide: images[2], narrow: images[6], wcap: 'west coast', ncap: 'french alps', flip: true },
    { wide: images[1], narrow: images[7], wcap: 'vw trip', ncap: 'zion national park' },
  ]
  const cell = (src, cap, w, mt = 0) => (
    <div style={{ width: w, marginTop: mt }}>
      <div style={{ aspectRatio: '3 / 4', overflow: 'hidden', border: FRAME }}><Cover src={src} /></div>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.02em', color: '#70756a', marginTop: 7 }}>{cap}</div>
    </div>
  )
  return (
    <div style={{ width: '100%', height: '100%', background: '#dadbd1', color: '#23251e', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px 6px' }}>
        <span style={{ fontFamily: '"Marcellus", Georgia, serif', fontSize: 17 }}>{GALLERY}</span>
        <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.02em', color: '#23251e', opacity: 0.7 }}>Work&nbsp;&nbsp;&nbsp;&nbsp;Contact</span>
      </div>
      <div ref={trackRef} style={{ willChange: 'transform', padding: '14px 24px 40px', display: 'flex', flexDirection: 'column', gap: 40 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {r.flip
              ? <>{cell(r.narrow, r.ncap, '30%', 26)}{cell(r.wide, r.wcap, '58%', 0)}</>
              : <>{cell(r.wide, r.wcap, '58%', 0)}{cell(r.narrow, r.ncap, '30%', 26)}</>}
          </div>
        ))}
      </div>
    </div>
  )
}

const PANELS = [
  { id: 'florence', name: 'Florence', accent: '#7d5a44', dir: 'x', render: (im, ref) => <Florence images={im} trackRef={ref} /> },
  { id: 'kyoto', name: 'Kyoto', accent: '#7a6b55', dir: 'y', render: (im, ref) => <Kyoto images={im} trackRef={ref} /> },
  { id: 'amsterdam', name: 'Amsterdam', accent: '#e02b20', dir: 'x', render: (im, ref) => <Amsterdam images={im} trackRef={ref} /> },
  { id: 'copenhagen', name: 'Copenhagen', accent: '#b5502e', dir: 'y', render: (im, ref) => <Copenhagen images={im} trackRef={ref} /> },
  { id: 'blantyre', name: 'Blantyre', accent: '#5c6152', dir: 'y', render: (im, ref) => <Blantyre images={im} trackRef={ref} /> },
]

export default function ThemeShowcase({ images = [] }) {
  const [active, setActive] = useState(0)
  const [label, setLabel] = useState(0) // trails `active` to the fade midpoint
  const activeRef = useRef(0)
  const containerRef = useRef(null)
  const trackRefs = useRef([])
  const reduceRef = useRef(false)
  const labelTimerRef = useRef(null)

  // Drive the slow auto-scroll for whichever theme is active.
  useEffect(() => {
    if (reduceRef.current) return
    const container = containerRef.current
    trackRefs.current.forEach((track, i) => {
      if (!track) return
      const dir = PANELS[i].dir
      if (i === active) {
        track.style.transition = 'none'
        track.style.transform = 'translate3d(0,0,0)'
        void track.offsetWidth // reflow so the reset takes hold
        const overflow = dir === 'x'
          ? track.scrollWidth - container.clientWidth
          : track.scrollHeight - container.clientHeight
        const dist = Math.max(0, overflow - 4)
        requestAnimationFrame(() => {
          track.style.transition = `transform ${SCROLL_MS}ms linear`
          track.style.transform = dir === 'x' ? `translate3d(${-dist}px,0,0)` : `translate3d(0,${-dist}px,0)`
        })
      } else {
        track.style.transition = 'none'
        track.style.transform = 'translate3d(0,0,0)'
      }
    })
  }, [active])

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    reduceRef.current = reduce
    if (reduce) return

    let timer = null
    const advance = () => {
      const next = (activeRef.current + 1) % PANELS.length
      activeRef.current = next
      setActive(next)
      // Swap the name label once the incoming theme is the dominant one.
      if (labelTimerRef.current) clearTimeout(labelTimerRef.current)
      labelTimerRef.current = setTimeout(() => setLabel(next), CROSSFADE_MS * 0.55)
    }
    const start = () => { if (!timer) timer = setInterval(advance, DWELL_MS) }
    const stop = () => { if (timer) { clearInterval(timer); timer = null } }

    let observer = null
    const el = containerRef.current
    if (el && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0.25 })
      observer.observe(el)
    } else {
      start()
    }
    return () => { stop(); if (observer) observer.disconnect(); if (labelTimerRef.current) clearTimeout(labelTimerRef.current) }
  }, [])

  if (images.length === 0) return null

  return (
    <div
      ref={containerRef}
      aria-label="Theme preview"
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 10',
        borderRadius: 12,
        overflow: 'hidden',
        background: '#ffffff',
        boxShadow: '0 0 0 1px rgba(26,18,10,0.08), 0 34px 70px -34px rgba(26,18,10,0.32)',
      }}
    >
      {PANELS.map((t, i) => {
        const on = i === active
        return (
          <div
            key={t.id}
            aria-hidden={!on}
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'hidden',
              opacity: on ? 1 : 0,
              transition: `opacity ${CROSSFADE_MS}ms ease-in-out`,
              zIndex: on ? 2 : 1,
              pointerEvents: 'none',
            }}
          >
            {t.render(images, (el) => { trackRefs.current[i] = el })}
          </div>
        )
      })}

      {/* Persistent label: gallery name holds constant, theme name toggles. */}
      <div
        style={{
          position: 'absolute',
          left: 14,
          bottom: 14,
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          borderRadius: 999,
          background: 'rgba(250,247,238,0.85)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          boxShadow: '0 2px 12px -4px rgba(0,0,0,0.28)',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: PANELS[label].accent, transition: `background ${CROSSFADE_MS}ms ease-in-out` }} />
        <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#3a362f' }}>{PANELS[label].name}</span>
      </div>
    </div>
  )
}
