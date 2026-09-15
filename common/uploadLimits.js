// Upload limits — kept dependency-free (no @aws-sdk/sharp) so both API routes and
// tests can import it cheaply.
//
// We keep the uploaded JPEG original as-is (it doubles as the print master, so
// photographers don't re-upload a print version), so the cap just needs to fit a
// full-res camera JPEG — 50MB covers ~100MP bodies. Bump if a medium-format
// shooter needs more.
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

// Web-displayable formats only. RAW/TIFF/PSD are rejected: RAW can't render in a
// browser at all, and TIFF/PSD are huge and non-web. The client content-type is a
// fast first gate (upload-url); finalize re-checks the ACTUAL decoded format.
export const ACCEPTED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

// The formats sharp reports for our accepted types (HEIC decodes as 'heif'). Used
// by finalize to reject anything whose real bytes aren't a web format.
export const ACCEPTED_SHARP_FORMATS = new Set(['jpeg', 'png', 'webp', 'heif'])

export function isAcceptedUploadType(contentType) {
  const t = String(contentType || '').toLowerCase().split(';')[0].trim()
  return ACCEPTED_UPLOAD_TYPES.includes(t)
}
