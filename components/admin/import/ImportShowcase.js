import { useEffect, useMemo, useRef, useState } from 'react'
import { MONO } from './importFlowStyles'

// The wait, as a show — not a process. While photos import in the background, we
// take over the screen with a calm exhibition: the photographer's own images drift
// in one at a time, scattered around the edges, in varied sizes and formats (loose
// prints, thin-bordered photos, the odd Polaroid). In the quiet center a line about
// Sepia rises and settles; along the bottom, a gentle "importing…" note with a slim
// progress bar keeps them oriented. Photos come from discovery's source URLs, so the
// show starts the moment the import does.

const PITCHES = [
  { title: 'Galleries set to music.', body: 'The kind of slideshow a client actually sits through to the end.' },
  { title: 'Built around your photographs.', body: 'Your work sets the tone, instead of bending to fit a template.' },
  { title: 'One click, a new look.', body: 'Change the whole design and your photos and captions stay exactly where they are.' },
  { title: 'Fast on every screen.', body: 'Sharp and quick to load, with nothing for you to configure.' },
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
  const nextId = useRef(0)

  // Prints grow on wider screens (more room, more immersive) and shrink on small
  // ones, so the show is responsive without ever feeling cramped or overflowing.
  useEffect(() => {
    const onResize = () => setScale(Math.min(1.4, Math.max(0.8, window.innerWidth / 1200)))
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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
        <span className="font-fraunces" style={{ fontSize: 17, fontStyle: 'italic', color: '#2c2416' }}>Sepia</span>
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
          return (
            <div
              key={c.id}
              className="showcase-photo"
              style={{ position: 'absolute', left: `${slot.x}%`, top: `${slot.y}%`, transform: `translate(-50%, -50%) rotate(${c.rot}deg)` }}
            >
              <div className="showcase-photo__anim">
                <div style={{ ...fs, boxShadow: '0 16px 34px rgba(60,40,15,0.17), 0 3px 8px rgba(60,40,15,0.11)' }}>
                  <div style={{ width: w, height: Math.round(w * c.aspect), overflow: 'hidden', background: '#ddd3c2', borderRadius: c.format === 'bare' ? 3 : 0 }}>
                    <img src={c.url} alt="" loading="lazy" decoding="async" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'saturate(0.96) sepia(0.05)' }} />
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
          <p style={{ fontSize: 14.5, color: '#7a6b55', lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
            {active.body}
          </p>
        </div>
      </div>

      {/* bottom scrim so the note stays legible over any print */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 190, zIndex: 2, pointerEvents: 'none', background: 'linear-gradient(to top, rgba(226,217,203,0.92) 0%, rgba(226,217,203,0) 100%)' }} />

      {/* importing note + progress */}
      <div style={{ position: 'absolute', left: '50%', bottom: 38, transform: 'translateX(-50%)', zIndex: 4, width: 'min(360px, 84vw)', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#6f5f48', marginBottom: 12, letterSpacing: '0.01em' }}>
          {complete
            ? 'All in. Setting up your studio.'
            : `Importing your photos${sourceLabel ? ` from ${sourceLabel}` : ''}. Hang tight.`}
        </p>
        <div style={{ height: 3, borderRadius: 3, background: 'rgba(139,111,71,0.16)', overflow: 'hidden' }}>
          <div data-testid="showcase-progress" style={{ height: '100%', width: `${pct * 100}%`, background: '#8b6f47', borderRadius: 3, transition: 'width 0.7s ease' }} />
        </div>
        {total > 0 && (
          <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', color: '#a8967a', marginTop: 10 }}>
            {done} / {total}
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
