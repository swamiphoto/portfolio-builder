// common/photoMeta.js
// Format a library asset's capture metadata (date + EXIF) into a museum-label
// string for display beneath a photo. Theme-independent, pure. `mode` mirrors the
// Florence "Photo details" control: 'off' | 'date' | 'exif'.
//
// The capture shape (common/adminConfig.js createAssetRecord):
//   { capturedAt, timezone, cameraMake, cameraModel, lens, focalLengthMm,
//     aperture (already "f/2.8"), shutterSpeed (already "1/500"), iso }
// `uploadedAt` (asset.createdAt) is a fallback for the date so every library photo
// shows something even before EXIF is backfilled.

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function fmtAperture(ap) {
  if (ap == null || ap === '') return ''
  const s = String(ap)
  return /^f\//i.test(s) ? s : `f/${s}`
}

function fmtShutter(sh) {
  if (sh == null || sh === '') return ''
  const s = String(sh)
  return /s$/i.test(s) ? s : `${s}s`
}

function fmtFocal(fl) {
  if (fl == null || fl === '') return ''
  const n = typeof fl === 'number' ? Math.round(fl) : fl
  return `${n}mm`
}

// Returns a possibly-multiline string ('' when nothing to show).
export function formatCaptureMeta(capture, mode = 'off', uploadedAt = null) {
  if (mode === 'off') return ''
  const c = capture || {}
  const date = fmtDate(c.capturedAt || uploadedAt)
  if (mode === 'date') return date
  // 'exif' → date, camera + lens, then the exposure line.
  const camera = c.cameraModel || [c.cameraMake, c.cameraModel].filter(Boolean).join(' ')
  const gear = [camera, c.lens].filter(Boolean).join(' · ')
  const exposure = [
    fmtFocal(c.focalLengthMm),
    fmtAperture(c.aperture),
    fmtShutter(c.shutterSpeed),
    c.iso ? `ISO ${c.iso}` : '',
  ].filter(Boolean).join(' · ')
  return [date, gear, exposure].filter(Boolean).join('\n')
}

// The trimmed capture projection sent to the published client (keeps props small).
export function publicCaptureForAsset(asset) {
  const c = asset?.capture
  if (!c) return null
  const out = {}
  for (const k of ['capturedAt', 'cameraMake', 'cameraModel', 'lens', 'focalLengthMm', 'aperture', 'shutterSpeed', 'iso']) {
    if (c[k] != null && c[k] !== '') out[k] = c[k]
  }
  return Object.keys(out).length ? out : null
}
