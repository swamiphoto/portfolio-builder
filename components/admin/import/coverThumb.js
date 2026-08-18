// components/admin/import/coverThumb.js
// Import covers come from arbitrary source sites (a custom photography site, a
// SmugMug CDN, etc.). Many serve only full-resolution originals — a single cover
// can be several MB — which makes the review/showcase covers "curtain in" slowly
// even though they render at 40–400px. When discovery already surfaced a small
// size variant we use it; otherwise we route the original through wsrv.nl, a free
// image-resizing proxy, so the browser only ever downloads a tiny thumbnail.
//
// Chosen over Next's /_next/image because that runs on Vercel's metered Image
// Optimization (monthly transform caps + cost) — a bad fit for dozens of throwaway
// cover thumbnails per import. wsrv is purpose-built for resizing arbitrary remote
// images and adds no load/SSRF surface to our own infra. Callers fall back to the
// raw URL if the proxy ever fails (see onCoverError), so covers degrade gracefully.

// Only proxy real http(s) source URLs. Leave data:/blob: and already-tiny values
// untouched.
function isRemote(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url)
}

// A small, square-ish thumbnail of a remote cover. `px` is the pixel box we want
// to fill (device-pixel-doubled by the caller when it matters).
export function coverThumbUrl(url, px = 120) {
  if (!isRemote(url)) return url
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${px}&h=${px}&fit=cover&output=webp&q=72`
}

// A wider thumbnail for the import showcase, which renders prints up to ~300px.
export function showcaseThumbUrl(url, px = 480) {
  if (!isRemote(url)) return url
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${px}&output=webp&q=74`
}

// onError handler factory: on the first failure swap to the raw source URL (proxy
// hiccup → still shows, just heavier); on a second failure, run onGiveUp so the
// caller can hide the broken cover. `raw` is the original (un-proxied) URL.
export function onCoverError(raw, onGiveUp) {
  return (e) => {
    const img = e.currentTarget
    if (isRemote(raw) && img.dataset.fell !== '1' && img.src !== raw) {
      img.dataset.fell = '1'
      img.src = raw
    } else {
      onGiveUp && onGiveUp()
    }
  }
}
