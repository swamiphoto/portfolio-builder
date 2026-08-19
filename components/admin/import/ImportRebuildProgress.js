import { useEffect, useState } from 'react'
import { monoLabel } from './importFlowStyles'

const PHASES = ['Reading your pages…', 'Mapping your layout…', 'Placing your blocks…']
const SHOWCASE_BG = 'radial-gradient(120% 90% at 50% 8%, #efe8dc 0%, #e4dccf 45%, #d8cdba 100%)'

// A short branded welcome while the (near-instant) client-side rebuild runs. Not
// a progress bar pretending to do minutes of work — a choreographed reveal of the
// block types the rebuild is placing, then hand off. The AI follow-up plan swaps
// the timed cadence for real per-page progress events.
export default function ImportRebuildProgress({ summary, onDone }) {
  const [phase, setPhase] = useState(0)
  const thumbs = (summary?.imported || []).slice(0, 6).map((a) => a.publicUrl).filter(Boolean)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1200)
    const t2 = setTimeout(() => setPhase(2), 2400)
    const done = setTimeout(() => onDone && onDone(), 3600)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(done) }
  }, [onDone])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: SHOWCASE_BG }}>
      <div className="flex gap-3" style={{ marginBottom: 26 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 92, height: 68, borderRadius: 4, background: '#fff', boxShadow: '0 8px 22px rgba(60,40,15,0.18)', overflow: 'hidden', transform: `rotate(${i - 1}deg)` }}>
            {thumbs[i] && <img src={thumbs[i]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
        ))}
      </div>
      <p style={{ ...monoLabel }}>{PHASES[phase]}</p>
      <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text-secondary)' }}>Building your site — sit tight, this takes a few seconds.</p>
    </div>
  )
}
