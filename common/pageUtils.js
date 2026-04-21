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
