// Server-side only — never import from client components.
import { downloadJSON, uploadJSON } from './gcsClient'
import { getUserSiteConfigPath } from './gcsUser'

/**
 * Slugify a title into a URL-safe page ID.
 * @param {string} title
 * @param {string} [suffix] - optional suffix to append (e.g. '-2' for dedup)
 * @returns {string}
 */
export function generatePageId(title, suffix = '') {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') + suffix
}

/**
 * Create the default site config for a brand-new user.
 * @param {string} userId - Google OAuth sub
 * @returns {SiteConfig}
 */
export function createDefaultSiteConfig(userId) {
  return {
    userId,
    siteName: 'My Portfolio',
    slug: '',
    theme: 'minimal-light',
    customDomain: null,
    publishedAt: null,
    pages: [
      {
        id: 'cover',
        type: 'cover',
        title: 'Home',
        showInNav: false,
        blocks: [],
      },
    ],
  }
}

/**
 * Read the site config for a user from R2.
 * Returns null if the config doesn't exist yet.
 * @param {string} userId
 * @returns {Promise<SiteConfig|null>}
 */
export async function readSiteConfig(userId) {
  try {
    return await downloadJSON(getUserSiteConfigPath(userId))
  } catch (err) {
    // Only treat "file doesn't exist yet" as a normal case
    if (err?.name === 'NoSuchKey' || err?.Code === 'NoSuchKey') return null
    throw err
  }
}

/**
 * Write the site config for a user to R2.
 * @param {string} userId
 * @param {SiteConfig} config
 */
export async function writeSiteConfig(userId, config) {
  await uploadJSON(getUserSiteConfigPath(userId), config)
}
