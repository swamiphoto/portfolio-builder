// Shared filter logic + count computation used by AdminLibrary and PhotoPickerModal.
// Keeps the two surfaces in lockstep on what each filter means.

export function applyFilters(assets, filters) {
  return assets.filter((asset) => {
    if (filters.orientation && filters.orientation !== "all" && asset.orientation !== filters.orientation) return false

    if (filters.captureYear && filters.captureYear !== "all") {
      const capturedAt = asset.capture?.capturedAt
      if (!capturedAt) return false
      const year = new Date(capturedAt).getFullYear()
      if (String(year) !== filters.captureYear) return false
    }

    if (filters.uploaded && filters.uploaded !== "all") {
      const uploadedAt = asset.createdAt ? new Date(asset.createdAt) : null
      if (!uploadedAt) return false
      const now = Date.now()
      const age = now - uploadedAt.getTime()
      if (filters.uploaded === "week"  && age > 7 * 864e5) return false
      if (filters.uploaded === "month" && age > 30 * 864e5) return false
      if (filters.uploaded === "year"  && uploadedAt.getFullYear() !== new Date().getFullYear()) return false
      if (filters.uploaded === "older" && uploadedAt.getFullYear() >= new Date().getFullYear()) return false
    }

    const usageCount = asset.usage?.usageCount || 0
    if (filters.usage === "unused" && usageCount > 0) return false
    if (filters.usage === "used" && usageCount === 0) return false

    if (filters.aperture && filters.aperture !== "all") {
      const raw = asset.capture?.aperture || asset.capture?.fNumber
      const f = raw ? parseFloat(String(raw).replace(/^[fFƒ]\/?/, '')) : NaN
      if (isNaN(f)) return false
      if (filters.aperture === "wide"   && f >= 2)             return false
      if (filters.aperture === "mid"    && (f < 2 || f >= 4))  return false
      if (filters.aperture === "narrow" && (f < 4 || f >= 8))  return false
      if (filters.aperture === "closed" && f < 8)              return false
    }

    if (filters.shutter && filters.shutter !== "all") {
      const raw = asset.capture?.shutterSpeed || asset.capture?.exposureTime
      const sec = (() => {
        if (!raw) return NaN
        const str = String(raw)
        const slash = str.indexOf('/')
        if (slash > 0) {
          const n = parseFloat(str.slice(0, slash))
          const d = parseFloat(str.slice(slash + 1))
          return (!isNaN(n) && !isNaN(d) && d !== 0) ? n / d : NaN
        }
        return parseFloat(str)
      })()
      if (isNaN(sec)) return false
      if (filters.shutter === "fast"   && sec >= 1/500)                 return false
      if (filters.shutter === "action" && (sec < 1/500 || sec >= 1/125)) return false
      if (filters.shutter === "hand"   && (sec < 1/125 || sec >= 1/30))  return false
      if (filters.shutter === "slow"   && sec < 1/30)                   return false
    }

    if (filters.camera && filters.camera !== "all" && asset.capture?.cameraModel !== filters.camera) return false
    if (filters.lens && filters.lens !== "all" && asset.capture?.lens !== filters.lens) return false

    if (filters.focalLength && filters.focalLength !== "all") {
      const fl = asset.capture?.focalLengthMm
      if (!fl) return false
      if (filters.focalLength === "wide"   && fl > 35)                return false
      if (filters.focalLength === "normal" && (fl <= 35 || fl > 85))   return false
      if (filters.focalLength === "tele"   && (fl <= 85 || fl > 200))  return false
      if (filters.focalLength === "super"  && fl <= 200)              return false
    }

    if (filters.iso && filters.iso !== "all") {
      const iso = asset.capture?.iso
      if (!iso) return false
      if (filters.iso === "low"  && iso > 400)                  return false
      if (filters.iso === "mid"  && (iso <= 400 || iso > 1600))  return false
      if (filters.iso === "high" && iso <= 1600)                return false
    }

    return true
  })
}

