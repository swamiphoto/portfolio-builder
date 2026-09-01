/**
 * Slugify a title into a URL-safe string.
 * Client-safe utility with zero dependencies.
 * @param {string} text
 * @returns {string}
 */
export function slugify(text = '') {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * The effective URL slug for a page: an explicit stored slug, else derived from
 * the title, else the internal id. Mirrors the resolution used when rendering
 * public pages, so uniqueness checks compare the same values routing does.
 * @param {{ slug?: string, title?: string, id?: string }} page
 * @returns {string}
 */
export function effectivePageSlug(page) {
  if (!page) return ''
  return page.slug || slugify(page.title || '') || page.id || ''
}

/**
 * Make `desired` unique against a set of already-taken slugs by appending
 * -2, -3, … until it no longer collides. Two pages sharing a slug make the
 * later one unreachable — Preview and public routing both resolve a slug to
 * the FIRST matching page. The suffix is a starting point the user can rename.
 * @param {string} desired
 * @param {Set<string>|string[]} taken
 * @returns {string}
 */
export function uniqueSlug(desired, taken) {
  const set = taken instanceof Set ? taken : new Set(taken || [])
  const base = desired || 'page'
  if (!set.has(base)) return base
  let n = 2
  while (set.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

/**
 * The big display title shown on a page. Defaults to the page's name (nav
 * title) and tracks it, until the user diverges the hero title — at which
 * point `heroTitle` is stored and takes over. Absent/empty `heroTitle` means
 * "still tracking the name".
 * @param {{ heroTitle?: string, title?: string }} page
 * @returns {string}
 */
export function heroTitleFor(page) {
  if (!page) return ''
  const hero = page.heroTitle
  return hero != null && hero !== '' ? hero : (page.title || '')
}
