// common/exifCapture.js
// Server-side only — extract camera/EXIF capture metadata from an image buffer.
//
// CommonJS on purpose (unlike sibling common/ files, which use ESM import/export
// transpiled by Next): this module is `require`d directly by the plain-Node
// script scripts/backfill-exif.mjs (via createRequire), which can't parse `export`
// syntax. Next/webpack's CJS interop makes `import { extractCapture } from
// './exifCapture'` from ESM common/ files work fine against this shape, the same
// way `import exifr from 'exifr'` already works against exifr's own CJS/UMD build.
//
// Maps exifr's parsed tags to the asset `capture` shape used by
// common/adminConfig.js createAssetRecord (capturedAt, timezone, cameraMake,
// cameraModel, lens, focalLengthMm, aperture, shutterSpeed, iso, locationName,
// latitude, longitude). `timezone` and `locationName` are not derivable from
// EXIF alone and stay null. Never throws — callers can call this unconditionally
// on upload/import without risking the request.

const exifr = require('exifr')

function formatShutterSpeed(exposureTime) {
  if (!exposureTime) return null
  if (exposureTime >= 1) return `${exposureTime}s`
  return `1/${Math.round(1 / exposureTime)}s`
}

function formatAperture(fNumber) {
  if (!fNumber) return null
  return `f/${fNumber}`
}

/**
 * @param {Buffer} buffer - raw image bytes (full file or a leading chunk containing EXIF)
 * @returns {Promise<object|null>} the capture shape, or null if no EXIF was found / parsing failed
 */
async function extractCapture(buffer) {
  try {
    const data = await exifr.parse(buffer, {
      tiff: true,
      exif: true,
      gps: true,
      iptc: false,
      xmp: false,
      icc: false,
      jfif: false,
      ihdr: false,
    })
    if (!data) return null

    return {
      capturedAt: data.DateTimeOriginal?.toISOString() || data.CreateDate?.toISOString() || null,
      timezone: null,
      cameraMake: data.Make?.trim() || null,
      cameraModel: data.Model?.trim() || null,
      lens: data.LensModel?.trim() || data.Lens?.trim() || null,
      focalLengthMm: data.FocalLength || null,
      aperture: formatAperture(data.FNumber),
      shutterSpeed: formatShutterSpeed(data.ExposureTime),
      iso: data.ISO || null,
      locationName: null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
    }
  } catch {
    return null
  }
}

module.exports = { extractCapture, formatShutterSpeed, formatAperture }
