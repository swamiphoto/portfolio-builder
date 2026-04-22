import { slugify } from './pageUtils'

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
    const normalizeBtn = (b) =>
      b && b.label ? { label: b.label, href: b.href || '', style: b.style === 'solid' ? 'solid' : 'outline' } : null

    let buttons
    if (Array.isArray(cover.buttons)) {
      buttons = cover.buttons.map(normalizeBtn).filter(Boolean)
    } else if (cover.buttons === undefined && (cover.primaryCta || cover.secondaryCta)) {
      // Migrate legacy primaryCta/secondaryCta
      const legacy = [
        cover.primaryCta?.label ? normalizeBtn({ label: cover.primaryCta.label, href: cover.primaryCta.href, style: 'solid' }) : null,
        cover.secondaryCta?.label ? normalizeBtn({ label: cover.secondaryCta.label, href: cover.secondaryCta.href, style: 'outline' }) : null,
      ].filter(Boolean)
      buttons = legacy
    } else {
      buttons = []
    }

    cover = {
      imageUrl: cover.imageUrl || "",
      height: cover.height === "partial" ? "partial" : "full",
      overlayText: cover.overlayText || "",
      variant: cover.variant === "cover" ? "cover" : "showcase",
      buttons,
    };
  }

  const slug = page.slug || slugify(page.title || '') || page.id || ''

  return {
    ...page,
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
