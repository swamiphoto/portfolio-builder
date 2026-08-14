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
