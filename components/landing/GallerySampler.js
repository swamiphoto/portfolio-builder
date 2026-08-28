import { useEffect, useRef } from 'react'
import SlideshowStack from './SlideshowStack'

// A sampling of Sepia sites, drifting by. Each framed screen is a hand-set
// *signature* of a real theme (not the theme engine), staged as a different
// photographer's portfolio so the strip reads as a range of sites, not one
// person's. The photographs are real work from swamiphoto.com; the studio
// names are set dressing. Each screen pans slowly within its own frame —
// horizontal walls slide sideways, editorial pages scroll down — on its own
// out-of-sync rhythm, while the whole strip loops as a slow marquee that
// pauses on hover. Everything holds still under prefers-reduced-motion.

const HAIR = '1px solid rgba(28,26,23,0.16)'
const SERIF = "'Fraunces', Georgia, serif"
const MONO = "'IBM Plex Mono', ui-monospace, monospace"

// Real photographs, resized through the same free proxy the import covers use.
const GCS = 'https://storage.googleapis.com/swamiphoto/photos'
const R2 = 'https://pub-eff8a6f9ce8f40c081218b3cfb57c78e.r2.dev/users/110173791897887386689/display'
const thumb = (base, path, w = 640) => `https://wsrv.nl/?url=${encodeURIComponent(`${base}/${path}`)}&w=${w}&output=webp&q=74`
const g = (path, w) => thumb(GCS, path, w)
const r = (path, w) => thumb(R2, path, w)

// Sets, loosely by genre — screens read them by index; swap freely.
const PORTRAITS = [
  r('library/AR503202.jpg'), r('library/AR503441-Edit-2-2.jpg'), r('library/AR503400.jpg'),
  g('portraits/anagha/DSC_0080.jpg'), g('portraits/amrita.jpeg'), g('portraits/mala.jpeg'), g('portraits/suma.jpeg'),
]
const STAGE = [
  g('bollywood/katrina.jpeg'), g('bollywood/atif.jpg'), g('bollywood/dance.jpeg'),
  g('bollywood/nargis.jpeg'), g('bollywood/katrina2.jpeg'), r('ilayaraja/DSC_4553.jpg'),
]
const LAND = [
  g('landscapes/fog.jpg', 900), g('landscapes/california/DSC_5618-Edit.jpg'), g('landscapes/hotcreek.jpeg'),
  g('landscapes/falltrees.jpg'), g('landscapes/kerala.jpg'), g('landscapes/pastel.jpg'),
  g('landscapes/comet.jpeg'), g('landscapes/alviso.jpeg'), g('landscapes/walton.jpeg'), g('landscapes/ghost.jpg'),
]
const MATERNITY = [
  r('import/DSC_2852-Edit-Edit-2.jpg'), r('import/DSC_2769-Edit-Edit-5.jpg'), r('import/DSC_2724.jpg'),
  r('import/DSC_2679-Edit.jpg'), r('import/DSC_2711-Edit.jpg'), r('import/DSC_2718.jpg'),
  r('import/DSC_2709.jpg'), r('import/DSC_2713.jpg'), r('import/DSC_2723.jpg'),
]

function Cover({ src }) {
  return <img src={src} alt="" loading="lazy" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
}

// Inner pan track: ping-pong drift inside the frame, so every gallery shows
// its flow. Duration/delay vary per screen so nothing moves in lockstep.
function Pan({ axis, dist, dur, delay = 0, children, style }) {
  return (
    <div
      className={axis === 'x' ? 'sampler__pan-x' : 'sampler__pan-y'}
      style={{ '--pan-dist': dist, '--pan-dur': `${dur}s`, '--pan-delay': `${delay}s`, willChange: 'transform', ...style }}
    >
      {children}
    </div>
  )
}

/* ── The screens ─────────────────────────────────────────────────────────── */