export function computeFilterCounts(assets) {
  const orientation = {}
  const usage = { used: 0, unused: 0 }
  const camera = {}
  const lens = {}
  const focalLength = {}
  const captureYear = {}
  const uploaded = {}
  const aperture = {}
  const shutter = {}
  const iso = {}

  const now = Date.now()
  const currentYear = new Date().getFullYear()

  for (const asset of assets) {
    orientation[asset.orientation || "unknown"] = (orientation[asset.orientation || "unknown"] || 0) + 1

    if ((asset.usage?.usageCount || 0) > 0) usage.used += 1
    else usage.unused += 1

    const cam = asset.capture?.cameraModel
    if (cam) camera[cam] = (camera[cam] || 0) + 1

    const ln = asset.capture?.lens
    if (ln) lens[ln] = (lens[ln] || 0) + 1

    const fl = asset.capture?.focalLengthMm
    if (fl) {
      if (fl <= 35) focalLength.wide = (focalLength.wide || 0) + 1
      else if (fl <= 85) focalLength.normal = (focalLength.normal || 0) + 1
      else if (fl <= 200) focalLength.tele = (focalLength.tele || 0) + 1
      else focalLength.super = (focalLength.super || 0) + 1
    }

    const capturedAt = asset.capture?.capturedAt
    if (capturedAt) {
      const y = String(new Date(capturedAt).getFullYear())
      captureYear[y] = (captureYear[y] || 0) + 1
    }

    const t = asset.createdAt ? new Date(asset.createdAt).getTime() : null
    if (t) {
      const age = now - t
      if (age <= 7 * 864e5) uploaded.week = (uploaded.week || 0) + 1
      if (age <= 30 * 864e5) uploaded.month = (uploaded.month || 0) + 1
      if (new Date(t).getFullYear() === currentYear) uploaded.year = (uploaded.year || 0) + 1
      else uploaded.older = (uploaded.older || 0) + 1
    }

    const apRaw = asset.capture?.aperture || asset.capture?.fNumber
    if (apRaw) {
      const f = parseFloat(String(apRaw).replace(/^[fFƒ]\/?/, ''))
      if (!isNaN(f)) {
        if (f < 2) aperture.wide = (aperture.wide || 0) + 1
        else if (f < 4) aperture.mid = (aperture.mid || 0) + 1
        else if (f < 8) aperture.narrow = (aperture.narrow || 0) + 1
        else aperture.closed = (aperture.closed || 0) + 1
      }
    }

    const shRaw = asset.capture?.shutterSpeed || asset.capture?.exposureTime
    if (shRaw) {
      const str = String(shRaw)
      const slash = str.indexOf('/')
      const sec = slash > 0
        ? parseFloat(str.slice(0, slash)) / parseFloat(str.slice(slash + 1))
        : parseFloat(str)
      if (!isNaN(sec)) {
        if (sec < 1/500) shutter.fast = (shutter.fast || 0) + 1
        else if (sec < 1/125) shutter.action = (shutter.action || 0) + 1
        else if (sec < 1/30) shutter.hand = (shutter.hand || 0) + 1
        else shutter.slow = (shutter.slow || 0) + 1
      }
    }

    const isoVal = asset.capture?.iso
    if (isoVal) {
      if (isoVal <= 400) iso.low = (iso.low || 0) + 1
      else if (isoVal <= 1600) iso.mid = (iso.mid || 0) + 1
      else iso.high = (iso.high || 0) + 1
    }
  }

  return { orientation, usage, camera, lens, focalLength, captureYear, uploaded, aperture, shutter, iso }
}

// Sepia placeholder colors (mirrors PhotoTile)
const SEPIA_PLACEHOLDERS = [
  '#e2d9cd', '#d8cfc0', '#ddd4c4', '#cfc4b2',
  '#e8e0d2', '#d4c9b6', '#dbd0be', '#c8baa6',
]

export function placeholderColor(key) {
  let h = 0
  for (let i = 0; i < (key || '').length; i++) {
    h = Math.imul(31, h) + (key.charCodeAt(i) | 0)
  }
  return SEPIA_PLACEHOLDERS[Math.abs(h) % SEPIA_PLACEHOLDERS.length]
}
