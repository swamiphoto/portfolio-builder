// Derivative → original URL rewrites for known platforms. Candidates are
// probed by the import fetcher and silently fall back to the discovered URL,
// so a wrong guess costs one failed request, never a failed import.
export function originalUrlCandidates(url) {
  let u
  try {
    u = new URL(url)
  } catch {
    return []
  }
  const out = []
  if (/squarespace/i.test(u.hostname)) {
    const orig = new URL(u.toString())
    orig.search = ''
    orig.searchParams.set('format', 'original')
    if (orig.toString() !== url) out.push(orig.toString())
  }
  if (/\/wp-content\/uploads\//.test(u.pathname)) {
    const stripped = u.pathname
      .replace(/-\d{2,4}x\d{2,4}(\.\w+)$/, '$1')
      .replace(/-scaled(\.\w+)$/, '$1')
    if (stripped !== u.pathname) out.push(`${u.origin}${stripped}${u.search}`)
  }
  return out
}
