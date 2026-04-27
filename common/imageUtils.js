// Client-safe image URL helpers. No secrets, no server imports.

// Returns the appropriate sized URL for a given context.
// 'thumbnail' → 600px  (library grid tiles)
// 'display'   → 1800px (page galleries, lightbox)
// 'original'  → full resolution (downloads, printing)
export function getSizedUrl(publicUrl, size = 'display') {
  if (!publicUrl || size === 'original') return publicUrl
  // Only apply to our R2 URLs — pass through anything else unchanged
  if (!publicUrl.includes('/photos/')) return publicUrl
  const folder = size === 'thumbnail' ? 'thumbnails' : size
  return publicUrl
    .replace('/photos/', `/${folder}/`)
    .replace(/\.[^.]+$/, '.jpg')
}
