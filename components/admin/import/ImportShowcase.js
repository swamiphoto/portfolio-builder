import { useEffect, useMemo, useRef, useState } from 'react'
import { MONO } from './importFlowStyles'
import { showcaseThumbUrl, onCoverError } from './coverThumb'

// The wait, as a show — not a process. While photos import in the background, we
// take over the screen with a calm exhibition: the photographer's own images drift
// in one at a time, scattered around the edges, in varied sizes and formats (loose
// prints, thin-bordered photos, the odd Polaroid). In the quiet center a line about
// Sepia rises and settles; along the bottom, a gentle "importing…" note with a slim
// progress bar keeps them oriented. Photos come from discovery's source URLs, so the
// show starts the moment the import does.

const PITCHES = [
  { title: 'Immersive galleries set to music.', body: 'The kind of slideshow a client actually sits through to the end.' },
  { title: 'Fast to build.', body: 'Add and rearrange blocks of photos, video, and text to create your gallery.' },
  { title: 'One click, a new look.', body: 'Change themes as many times as you want, without ever rebuilding.' },
  { title: 'Sell prints from any photo.', body: 'Toggle it on, and prints ship worldwide with nothing for you to run.' },
  { title: 'Deliver the whole shoot.', body: 'Send the gallery, let clients pick their favorites, and upsell print packages.' },
  { title: 'Yours, top to bottom.', body: 'Your name on the door, and no badges but your own.' },
]

// Edge anchor points — the quiet center is for the message, the bottom for the note.
const SLOTS = [
  { x: 15, y: 22 }, { x: 32, y: 14 }, { x: 50, y: 13 }, { x: 68, y: 14 }, { x: 85, y: 22 },
  { x: 9, y: 46 }, { x: 91, y: 46 },
  { x: 14, y: 69 }, { x: 30, y: 75 }, { x: 70, y: 75 }, { x: 86, y: 69 },
]

const WIDTHS = [140, 178, 216, 262, 312]      // some small, some big; scaled up on wide screens
const ASPECTS = [0.72, 0.82, 1, 1.2, 1.3]      // landscape → square → portrait
const FORMATS = ['bare', 'print', 'bare', 'print', 'polaroid', 'bare']  // Polaroids are the exception, not the rule

const SPAWN_MS = 2700
const LIFETIME_MS = 11000
const PITCH_MS = 6800

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

function frameStyle(format) {
  if (format === 'polaroid') return { padding: '7px 7px 24px', background: '#fffdf8', borderRadius: 2 }
  if (format === 'print') return { padding: 6, background: '#fffdf8', borderRadius: 2 }
  return { padding: 0, background: 'transparent', borderRadius: 3 } // bare
}

