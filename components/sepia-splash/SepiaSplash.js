import { useEffect, useRef, useState } from 'react'

// =====================================================================
// Sepia splash — chunky flip-card wall, paper-textured tiles, real
// sepia-toned photos. Resolves into a pixel-perfect Italianno wordmark
// via per-tile sub-rect sampling of a hi-res offscreen render.
// =====================================================================

const PITCH = '#140d07'

const PHOTO_LETTERS = ['.', 'P', 'H', 'O', 'T', 'O']
const PHOTO_FONT = "'Geist Mono', ui-monospace, monospace"

const PHOTO_URLS = Array.from({ length: 24 }, (_, i) => `/splash/photo-${i + 1}.jpg`)

const WORDMARK_FONT = "'Italianno', cursive"

function rand(min, max) { return min + Math.random() * (max - min) }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v }

// ── Tone an image canvas with sepia + tighten palette ───────────────
// Result: warm brown midtones, gentle highlights, deep umber shadows.
// All photos collapse into the same family so the wall reads harmonious.
function toneToSepia(srcCanvas) {
  const ctx = srcCanvas.getContext('2d')
  const { width, height } = srcCanvas
  const img = ctx.getImageData(0, 0, width, height)
  const d = img.data
  // Lighter, more refined sepia ramp — no chocolate.
  // shadows: #3a2a1c, mids: #9a7a55, highlights: #f5e3c2
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2]
    const y = 0.299 * r + 0.587 * g + 0.114 * b
    let nr, ng, nb
    if (y < 110) {
      const t = y / 110
      nr = 58 + (154 - 58) * t
      ng = 42 + (122 - 42) * t
      nb = 28 + (85 - 28) * t
    } else {
      const t = (y - 110) / 145
      nr = 154 + (245 - 154) * t
      ng = 122 + (227 - 122) * t
      nb = 85 + (194 - 85) * t
    }
    const j = (Math.random() - 0.5) * 10
    d[i]     = clamp(nr + j, 0, 255)
    d[i + 1] = clamp(ng + j * 0.85, 0, 255)
    d[i + 2] = clamp(nb + j * 0.6, 0, 255)
  }
  ctx.putImageData(img, 0, 0)
}