// Florence: the museum wall proper — a vertical rail with the studio name,
// then photographs hung as MOUNTS (wide mat or thin keyline) with wall labels
// printed beneath, at scattered heights along a hairline-free warm wall.
function FlorenceScreen() {
  const mat = { background: '#f4f1ea', padding: 12, boxShadow: '0 10px 26px rgba(28,26,23,0.18)' }
  const keyline = { padding: 6, boxShadow: 'inset 0 0 0 1px rgba(28,26,23,0.4)' }
  const label = { fontFamily: MONO, fontSize: 7, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b8378', textAlign: 'center', marginTop: 8 }
  // The real Florence hangs photos near full wall height — the mounts should
  // OWN the vertical space, with only a slight rise and fall between them.
  const mounts = [
    { src: PORTRAITS[0], frame: mat, cap: 'SUDHA — PLATE I', h: 250, lift: -6 },
    { src: PORTRAITS[3], frame: keyline, cap: 'ANAGHA, WINTER', h: 218, lift: 10 },
    { src: PORTRAITS[1], frame: mat, cap: 'SUDHA — PLATE II', h: 256, lift: -2 },
    { src: PORTRAITS[5], frame: keyline, cap: 'MALA', h: 212, lift: 8 },
    { src: PORTRAITS[2], frame: mat, cap: 'SUDHA — PLATE III', h: 248, lift: -5 },
  ]
  return (
    <div style={{ width: '100%', height: '100%', background: '#efece4', color: '#1c1a17', display: 'flex', overflow: 'hidden' }}>
      {/* The rail sits ABOVE the panning wall (zIndex + opaque ground) — the
          translated track slides behind it, never across it. */}
      <div style={{ flex: '0 0 44px', borderRight: HAIR, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', background: '#f4f1ea', position: 'relative', zIndex: 2 }}>
        <span style={{ width: 14, height: 1.5, background: '#1c1a17' }} />
        <span style={{ writingMode: 'vertical-rl', fontFamily: SERIF, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8b8378' }}>Mira Chandra</span>
        <span style={{ width: 6, height: 6, borderRadius: '50%', border: '1px solid #1c1a17' }} />
      </div>
      <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
        <Pan axis="x" dist="-46%" dur={30} style={{ display: 'flex', alignItems: 'center', height: '100%', width: 'max-content', gap: 28, padding: '0 26px' }}>
          <div style={{ width: 96, flex: '0 0 96px' }}>
            <div style={{ fontFamily: SERIF, fontSize: 26, lineHeight: 1 }}>Portraits</div>
            <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.06em', color: '#8b8378', marginTop: 10, lineHeight: 1.8 }}>
              EIGHTEEN FRAMES,<br />PRINTED ON<br />COTTON RAG
            </div>
          </div>
          {mounts.map((m, i) => (
            <figure key={i} style={{ margin: 0, flex: '0 0 auto', transform: `translateY(${m.lift}px)` }}>
              <div style={m.frame}>
                <div style={{ height: m.h, width: m.h * 0.76 }}><Cover src={m.src} /></div>
              </div>
              <figcaption style={label}>{m.cap}</figcaption>
            </figure>
          ))}
        </Pan>
      </div>
    </div>
  )
}

// Kyoto: the quiet default — generous whitespace, one centered column of
// ROUNDED photos with soft shadows and italic captions beneath.
function KyotoScreen() {
  const photo = { borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 30px -12px rgba(26,18,10,0.35)' }
  const cap = { fontFamily: SERIF, fontStyle: 'italic', fontSize: 10.5, color: '#8a8276', textAlign: 'center', margin: '9px 0 18px' }
  return (
    <div style={{ width: '100%', height: '100%', background: '#fbfaf7', color: '#2c2a25', overflow: 'hidden' }}>
      <Pan axis="y" dist="-42%" dur={26} delay={-9} style={{ padding: '20px 34px' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: SERIF, fontSize: 17 }}>Landscapes</div>
          <div style={{ fontFamily: MONO, fontSize: 6.5, letterSpacing: '0.22em', color: '#a39a8b', marginTop: 4 }}>ELENA MARSH — FIELD WORK</div>
        </div>
        <div style={{ ...photo, height: 172 }}><Cover src={LAND[2]} /></div>
        <div style={cap}>hot creek, before the storm</div>
        <div style={{ ...photo, height: 172 }}><Cover src={LAND[3]} /></div>
        <div style={cap}>the aspens turn in a single week</div>
        <div style={{ ...photo, height: 172 }}><Cover src={LAND[6]} /></div>
        <div style={cap}>the comet, over the ridge</div>
      </Pan>
    </div>
  )
}

// Amsterdam: the Dutch poster wall — cream ground, a shouting red ink block of
// condensed uppercase display type, photographs hung with real shadows, mono
// plaque tags with italic titles.
function AmsterdamScreen() {
  const hung = { boxShadow: '0 16px 30px -10px rgba(0,0,0,0.35)' }
  const tag = { fontFamily: MONO, fontSize: 6.5, letterSpacing: '0.22em', color: '#141210', opacity: 0.55 }
  const title = { fontFamily: SERIF, fontStyle: 'italic', fontSize: 10, color: '#141210', marginTop: 3 }
  return (
    <div style={{ width: '100%', height: '100%', background: '#f6efe4', overflow: 'hidden' }}>
      <Pan axis="x" dist="-40%" dur={32} delay={-14} style={{ display: 'flex', alignItems: 'stretch', height: '100%', width: 'max-content' }}>
        <div style={{ flex: '0 0 148px', background: '#e02b20', color: '#f6efe4', padding: '18px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: MONO, fontSize: 6.5, letterSpacing: '0.24em' }}>BOMBAY NIGHTS</span>
          <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 34, lineHeight: 0.92, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
            On<br />Stage
          </div>
          <span style={{ fontFamily: MONO, fontSize: 6.5, letterSpacing: '0.16em', opacity: 0.8 }}>A. SHARMA — TOUR ARCHIVE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '0 26px' }}>
          <figure style={{ margin: 0, flex: '0 0 auto', transform: 'translateY(-8px)' }}>
            <div style={{ ...hung, height: 190, width: 150 }}><Cover src={STAGE[0]} /></div>
            <figcaption style={{ marginTop: 7 }}><div style={tag}>LEFT</div><div style={title}>the encore</div></figcaption>
          </figure>
          <div style={{ flex: '0 0 auto', background: '#141210', padding: 14, transform: 'translateY(14px)', ...hung }}>
            <div style={{ height: 128, width: 168 }}><Cover src={STAGE[2]} /></div>
          </div>
          <figure style={{ margin: 0, flex: '0 0 auto', transform: 'translateY(-14px)' }}>
            <div style={{ ...hung, height: 172, width: 138 }}><Cover src={STAGE[3]} /></div>
            <figcaption style={{ marginTop: 7 }}><div style={tag}>RIGHT</div><div style={title}>nargis, between takes</div></figcaption>
          </figure>
          <figure style={{ margin: 0, flex: '0 0 auto', transform: 'translateY(10px)' }}>
            <div style={{ ...hung, height: 150, width: 200 }}><Cover src={STAGE[1]} /></div>
            <figcaption style={{ marginTop: 7 }}><div style={tag}>FINALE</div><div style={title}>fifty thousand voices</div></figcaption>
          </figure>
        </div>
      </Pan>
    </div>
  )
}

// Copenhagen: sharp minimal grid — a maternity series, rows scrolling up.
function CopenhagenScreen() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#ffffff', color: '#191817', overflow: 'hidden' }}>
      <Pan axis="y" dist="-16%" dur={24} delay={-5} style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 11, letterSpacing: '0.18em' }}>SAI SUMA</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 8.5, color: '#9b958c' }}>Maternity · 22 photos</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
          {MATERNITY.map((p, i) => (
            <div key={i} style={{ height: 150, overflow: 'hidden' }}><Cover src={p} /></div>
          ))}
        </div>
      </Pan>
    </div>
  )
}