export default function ImportShowcase({ progress, photos = [], sourceLabel, onCancel }) {
  const { done = 0, total = 0 } = progress || {}
  const pct = total > 0 ? Math.min(1, done / total) : 0
  const complete = total > 0 && done >= total

  const pool = useMemo(() => photos.filter(Boolean), [photos])
  const [cards, setCards] = useState([])
  const [pitch, setPitch] = useState(0)
  const [scale, setScale] = useState(1)
  const [vh, setVh] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 900))
  const nextId = useRef(0)

  // Prints grow on wider screens (more room, more immersive) and shrink on small
  // ones, so the show is responsive without ever feeling cramped or overflowing.
  // We also track viewport height so tall portraits can be kept from riding up
  // off the top of the screen (see the per-card clamp below).
  useEffect(() => {
    const onResize = () => {
      setScale(Math.min(1.4, Math.max(0.8, window.innerWidth / 1200)))
      setVh(window.innerHeight)
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Animated counter. The backend reports progress in batches (a handful of
  // photos land at once), which makes the raw "done" number jump and then sit
  // still — it reads as stuck. So we tick a shown value up toward the real one,
  // one at a time, giving a continuous sense of motion. It never runs ahead of
  // the truth, and snaps to total the moment the import completes. We seed it
  // with the initial "done" so a mid-import mount shows the real number at once,
  // then only the forward deltas animate.
  const [shownDone, setShownDone] = useState(() => done)
  useEffect(() => {
    if (complete) { setShownDone(total); return }
    const iv = setInterval(() => {
      setShownDone((prev) => (prev < done ? prev + 1 : prev))
    }, 110)
    return () => clearInterval(iv)
  }, [done, total, complete])
  const shownPct = total > 0 ? Math.min(1, shownDone / total) : 0

  useEffect(() => {
    if (!pool.length) return
    let live = true
    const spawn = () => {
      const id = nextId.current++
      setCards((prev) => {
        const used = new Set(prev.map((c) => c.slotIdx))
        const free = SLOTS.map((_, i) => i).filter((i) => !used.has(i))
        const choices = free.length ? free : SLOTS.map((_, i) => i)
        const slotIdx = choices[Math.floor(Math.random() * choices.length)]
        const w = pick(WIDTHS)
        return [...prev, { id, slotIdx, url: pool[id % pool.length], w, aspect: pick(ASPECTS), format: pick(FORMATS), rot: (Math.random() - 0.5) * 9 }]
      })
      setTimeout(() => { if (live) setCards((cur) => cur.filter((c) => c.id !== id)) }, LIFETIME_MS)
    }
    const first = setTimeout(spawn, 500)
    const iv = setInterval(spawn, SPAWN_MS)
    return () => { live = false; clearTimeout(first); clearInterval(iv) }
  }, [pool])

  useEffect(() => {
    const t = setInterval(() => setPitch((p) => (p + 1) % PITCHES.length), PITCH_MS)
    return () => clearInterval(t)
  }, [])

  const active = PITCHES[pitch]

  return (
    <div className="fixed inset-0 z-50" style={{ background: 'radial-gradient(125% 100% at 50% 38%, #efe8dc 0%, #e5ddd0 55%, #dad0bd 100%)', overflow: 'hidden' }}>
      {/* top bar */}
      <div className="flex items-center justify-between" style={{ position: 'relative', zIndex: 4, padding: '22px 28px' }}>
        <span style={{ fontFamily: "'Italianno', cursive", fontSize: 30, lineHeight: 1, color: '#2c2416' }}>Sepia</span>
        {onCancel && (
          <button
            onClick={onCancel}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b3a184', padding: '4px 6px' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#2c2416')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#b3a184')}
          >
            Skip to my studio
          </button>
        )}
      </div>

      {/* scattered prints, varied in size + format */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        {cards.map((c) => {
          const slot = SLOTS[c.slotIdx]
          const fs = frameStyle(c.format)
          const w = Math.round(c.w * scale)
          const h = Math.round(w * c.aspect)
          // Keep tall portraits from riding up off the top of the screen. A small
          // peek above the edge looks intentional; a face sliced in half does not.
          // Clamp each card's center so its top edge never rises more than
          // MAX_OVERHANG above the viewport.
          const MAX_OVERHANG = 40
          const centerY = (slot.y / 100) * vh
          const topPx = Math.max(centerY, h / 2 - MAX_OVERHANG)
          return (
            <div
              key={c.id}
              className="showcase-photo"
              style={{ position: 'absolute', left: `${slot.x}%`, top: topPx, transform: `translate(-50%, -50%) rotate(${c.rot}deg)` }}
            >
              <div className="showcase-photo__anim">
                <div style={{ ...fs, boxShadow: '0 16px 34px rgba(60,40,15,0.17), 0 3px 8px rgba(60,40,15,0.11)' }}>
                  <div style={{ width: w, height: Math.round(w * c.aspect), overflow: 'hidden', background: '#ddd3c2', borderRadius: c.format === 'bare' ? 3 : 0 }}>
                    <img src={showcaseThumbUrl(c.url, 480)} alt="" loading="lazy" decoding="async" draggable={false} onError={onCoverError(c.url)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'saturate(0.96) sepia(0.05)' }} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* soft light behind the center message */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', background: 'radial-gradient(36% 26% at 50% 46%, rgba(239,232,220,0.74) 0%, rgba(239,232,220,0) 70%)' }} />

      {/* the message, centered and quiet */}
      <div style={{ position: 'absolute', top: '46%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 3, width: 'min(460px, 82vw)', textAlign: 'center', pointerEvents: 'none' }}>
        <div key={pitch} style={{ animation: 'pitchRise 1.4s ease both' }}>
          <h2 className="font-fraunces" style={{ fontSize: 27, fontStyle: 'italic', fontWeight: 300, color: '#2c2416', marginBottom: 12, lineHeight: 1.15 }}>
            {active.title}
          </h2>
          <p style={{ fontSize: 16, color: '#7a6b55', lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
            {active.body}
          </p>
        </div>
      </div>

      {/* bottom scrim so the note stays legible over any print */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 190, zIndex: 2, pointerEvents: 'none', background: 'linear-gradient(to top, rgba(226,217,203,0.92) 0%, rgba(226,217,203,0) 100%)' }} />

      {/* importing note + progress */}
      <div style={{ position: 'absolute', left: '50%', bottom: 36, transform: 'translateX(-50%)', zIndex: 4, width: 'min(440px, 88vw)', textAlign: 'center' }}>
        <p style={{ fontSize: 15, fontWeight: 500, color: '#43371f', marginBottom: 12, letterSpacing: '0.01em' }}>
          {complete
            ? 'All in. Setting up your studio.'
            : `Importing your photos${sourceLabel ? ` from ${sourceLabel}` : ''}…`}
        </p>
        <div style={{ height: 3, borderRadius: 3, background: 'rgba(139,111,71,0.16)', overflow: 'hidden' }}>
          <div data-testid="showcase-progress" style={{ height: '100%', width: `${shownPct * 100}%`, background: '#8b6f47', borderRadius: 3, transition: 'width 0.4s ease' }} />
        </div>
        {total > 0 && (
          <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', color: '#a8967a', marginTop: 10 }}>
            {shownDone} / {total}
          </p>
        )}
        {!complete && (
          <p style={{ fontSize: 12.5, color: '#8a7a62', lineHeight: 1.55, marginTop: 14, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
            Please keep this tab open. Depending on how many photos you have, this can take a few minutes. Grab a coffee, and everything will be ready when you're back.
          </p>
        )}
      </div>

      <style>{`
        @keyframes pitchRise {
          0%   { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes photoShow {
          0%   { opacity: 0; transform: translateY(16px) scale(1.015); }
          16%  { opacity: 1; transform: translateY(0) scale(1); }
          80%  { opacity: 1; transform: translateY(-7px) scale(1.02); }
          100% { opacity: 0; transform: translateY(-12px) scale(1.03); }
        }
        .showcase-photo__anim { animation: photoShow ${LIFETIME_MS}ms ease-in-out both; }
      `}</style>
    </div>
  )
}
