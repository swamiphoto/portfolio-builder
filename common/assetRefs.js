import { slugify } from './pageUtils'

const BUTTON_TYPES = ['url', 'slideshow', 'client-login']
const BUTTON_STYLES = ['solid', 'outline', 'ghost']

const normalizeBtn = (b) => {
  if (!b?.label) return null
  return {
    id: b.id,
    type: BUTTON_TYPES.includes(b.type) ? b.type : 'url',
    label: b.label,
    href: b.href || '',
  }
}

export function normalizeImageRef(value) {
  if (!value) return null;

  if (typeof value === "string") {
    return value ? { assetId: null, url: value } : null;
  }

  if (typeof value !== "object") return null;

  const url = value.url || value.publicUrl || value.imageUrl || "";
  if (!url) return null;

  const ref = { assetId: value.assetId || null, url };
  if (value.caption !== undefined) ref.caption = value.caption;
  return ref;
}

export function normalizeImageRefs(values = []) {
  return (values || [])
    .map((value) => normalizeImageRef(value))
    .filter(Boolean);
}

export function getImageRefUrl(value) {
  return normalizeImageRef(value)?.url || "";
}

export function getImageRefAssetId(value) {
  return normalizeImageRef(value)?.assetId || null;
}

export function getImageRefKey(value) {
  const ref = normalizeImageRef(value);
  if (!ref) return null;
  return ref.assetId || ref.url;
}

export function mergeImageRefs(existing = [], incoming = []) {
  const merged = [];
  const seen = new Set();

  for (const ref of [...normalizeImageRefs(existing), ...normalizeImageRefs(incoming)]) {
    const key = getImageRefKey(ref);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(ref);
  }

  return merged;
}

export function removeImageRef(values = [], target) {
  const targetKey = getImageRefKey(target);
  if (!targetKey) return normalizeImageRefs(values);
  return normalizeImageRefs(values).filter((ref) => getImageRefKey(ref) !== targetKey);
}

export function buildSingleImageFields(ref) {
  const image = normalizeImageRef(ref);
  return {
    image,
    imageUrl: image?.url || "",
  };
}

export function buildMultiImageFields(refs) {
  const images = normalizeImageRefs(refs);
  return {
    images,
    imageUrls: images.map((ref) => ref.url),
  };
}

export function normalizeBlockImageFields(block) {
  if (!block || typeof block !== "object") return block;

  if (block.type === "photo") {
    return {
      ...block,
      ...buildSingleImageFields(block.image || block.imageUrl),
      clientOnly: block.clientOnly ?? false,
    };
  }

  if (block.type === "photos" || block.type === "stacked" || block.type === "masonry") {
    return {
      ...block,
      ...buildMultiImageFields(block.images || block.imageUrls || []),
      clientOnly: block.clientOnly ?? false,
    };
  }

  return {
    ...block,
    clientOnly: block.clientOnly ?? false,
  };
}

export function normalizeGalleryEntity(gallery) {
  if (!gallery || typeof gallery !== "object") return gallery;

  const thumbnail = normalizeImageRef(gallery.thumbnail || gallery.thumbnailUrl);
  const slideshowCover = normalizeImageRef(
    gallery.slideshowSettings?.coverImage || gallery.slideshowSettings?.coverImageUrl
  );

  return {
    ...gallery,
    thumbnail,
    thumbnailUrl: thumbnail?.url || "",
    slideshowSettings: gallery.slideshowSettings
      ? {
          ...gallery.slideshowSettings,
          coverImage: slideshowCover,
          coverImageUrl: slideshowCover?.url || "",
        }
      : gallery.slideshowSettings,
    blocks: (gallery.blocks || []).map((block) => normalizeBlockImageFields(block)),
  };
}

export function getPagePhotos(page) {
  const urls = []
  for (const block of page.blocks || []) {
    if (block.type === 'photo' && block.imageUrl) {
      urls.push(block.imageUrl)
    } else if (block.images?.length) {
      for (const img of block.images) {
        const url = img?.url || img?.imageUrl || (typeof img === 'string' ? img : null)
        if (url) urls.push(url)
      }
    } else if (block.imageUrls?.length) {
      for (const url of block.imageUrls) {
        if (url) urls.push(url)
      }
    }
  }
  return [...new Set(urls)]
}

/**
 * Return gallery-kind pages whose `parentId` matches the given parent page ID.
 * Used by page-gallery blocks in 'auto' mode.
 */
export function getNestedGalleries(parentPageId, pages) {
  if (!parentPageId || !pages?.length) return []
  return pages.filter(p => p.parentId === parentPageId && p.kind === 'gallery')
}

// Warm sepia gradients assigned to pages that have no cover image.
// Deterministic per page ID so the color is stable across renders.
const SEPIA_GRADIENTS = [
  'linear-gradient(135deg, #b87a6e 0%, #c9856e 40%, #d3a07a 100%)', // sunset
  'linear-gradient(160deg, #4a3a52 0%, #6b5560 50%, #8a6f5e 100%)', // pier
  'linear-gradient(150deg, #7a6b8c 0%, #9e8a9e 50%, #c0a99e 100%)', // lavender
  'linear-gradient(140deg, #8a4a3a 0%, #b56a4e 45%, #d39a7a 100%)', // desert
  'linear-gradient(150deg, #7a3a26 0%, #a85a3a 50%, #c98e6e 100%)', // canyon
  'linear-gradient(160deg, #2e3a2a 0%, #4a5a3a 50%, #7a8a5e 100%)', // forest
  'linear-gradient(150deg, #6e7e8c 0%, #98a8b4 50%, #c8d2d8 100%)', // ice
]