// Blantyre: sage journal — travel photos with mono field notes, scrolling.
function BlantyreScreen() {
  const rows = [
    { wide: LAND[4], narrow: LAND[7], wcap: 'BACKWATERS, KERALA', ncap: 'ALVISO SALT PONDS' },
    { wide: LAND[8], narrow: LAND[9], wcap: 'WALTON LIGHTHOUSE', ncap: 'GHOST TREE', flip: true },
    { wide: LAND[1], narrow: LAND[5], wcap: 'EASTERN SIERRA', ncap: 'PASTEL DAWN' },
  ]
  return (
    <div style={{ width: '100%', height: '100%', background: '#e6e4da', color: '#3c4036', overflow: 'hidden' }}>
      <Pan axis="y" dist="-34%" dur={28} delay={-19} style={{ padding: '18px 20px' }}>
        <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.2em', color: '#5c6152', marginBottom: 14 }}>FIELD NOTES — J. OKAFOR</div>
        {rows.map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 18, flexDirection: row.flip ? 'row-reverse' : 'row' }}>
            <div style={{ flex: 1.6, minWidth: 0 }}>
              <div style={{ height: 148 }}><Cover src={row.wide} /></div>
              <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.1em', color: '#5c6152', marginTop: 6 }}>{row.wcap}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{ height: 110 }}><Cover src={row.narrow} /></div>
              <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.1em', color: '#5c6152', marginTop: 6 }}>{row.ncap}</div>
            </div>
          </div>
        ))}
      </Pan>
    </div>
  )
}