// ── Paper texture overlay — generated once, multiplied into faces ───
function buildPaperTexture(size = 256) {
  // Subtle neutral-gray noise tile for soft-light overlay. Blended at low
  // opacity so the photo color comes through; this only adds tooth.
  const cv = document.createElement('canvas')
  cv.width = size
  cv.height = size
  const ctx = cv.getContext('2d')
  const img = ctx.createImageData(size, size)
  const d = img.data
  for (let p = 0; p < d.length; p += 4) {
    const v = 128 + (Math.random() - 0.5) * 38
    d[p] = d[p + 1] = d[p + 2] = v
    d[p + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  // a few sparse fibers
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const len = rand(10, 40)
    const ang = rand(0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${Math.random() < 0.5 ? 200 : 90}, ${Math.random() < 0.5 ? 200 : 90}, ${Math.random() < 0.5 ? 200 : 90}, ${rand(0.06, 0.14)})`
    ctx.lineWidth = rand(0.3, 0.8)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len)
    ctx.stroke()
  }
  return cv
}

// ── Procedural fallback textures — narrow sepia band only, no accents
function buildProceduralTextures(count = 4, size = 512) {
  const tones = [
    ['#1f140a', '#6b4d2e', '#d8b889'],
    ['#1a0e06', '#5a3a20', '#c9a472'],
    ['#241510', '#7a5238', '#e0c094'],
    ['#150d07', '#4a3520', '#b89b6e'],
  ]
  const out = []
  for (let i = 0; i < count; i++) {
    const cv = document.createElement('canvas')
    cv.width = size
    cv.height = size
    const ctx = cv.getContext('2d')
    const [a, b, c] = tones[i % tones.length]
    const cx = size * rand(0.3, 0.7)
    const cy = size * rand(0.3, 0.7)
    const grad = ctx.createRadialGradient(cx, cy, size * 0.05, cx, cy, size * 0.95)
    grad.addColorStop(0, c)
    grad.addColorStop(0.55, b)
    grad.addColorStop(1, a)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
    // soft blobs
    for (let k = 0; k < 3; k++) {
      const bx = rand(0, size), by = rand(0, size)
      const br = rand(size * 0.2, size * 0.5)
      const bg = ctx.createRadialGradient(bx, by, 0, bx, by, br)
      bg.addColorStop(0, c)
      bg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = bg
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.arc(bx, by, br, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    // grain
    const img = ctx.getImageData(0, 0, size, size)
    const d = img.data
    for (let p = 0; p < d.length; p += 4) {
      const j = (Math.random() - 0.5) * 20
      d[p]     = clamp(d[p]     + j, 0, 255)
      d[p + 1] = clamp(d[p + 1] + j * 0.85, 0, 255)
      d[p + 2] = clamp(d[p + 2] + j * 0.6, 0, 255)
    }
    ctx.putImageData(img, 0, 0)
    out.push(cv)
  }
  return out
}

// ── Hi-res wordmark target ──────────────────────────────────────────
function buildWordmarkCanvas({ width, height, text }) {
  const cv = document.createElement('canvas')
  cv.width = width
  cv.height = height
  const ctx = cv.getContext('2d')

  // Warm sepia wall — uniform brightness edge-to-edge (no vignette) but
  // textured so adjacent tile sub-rects sample visibly different shades.
  // Focal interest still comes from the wordmark glow alone.
  ctx.fillStyle = '#2e1e12'
  ctx.fillRect(0, 0, width, height)

  // Low-frequency scatter — many small blobs of slightly lighter and
  // slightly darker sepia, distributed UNIFORMLY across the canvas (no
  // center weighting), so the overall brightness stays even but every
  // tile picks up a different shade.
  const blobCount = 80
  const maxBlobR = Math.min(width, height) * 0.18
  for (let i = 0; i < blobCount; i++) {
    const cx = Math.random() * width
    const cy = Math.random() * height
    const radius = maxBlobR * (0.35 + Math.random() * 0.65)
    const lighter = Math.random() < 0.55
    const tone = lighter
      ? `rgba(255, 200, 130, ${0.04 + Math.random() * 0.05})`
      : `rgba(0, 0, 0, ${0.05 + Math.random() * 0.07})`
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
    g.addColorStop(0, tone)
    g.addColorStop(1, lighter ? 'rgba(255, 200, 130, 0)' : 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, width, height)
  }


  // Grain
  {
    const img = ctx.getImageData(0, 0, width, height)
    const d = img.data
    for (let p = 0; p < d.length; p += 4) {
      const j = (Math.random() - 0.5) * 14
      d[p]     = clamp(d[p]     + j, 0, 255)
      d[p + 1] = clamp(d[p + 1] + j * 0.85, 0, 255)
      d[p + 2] = clamp(d[p + 2] + j * 0.6, 0, 255)
    }
    ctx.putImageData(img, 0, 0)
  }

  // Smaller wordmark with breathing room — ~50% of viewport width and
  // capped at ~42% of viewport height.
  const targetW = width * 0.5
  let fs = Math.round(height * 0.42)
  ctx.font = `400 ${fs}px ${WORDMARK_FONT}`
  let m = ctx.measureText(text)
  if (m.width > 0) {
    const scale = targetW / m.width
    fs = Math.max(40, Math.round(fs * scale))
    ctx.font = `400 ${fs}px ${WORDMARK_FONT}`
    m = ctx.measureText(text)
  }
  ctx.textBaseline = 'middle'
  const tx = (width - m.width) / 2
  const ty = height / 2 + fs * 0.03

  // Wide soft bloom — sets up the warm halo that surrounds the wordmark.
  ctx.save()
  ctx.shadowColor = 'rgba(255, 195, 120, 0.6)'
  ctx.shadowBlur = Math.max(40, fs * 0.18)
  ctx.fillStyle = 'rgba(255, 195, 120, 0.28)'
  ctx.fillText(text, tx, ty)
  ctx.restore()

  // Letter fill — warm cream → gold → caramel. Slightly muted so it
  // belongs in the same family as the wall instead of jumping off it.
  const letterGrad = ctx.createLinearGradient(0, ty - fs * 0.55, 0, ty + fs * 0.55)
  letterGrad.addColorStop(0, '#f7dfb0')
  letterGrad.addColorStop(0.4, '#ebc88a')
  letterGrad.addColorStop(0.85, '#c89968')
  letterGrad.addColorStop(1, '#9d7849')
  ctx.fillStyle = letterGrad
  ctx.fillText(text, tx, ty)

  // Inner shine — a soft top highlight inside the letters
  ctx.save()
  ctx.globalCompositeOperation = 'overlay'
  const shineGrad = ctx.createLinearGradient(0, ty - fs * 0.55, 0, ty + fs * 0.1)
  shineGrad.addColorStop(0, 'rgba(255, 248, 230, 0.65)')
  shineGrad.addColorStop(1, 'rgba(255, 248, 230, 0)')
  ctx.fillStyle = shineGrad
  ctx.fillText(text, tx, ty - fs * 0.02)
  ctx.restore()

  // Edge glow pass — small blur, tighter halo for the polished sheen
  ctx.save()
  ctx.shadowColor = 'rgba(255, 230, 180, 0.5)'
  ctx.shadowBlur = Math.max(8, fs * 0.04)
  ctx.fillStyle = 'rgba(0, 0, 0, 0)'
  ctx.strokeStyle = 'rgba(255, 240, 210, 0.18)'
  ctx.lineWidth = Math.max(1, fs * 0.008)
  ctx.strokeText(text, tx, ty)
  ctx.restore()

  // Bounding box of the rendered wordmark.
  const wmBottom = ty + (m.actualBoundingBoxDescent || fs * 0.55)
  const wmTop = ty - (m.actualBoundingBoxAscent || fs * 0.55)
  const wmLeft = tx
  const wmRight = tx + m.width

  // Per-letter anchor: position of the "i" inside "Sepia". We measure
  // prefix widths so kerning is accounted for, then sample the "i"
  // glyph alone for its bottom edge.
  ctx.font = `400 ${fs}px ${WORDMARK_FONT}`
  ctx.textBaseline = 'middle'
  const iIndex = text.toLowerCase().indexOf('i')
  let iLeftX = tx
  let iRightX = tx + m.width
  let iBottomY = wmBottom
  if (iIndex >= 0) {
    const beforeI = ctx.measureText(text.slice(0, iIndex)).width
    const upToI = ctx.measureText(text.slice(0, iIndex + 1)).width
    iLeftX = tx + beforeI
    iRightX = tx + upToI
    const iMetrics = ctx.measureText('i')
    iBottomY = ty + (iMetrics.actualBoundingBoxDescent || fs * 0.12)
  }

  return { canvas: cv, wmTop, wmBottom, wmLeft, wmRight, iLeftX, iRightX, iBottomY }
}

// ── Async image loader → canvas ─────────────────────────────────────
function loadImageToCanvas(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const cv = document.createElement('canvas')
      cv.width = img.naturalWidth
      cv.height = img.naturalHeight
      cv.getContext('2d').drawImage(img, 0, 0)
      resolve(cv)
    }
    img.onerror = reject
    img.src = url
  })
}

function useFontReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (typeof document === 'undefined') return
    let cancelled = false
    async function load() {
      try {
        if (document.fonts && document.fonts.load) {
          await document.fonts.load(`120px "Italianno"`, 'Sepia')
          await document.fonts.load(`400px "Italianno"`, 'Sepia')
          await document.fonts.load(`700 60px "Geist Mono"`, '.PHOTO')
          if (document.fonts.ready) await document.fonts.ready
        }
      } catch (_) { /* fallthrough */ }
      if (!cancelled) setReady(true)
    }
    load()
    return () => { cancelled = true }
  }, [])
  return ready
}

// Build a letter-face canvas — a single tile-sized cell with a
// monospaced letter on the same warm sepia ground as the wall.
function buildLetterFace(letter, w, h) {
  const cv = document.createElement('canvas')
  cv.width = Math.max(1, Math.round(w))
  cv.height = Math.max(1, Math.round(h))
  const ctx = cv.getContext('2d')

  // Base: warm sepia ground (slightly brighter than the wall so the
  // .PHOTO row reads as its own band).
  const base = ctx.createLinearGradient(0, 0, 0, cv.height)
  base.addColorStop(0, '#3a2614')
  base.addColorStop(1, '#241510')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, cv.width, cv.height)

  // Letter — cream-gold, fitted to the cell with slight breathing room.
  const fs = Math.round(Math.min(cv.width, cv.height) * 0.7)
  ctx.font = `700 ${fs}px ${PHOTO_FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // soft warm shadow
  ctx.save()
  ctx.shadowColor = 'rgba(255, 200, 130, 0.4)'
  ctx.shadowBlur = fs * 0.18
  ctx.fillStyle = '#f0d8a6'
  ctx.fillText(letter, cv.width / 2, cv.height / 2 + fs * 0.04)
  ctx.restore()
  return cv
}

function usePhotoTextures() {
  const [textures, setTextures] = useState(null)
  useEffect(() => {
    let cancelled = false
    Promise.all(PHOTO_URLS.map(u => loadImageToCanvas(u).catch(() => null)))
      .then(canvases => {
        const valid = canvases.filter(Boolean)
        valid.forEach(toneToSepia)
        if (!cancelled) setTextures(valid)
      })
    return () => { cancelled = true }
  }, [])
  return textures
}

// ── main component ──────────────────────────────────────────────────
export default function SepiaSplash({
  onDone,
  tileSize = 64,
  flipDuration = 2200,
  revealDuration = 1300,
  holdDuration = 1500,
  fadeDuration = 700,
  text = 'Sepia',
  tagline = 'A platform for photographers',
}) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const [size, setSize] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1440,
    h: typeof window !== 'undefined' ? window.innerHeight : 900,
  }))
  const [phase, setPhase] = useState('flipping')
  const fontReady = useFontReady()
  const photoTextures = usePhotoTextures()

  useEffect(() => {
    function onResize() { setSize({ w: window.innerWidth, h: window.innerHeight }) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!fontReady) return
    if (!photoTextures) return // wait for at least the attempt
    const canvas = canvasRef.current
    if (!canvas) return

    const { w: width, h: height } = size
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2)
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    const cols = Math.max(8, Math.floor(width / tileSize))
    const rows = Math.max(6, Math.floor(height / tileSize))
    const tileW = width / cols
    const tileH = height / rows
    // Very thin gutter — just enough to suggest tile separation without
    // slicing the wordmark into prison-cell stripes.
    const gutter = 1

    const wmInfo = buildWordmarkCanvas({ width, height, text })
    const wordmarkCv = wmInfo.canvas
    const paperCv = buildPaperTexture(256)
    const procedural = buildProceduralTextures(4, 512)
    // Texture pool: real photos (heavily weighted) + a few procedurals as variety
    const photoPool = (photoTextures && photoTextures.length > 0) ? photoTextures : []
    const allTex = photoPool.length > 0
      ? [...photoPool, ...photoPool, ...procedural] // double-weight real photos
      : procedural

    const N = cols * rows

    // Each tile flips exactly once. State per tile:
    //   - startDelay: when it begins flipping
    //   - flipDur:    how long the single flip takes
    //   - finalFace:  the sub-rect of the wordmark canvas it samples
    //   - photoLetter / photoStartDelay / photoFlipDur / photoFace:
    //     optional second flip (after settled) for the .PHOTO typewriter.
    const startDelays = new Float32Array(N)
    const flipDurs    = new Float32Array(N)
    const finalFace   = new Array(N)
    const photoLetter = new Array(N).fill(null)
    const photoStartDelay = new Float32Array(N)
    const photoFlipDur = new Float32Array(N)
    const photoFace = new Array(N).fill(null)

    // Scattered sequential reveal. Build a randomized order over all
    // tiles, then forbid back-to-back neighbors so the next tile to
    // flip is always somewhere else in the frame. Each tile starts at
    // (orderIndex * step) + small jitter — mostly sequential with a
    // little overlap so it doesn't feel mechanical.
    const order = new Int32Array(N)
    for (let k = 0; k < N; k++) order[k] = k
    for (let k = N - 1; k > 0; k--) {
      const j = (Math.random() * (k + 1)) | 0
      const tmp = order[k]; order[k] = order[j]; order[j] = tmp
    }
    function isNeighbor(a, b) {
      const ac = a % cols, ar = (a / cols) | 0
      const bc = b % cols, br = (b / cols) | 0
      return Math.abs(ac - bc) <= 1 && Math.abs(ar - br) <= 1
    }
    for (let k = 1; k < N; k++) {
      if (isNeighbor(order[k - 1], order[k])) {
        for (let j = k + 1; j < Math.min(k + 14, N); j++) {
          if (!isNeighbor(order[k - 1], order[j])) {
            const tmp = order[k]; order[k] = order[j]; order[j] = tmp
            break
          }
        }
      }
    }

    // Cap total reveal at ~3.2s regardless of tile count, with wide
    // jitter so 6–10 flips overlap at any moment — keeps the middle
    // of the cascade from feeling halting.
    const totalReveal = 3200
    const stepMs = totalReveal / N
    const jitterMs = Math.min(180, stepMs * 9)

    let computedAllSettled = 0
    for (let k = 0; k < N; k++) {
      const i = order[k]
      const c = i % cols
      const r = (i / cols) | 0

      startDelays[i] = k * stepMs + rand(-jitterMs, jitterMs)
      if (startDelays[i] < 0) startDelays[i] = 0
      flipDurs[i] = rand(420, 720)

      const settledAt = startDelays[i] + flipDurs[i]
      if (settledAt > computedAllSettled) computedAllSettled = settledAt

      finalFace[i] = {
        tex: wordmarkCv,
        sx: c * tileW,
        sy: r * tileH,
        sw: tileW,
        sh: tileH,
      }
    }
    void allTex

    // Lay out the .PHOTO row anchored to the "i" in "Sepia":
    //   horizontal start = one tile to the LEFT of the "i"
    //   vertical row     = two tiles BELOW the bottom of the "i"
    // The "i" is measured per-letter from the wordmark canvas via
    // measureText prefixes, so this works at any viewport size.
    const photoCols = PHOTO_LETTERS.length
    const iCol = Math.floor(wmInfo.iLeftX / tileW)
    let photoStartCol = iCol - 1
    if (photoStartCol < 0) photoStartCol = 0
    if (photoStartCol + photoCols > cols) photoStartCol = cols - photoCols

    const iRow = Math.floor(wmInfo.iBottomY / tileH)
    let photoRow = iRow + 2
    if (photoRow >= rows) photoRow = rows - 1
    for (let k = 0; k < photoCols; k++) {
      const c = photoStartCol + k
      const r = photoRow
      const i = r * cols + c
      photoLetter[i] = PHOTO_LETTERS[k]
      photoFace[i] = buildLetterFace(PHOTO_LETTERS[k], tileW, tileH)
    }

    const startTs = performance.now()
    const allLockEnd = computedAllSettled + 80
    let settledFired = false

    // Schedule .PHOTO typewriter — each tile's second flip starts after
    // the main reveal settles, with a generous gap between letters.
    const photoSettleGap = 500   // ms after settled before .PHOTO starts
    const photoStepMs    = 280   // ms between successive letters
    const photoFlipMs    = 520   // single flip duration for each letter
    for (let k = 0; k < photoCols; k++) {
      const c = photoStartCol + k
      const r = photoRow
      const i = r * cols + c
      photoStartDelay[i] = allLockEnd + photoSettleGap + k * photoStepMs
      photoFlipDur[i] = photoFlipMs
    }
    const photoEnd = allLockEnd + photoSettleGap + (photoCols - 1) * photoStepMs + photoFlipMs

    function frame(now) {
      const elapsed = now - startTs

      // Grout — distinctly darker than the tile faces so the 1px gap
      // reads as visible card separation, not a single solid surface.
      ctx.fillStyle = '#150c07'
      ctx.fillRect(0, 0, width, height)

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c
          const t = elapsed - startDelays[i]
          const flipDur = flipDurs[i]
          const cx = c * tileW
          const cy = r * tileH

          // Single-flip lifecycle:
          //   t < 0           → unlit (waiting for its turn)
          //   0 ≤ t < flipDur → flipping (front: unlit, back: finalFace)
          //   t ≥ flipDur     → settled on finalFace forever
          // PHOTO tiles get a second flip later: finalFace → photoFace.
          let face, scale, isBack = false, locked = false, unlit = false
          let drawImageAlt = null

          if (t < 0) {
            unlit = true
            scale = 1
          } else if (t < flipDur) {
            const ph = t / flipDur
            const sc = Math.cos(ph * Math.PI)
            if (sc >= 0) {
              unlit = true
              scale = sc
            } else {
              face = finalFace[i]
              scale = -sc
              isBack = true
            }
          } else if (photoLetter[i] && elapsed >= photoStartDelay[i]) {
            // Second flip: from current finalFace to the letter face.
            const pt = elapsed - photoStartDelay[i]
            if (pt < photoFlipDur[i]) {
              const ph = pt / photoFlipDur[i]
              const sc = Math.cos(ph * Math.PI)
              if (sc >= 0) {
                face = finalFace[i]
                scale = sc
              } else {
                drawImageAlt = photoFace[i]
                scale = -sc
                isBack = true
              }
            } else {
              drawImageAlt = photoFace[i]
              scale = 1
              locked = true
            }
          } else {
            face = finalFace[i]
            scale = 1
            locked = true
          }

          // Tile inset rect (tile body inside grout gutter)
          const ix = cx + gutter / 2
          const iy = cy + gutter / 2
          const iw = tileW - gutter
          const ihFull = tileH - gutter

          const h = Math.max(0.5, ihFull * scale)
          const y = iy + (ihFull - h) / 2

          // Tile clip — round corners slightly for paper feel
          const radius = Math.min(2, Math.min(iw, h) * 0.08)

          ctx.save()
          ctx.beginPath()
          if (radius > 0.5) {
            // rounded rect
            ctx.moveTo(ix + radius, y)
            ctx.lineTo(ix + iw - radius, y)
            ctx.arcTo(ix + iw, y, ix + iw, y + radius, radius)
            ctx.lineTo(ix + iw, y + h - radius)
            ctx.arcTo(ix + iw, y + h, ix + iw - radius, y + h, radius)
            ctx.lineTo(ix + radius, y + h)
            ctx.arcTo(ix, y + h, ix, y + h - radius, radius)
            ctx.lineTo(ix, y + radius)
            ctx.arcTo(ix, y, ix + radius, y, radius)
            ctx.closePath()
          } else {
            ctx.rect(ix, y, iw, h)
          }
          ctx.clip()

          if (unlit) {
            // Dark unlit tile (pre-ignition). A flat warm-dark fill with a
            // hint of grain so it doesn't look digital.
            ctx.fillStyle = '#241810'
            ctx.fillRect(ix, y, iw, h)
          } else if (drawImageAlt) {
            // Letter face — drawn from a pre-rendered tile-sized canvas.
            ctx.drawImage(drawImageAlt, 0, 0, drawImageAlt.width, drawImageAlt.height, ix, y, iw, h)
          } else {
            ctx.drawImage(face.tex, face.sx, face.sy, face.sw, face.sh, ix, y, iw, h)
          }

          // Paper texture overlay — soft-light, low alpha. Tooth without bulge.
          ctx.save()
          ctx.globalCompositeOperation = 'soft-light'
          ctx.globalAlpha = 0.4
          const pw = paperCv.width, ph = paperCv.height
          for (let py = 0; py < h; py += ph) {
            for (let px = 0; px < iw; px += pw) {
              ctx.drawImage(paperCv, ix + px, y + py)
            }
          }
          ctx.restore()

          if (isBack) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
            ctx.fillRect(ix, y, iw, h)
          }

          ctx.restore() // unclip

          // Edge-on dark bar at 90° — the only "card-flipping" cue
          if (Math.abs(scale) < 0.07 && !locked && t >= 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
            ctx.fillRect(ix, cy + tileH / 2 - 1, iw, 2)
          }
        }
      }


      if (elapsed >= allLockEnd && !settledFired) {
        settledFired = true
        setPhase('settled')
      }

      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontReady, photoTextures, size, tileSize, flipDuration, revealDuration, text])

  // No auto-fade — splash holds on the wordmark until the user clicks.
  // Click triggers a brief fade-out into the underlying page.
  function dismiss() {
    if (phase === 'done' || phase === 'fading') return
    setPhase('fading')
    setTimeout(() => {
      setPhase('done')
      cancelAnimationFrame(rafRef.current)
      onDone && onDone()
    }, fadeDuration)
  }

  if (phase === 'done') return null

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: PITCH,
        opacity: phase === 'fading' ? 0 : 1,
        transition: `opacity ${fadeDuration}ms ease-out`,
        cursor: 'pointer',
      }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100vw', height: '100vh' }}
      />
      {/* Tagline — anchored under the right tail of the wordmark with
          generous gap, museum-plaque style. The wordmark spans ~50% of
          viewport width centered, so its right edge sits at ~75% horizontally,
          baseline at ~50% vertically + ~half cap height. */}
      {/* Tagline now rendered inside the canvas as flip tiles (.PHOTO). */}
    </div>
  )
}