export function pageThumbGradient(pageId) {
  if (!pageId) return SEPIA_GRADIENTS[0]
  let h = 0
  for (let i = 0; i < pageId.length; i++) h = (h * 31 + pageId.charCodeAt(i)) >>> 0
  return SEPIA_GRADIENTS[h % SEPIA_GRADIENTS.length]
}

export function pageDisplayThumbnail(page) {
  const explicit = page.thumbnail?.imageUrl
  if (explicit && !page.thumbnail?.useCover) return explicit
  const coverImg = page.cover?.imageUrl
  if (coverImg) return coverImg
  if (explicit) return explicit
  if (page.thumbnailUrl) return page.thumbnailUrl
  return getPagePhotos(page)[0] || ''
}

export function normalizePageEntity(page) {
  if (!page || typeof page !== "object") return page;

  // Back-compat: thumbnail used to be an image ref (or null). Detect and migrate.
  let thumbnail = page.thumbnail;
  if (!thumbnail || typeof thumbnail !== "object" || "url" in thumbnail) {
    const ref = normalizeImageRef(page.thumbnail || page.thumbnailUrl);
    thumbnail = { imageUrl: ref?.url || "", useCover: !ref };
  } else {
    thumbnail = {
      imageUrl: thumbnail.imageUrl || "",
      useCover: thumbnail.useCover ?? true,
    };
  }

  let cover = page.cover || null;
  if (cover) {
    let buttons
    if (Array.isArray(cover.buttons)) {
      buttons = cover.buttons.map(normalizeBtn).filter(Boolean)
    } else if (cover.buttons === undefined && (cover.primaryCta || cover.secondaryCta)) {
      buttons = [
        cover.primaryCta?.label ? { type: 'url', label: cover.primaryCta.label, href: cover.primaryCta.href || '' } : null,
        cover.secondaryCta?.label ? { type: 'url', label: cover.secondaryCta.label, href: cover.secondaryCta.href || '' } : null,
      ].filter(Boolean)
    } else {
      buttons = []
    }

    const buttonStyle = BUTTON_STYLES.includes(cover.buttonStyle) ? cover.buttonStyle : 'solid'

    cover = {
      imageUrl: cover.imageUrl || "",
      height: cover.height === "partial" ? "partial" : "full",
      overlayText: cover.overlayText || "",
      variant: cover.variant === "cover" ? "cover" : "showcase",
      buttons,
      buttonStyle,
    };
  }

  const slug = page.slug || slugify(page.title || '') || page.id || ''

  // Infer kind for pages created before the kind field existed
  let kind = page.kind
  if (!kind && Array.isArray(page.blocks)) {
    if (page.blocks.some(b => b.type === 'page-gallery')) kind = 'collection'
  }

  return {
    ...page,
    kind,
    type: page.type === 'link' ? 'link' : 'page',
    slug,
    url: page.url || '',
    parentId: page.parentId ?? null,
    showInNav: page.showInNav ?? true,
    sortOrder: page.sortOrder ?? 0,
    password: page.password || "",
    passwordGateMessage: page.passwordGateMessage || '',
    cover,
    thumbnail,
    thumbnailUrl: thumbnail.imageUrl, // legacy mirror, derived
    slideshow: {
      enabled: page.slideshow?.enabled ?? false,
      layout: page.slideshow?.layout || "kenburns",
      musicUrl: page.slideshow?.musicUrl || "",
    },
    clientFeatures: (() => {
      const cf = page.clientFeatures || {}
      return {
        enabled: cf.enabled ?? false,
        downloads: {
          enabled: cf.downloads?.enabled ?? cf.downloadEnabled ?? false,
          quality: cf.downloads?.quality ?? ['web'],
          requireEmail: cf.downloads?.requireEmail ?? false,
          watermarkEnabled: cf.downloads?.watermarkEnabled ?? cf.watermarkEnabled ?? false,
        },
        favorites: {
          enabled: cf.favorites?.enabled ?? cf.votingEnabled ?? false,
          requireEmail: cf.favorites?.requireEmail ?? false,
          submitWorkflow: cf.favorites?.submitWorkflow ?? false,
        },
        comments: {
          enabled: cf.comments?.enabled ?? false,
          requireEmail: cf.comments?.requireEmail ?? false,
        },
        purchase: {
          enabled: cf.purchase?.enabled ?? false,
          defaultPrice: cf.purchase?.defaultPrice ?? null,
          currency: cf.purchase?.currency ?? 'USD',
          tiers: cf.purchase?.tiers ?? { web: null, print: null, original: null },
        },
      }
    })(),
    blocks: (page.blocks || []).map((block) => normalizeBlockImageFields(block)),
  };
}