// Slideshow: the differentiator — a film stack peeling nearly full-frame on a
// dark ground, like a slideshow mid-play.
function SlideshowScreen() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#141109', position: 'relative', overflow: 'hidden' }}>
      {/* The stack stops well above the caption bar, and the bar layers over
          whatever the peel animation does — photos never cover the title. */}
      <div style={{ position: 'absolute', inset: '6% 10% 19%' }}>
        <SlideshowStack images={[STAGE[5], PORTRAITS[4], LAND[5], PORTRAITS[6], LAND[1]]} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 3, padding: '26px 16px 12px', background: 'linear-gradient(to top, rgba(10,8,5,0.85), rgba(10,8,5,0))', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: '0.18em', color: '#c9bda4' }}>♪ NOW PLAYING</span>
        <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 11, color: '#efe7d7' }}>the year, in frames</span>
      </div>
    </div>
  )
}

// Cover page: the front door of a site — one photograph and a name.
function CoverScreen() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', color: '#f6f3ec', overflow: 'hidden' }}>
      <div className="sampler__kenburns" style={{ position: 'absolute', inset: 0, willChange: 'transform' }}>
        <Cover src={LAND[0]} />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(20,16,12,0.55), rgba(20,16,12,0.08) 55%)' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: 22 }}>
        <div style={{ fontFamily: SERIF, fontSize: 27, letterSpacing: '0.02em' }}>Swami Venkataramani</div>
        <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.24em', marginTop: 9, opacity: 0.85 }}>PORTFOLIO — GALLERIES — PRINTS</div>
      </div>
    </div>
  )
}

/* ── The strip ───────────────────────────────────────────────────────────── */

const SCREENS = [
  { key: 'florence', theme: 'Florence', title: 'A portrait wall', tilt: -1.3, lift: -10, Screen: FlorenceScreen },
  { key: 'slideshow', theme: 'Slideshow', title: 'Set to music', tilt: 0.9, lift: 14, Screen: SlideshowScreen },
  { key: 'kyoto', theme: 'Kyoto', title: 'Landscapes', tilt: 1.1, lift: -6, Screen: KyotoScreen },
  { key: 'amsterdam', theme: 'Amsterdam', title: 'A tour archive', tilt: -0.9, lift: 10, Screen: AmsterdamScreen },
  { key: 'cover', theme: 'Cover page', title: 'The front door', tilt: 1.2, lift: -14, Screen: CoverScreen },
  { key: 'copenhagen', theme: 'Copenhagen', title: 'A maternity series', tilt: -1.1, lift: 8, Screen: CopenhagenScreen },
  { key: 'blantyre', theme: 'Blantyre', title: 'Field notes', tilt: 0.8, lift: -8, Screen: BlantyreScreen },
]

