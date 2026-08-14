// Server-side only — never import from client components.
import { downloadJSON, uploadJSON } from './gcsClient'
import { normalizePageEntity } from './assetRefs'
import { getUserSiteConfigPath } from './gcsUser'
import { slugify } from './pageUtils'
import { defaultBlock } from './blocks'
import { migrateSiteConfigThemes } from './themes/migrate'

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
 * Create the default site config for a brand-new user. Seeds the site name from
 * the person's profile name and the tagline from their bio, so a fresh cover reads
 * as *theirs* ("Jane Rivera") rather than a generic "My Portfolio".
 * @param {string} userId - Google OAuth sub
 * @param {{ displayName?: string, bio?: string }} [profile]
 * @returns {SiteConfig}
 */
export function createDefaultSiteConfig(userId, { displayName, bio } = {}) {
  const siteName = (displayName && displayName.trim()) || 'My Portfolio'
  const tagline = (bio && bio.trim()) || ''
  return {
    userId,
    siteName,
    slug: '',
    hasCoverPage: true,
    customDomain: null,
    tagline,
    logoType: 'sitename',
    logoFont: 'theme',
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
      theme: 'kyoto',
      navStyle: 'links',
      subNavStyle: 'dropdown',
      footerLayout: 'simple',
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
      customText: `© ${new Date().getFullYear()} ${siteName}`,
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
    printStore: {
      enabled: false,
      markup: 3,
      showPriceOnImage: false,
      currency: 'USD',
      stripeConnectAccountId: null,
      platformFeePct: 0,
      chargesEnabled: false,
    },
    publishedAt: null,
    pages: [],
  }
}

/**
 * Return the starter blocks for a page template. Templates are a UX-only
 * concept — they seed initial blocks but don't persist on the page object.
 * Unknown or absent template → empty array (caller can add blocks manually).
 */
export function seedBlocksForTemplate(template) {
  switch (template) {
    case 'story':
      // A photo essay — a scaffold showing the range of blocks a story can mix.
      return [
        defaultBlock('stacked'),
        { ...defaultBlock('text'), variant: 1 },  // heading
        { ...defaultBlock('photo'), variant: 1 },  // full bleed
        defaultBlock('masonry'),
        { ...defaultBlock('photo'), variant: 2 },  // centered
        defaultBlock('video'),  // centered (default)
      ]
    case 'gallery':
      return [
        defaultBlock('masonry'),
        { ...defaultBlock('photo'), variant: 2 },  // single centered
        defaultBlock('stacked'),
      ]
    case 'collection':
      return [defaultBlock('page-gallery')]
    case 'about':
      return [
        { ...defaultBlock('photo'), variant: 2 },  // centered portrait
        { ...defaultBlock('text'), variant: 1 },  // heading
        { ...defaultBlock('text'), variant: 3 },  // body
      ]
    case 'contact':
      return [defaultBlock('contact')]
    case 'text':
      // Legacy template, no longer offered in the menu; kept for back-compat.
      return [
        { ...defaultBlock('text'), variant: 1 },  // heading
        { ...defaultBlock('text'), variant: 3 },  // paragraph
      ]
    case 'blank':
    default:
      return []
  }
}

// Default page name for a template. A blank page (or unknown template) has no
// natural name, so it stays "Untitled" for the user to fill in.
const TEMPLATE_TITLES = { story: 'Story', gallery: 'Gallery', collection: 'Collection', about: 'About', contact: 'Contact' }
export function titleForTemplate(template) {
  return TEMPLATE_TITLES[template] || 'Untitled'
}

export function defaultPage(overrides = {}) {
  const { template, ...rest } = overrides
  const blocks = rest.blocks ?? seedBlocksForTemplate(template)
  return {
    id: rest.id || 'page',
    title: rest.title || 'New Page',
    type: 'page',
    kind: rest.kind ?? template ?? null,
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
      watermark: { enabled: false },
      purchase: { enabled: false, freeAllowance: 0, packages: [] },
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

export function normalizePrintStore(config = {}) {
  const ps = (config && config.printStore) || {}
  return {
    ...config,
    printStore: {
      enabled: ps.enabled ?? false,
      markup: typeof ps.markup === 'number' && ps.markup > 0 ? ps.markup : 3,
      showPriceOnImage: ps.showPriceOnImage ?? false,
      currency: ps.currency || 'USD',
      stripeConnectAccountId: ps.stripeConnectAccountId ?? null,
      platformFeePct: typeof ps.platformFeePct === 'number' ? ps.platformFeePct : 0,
      chargesEnabled: ps.chargesEnabled ?? false,
    },
  }
}

// Legacy configs created before the seeded-page removal still carry a hidden
// `home` page ({ id:'home', showInNav:false }) that used to be filtered out of
// the UI. Drop it on read so those sites start clean (pages:[]), matching new
// sites. Only removes the empty, hidden, unpinned seed — never a page the user
// pinned as home or filled with content.
export function dropSeededHomePage(config) {
  const pages = config?.pages || []
  const i = pages.findIndex(
    (p) => p.id === 'home' && p.showInNav === false && (p.blocks?.length || 0) === 0
  )
  if (i === -1) return config
  if (config.homePageId === pages[i].id) return config
  return { ...config, pages: pages.filter((_, idx) => idx !== i) }
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
    return migrateSiteConfigThemes(normalizePrintStore(dropSeededHomePage({
      ...config,
      pages: (config.pages || []).map((page) => normalizePageEntity(page)),
    })))
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
