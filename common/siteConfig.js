// Server-side only — never import from client components.
import { downloadJSON, uploadJSON } from './gcsClient'
import { normalizePageEntity } from './assetRefs'
import { getUserSiteConfigPath } from './gcsUser'
import { slugify } from './pageUtils'
import { defaultBlock } from './blocks'

/**
 * Slugify a title into a URL-safe page ID.
 * @param {string} title
 * @param {string} [suffix] - optional suffix to append (e.g. '-2' for dedup)
 * @returns {string}
 */
export function generatePageId(title, suffix = '') {
  return slugify(title) + suffix
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
    hasCoverPage: true,
    customDomain: null,
    tagline: '',
    logoType: 'sitename',
    logo: '',
    favicon: '',
    cover: {
      heading: '',
      subheading: '',
      buttonText: 'View my portfolio',
      imageUrl: '',
      height: 'full',
      buttonStyle: 'solid',
    },
    homePageId: null,
    share: {
      largeImage: '',
      squareImage: '',
    },
    design: {
      theme: 'minimal-light',
      navStyle: 'minimal',
      subNavStyle: 'dropdown',
      footerLayout: 'standard',
    },
    contact: {
      email: '',
      instagram: '',
      facebook: '',
      twitter: '',
      tiktok: '',
      youtube: '',
      website: '',
    },
    footer: {
      customText: `© ${new Date().getFullYear()} My Portfolio`,
    },
    analytics: {
      googleId: '',
      plausibleDomain: '',
    },
    clientDefaults: {
      notificationEmail: '',
      defaultCurrency: 'USD',
      defaultWatermarkUrl: '',
    },
    publishedAt: null,
    pages: [
      defaultPage({ id: 'home', title: 'Home', showInNav: false }),
    ],
  }
}

/**
 * Return the starter blocks for a page template. Templates are a UX-only
 * concept — they seed initial blocks but don't persist on the page object.
 * Unknown or absent template → empty array (caller can add blocks manually).
 */
export function seedBlocksForTemplate(template) {
  switch (template) {
    case 'gallery':
      return [defaultBlock('masonry')]
    case 'collection':
      return [defaultBlock('page-gallery')]
    case 'about':
      return [
        defaultBlock('text'),
        { ...defaultBlock('text'), variant: 2 },
      ]
    default:
      return []
  }
}

export function defaultPage(overrides = {}) {
  const { template, ...rest } = overrides
  const blocks = rest.blocks ?? seedBlocksForTemplate(template)
  return {
    id: rest.id || 'page',
    title: rest.title || 'New Page',
    type: 'page',
    description: '',
    slug: rest.id || 'page',
    parentId: null,
    showInNav: rest.showInNav ?? true,
    sortOrder: rest.sortOrder ?? 0,
    password: '',
    cover: null,
    thumbnail: { imageUrl: '', useCover: true },
    thumbnailUrl: '', // legacy mirror; kept for back-compat with normalizers
    slideshow: {
      enabled: false,
      layout: 'kenburns',
      musicUrl: '',
    },
    clientFeatures: {
      enabled: false,
      downloads: { enabled: false, quality: ['web'], requireEmail: false, watermarkEnabled: false },
      favorites: { enabled: false, requireEmail: false, submitWorkflow: false },
      comments: { enabled: false, requireEmail: false },
      purchase: { enabled: false, defaultPrice: null, currency: 'USD', tiers: { web: null, print: null, original: null } },
    },
    passwordGateMessage: '',
    blocks,
    ...rest,
  }
}

export function defaultLink(overrides = {}) {
  return {
    id: overrides.id || 'link',
    title: overrides.title || 'New Link',
    type: 'link',
    url: '',
    slug: overrides.id || 'link',
    parentId: null,
    showInNav: overrides.showInNav ?? true,
    sortOrder: overrides.sortOrder ?? 0,
    blocks: [],
    ...overrides,
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
    const config = await downloadJSON(getUserSiteConfigPath(userId))
    return {
      ...config,
      pages: (config.pages || []).map((page) => normalizePageEntity(page)),
    }
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
  await uploadJSON(getUserSiteConfigPath(userId), {
    ...config,
    pages: (config.pages || []).map((page) => normalizePageEntity(page)),
  })
}