function Framed({ theme, title, tilt, lift, children }) {
  return (
    <figure style={{ margin: 0, flex: '0 0 auto', width: 'clamp(340px, 44vw, 560px)', transform: `rotate(${tilt}deg) translateY(${lift}px)` }}>
      <div
        style={{
          aspectRatio: '10 / 7', overflow: 'hidden', borderRadius: 6,
          border: '1px solid rgba(26,18,10,0.14)',
          // A real cast shadow: tight, directional, tucked under the frame —
          // not a wide gray wash that merges with the neighbour's.
          boxShadow: '0 30px 40px -32px rgba(26,18,10,0.55), 0 2px 6px rgba(26,18,10,0.10)',
          background: '#fff',
        }}
      >
        {children}
      </div>
      <figcaption style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10, padding: '12px 4px 0' }}>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8a8276' }}>{theme}</span>
        <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, color: '#4a463d' }}>{title}</span>
      </figcaption>
    </figure>
  )
}

export default function GallerySampler() {
  // Two copies of the strip; a JS drift loop translates the track and wraps at
  // the halfway point, so the loop is seamless AND the user can scrub: a
  // clearly-horizontal wheel/trackpad gesture over the strip adds straight
  // into the offset (drift keeps going — no hover freeze), while vertical
  // scrolling passes through untouched and keeps scrolling the page.
  const wrapRef = useRef(null)
  const trackRef = useRef(null)
  const offsetRef = useRef(0)

  useEffect(() => {
    const wrap = wrapRef.current
    const track = trackRef.current
    if (!wrap || !track) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const SPEED = 30 // px/s drift
    let raf = 0
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (!reduce) offsetRef.current += SPEED * dt
      const half = track.scrollWidth / 2
      if (half > 0) {
        offsetRef.current = ((offsetRef.current % half) + half) % half
        track.style.transform = `translateX(${-offsetRef.current}px)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      e.preventDefault()
      offsetRef.current += e.deltaX
    }
    wrap.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      cancelAnimationFrame(raf)
      wrap.removeEventListener('wheel', onWheel)
    }
  }, [])

  const strip = (dupe) => (
    <div aria-hidden={dupe || undefined} style={{ display: 'flex', alignItems: 'center', gap: 'clamp(30px, 4vw, 60px)', paddingRight: 'clamp(30px, 4vw, 60px)' }}>
      {SCREENS.map(({ key, theme, title, tilt, lift, Screen }) => (
        <Framed key={key} theme={theme} title={title} tilt={tilt} lift={lift}>
          <Screen />
        </Framed>
      ))}
    </div>
  )

  return (
    // Generous vertical padding: tilted, lifted frames cast shadows and hang
    // captions below their boxes — without the room, both clip against the
    // overflow edge as a hard band.
    <div ref={wrapRef} className="sampler" style={{ overflow: 'hidden', width: '100%', padding: '30px 0 64px' }}>
      <div ref={trackRef} className="sampler__track" style={{ display: 'flex', width: 'max-content', willChange: 'transform' }}>
        {strip(false)}
        {strip(true)}
      </div>
      <style jsx global>{`
        /* Each screen pans within its frame on its own rhythm — ping-pong, so
           there's no loop seam. Delays start some mid-swing. */
        .sampler__pan-x { animation: samplerPanX var(--pan-dur, 28s) ease-in-out var(--pan-delay, 0s) infinite alternate; }
        .sampler__pan-y { animation: samplerPanY var(--pan-dur, 28s) ease-in-out var(--pan-delay, 0s) infinite alternate; }
        @keyframes samplerPanX {
          from { transform: translateX(0); }
          to { transform: translateX(var(--pan-dist, -40%)); }
        }
        @keyframes samplerPanY {
          from { transform: translateY(0); }
          to { transform: translateY(var(--pan-dist, -40%)); }
        }
        .sampler__kenburns { animation: samplerZoom 34s ease-in-out infinite alternate; }
        @keyframes samplerZoom {
          from { transform: scale(1); }
          to { transform: scale(1.07); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sampler__track, .sampler__pan-x, .sampler__pan-y, .sampler__kenburns { animation: none; }
        }
      `}</style>
    </div>
  )
}
