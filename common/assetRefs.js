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

export function pageDisplayThumbnail(page) {
  if (page.thumbnail?.useCover) return page.cover?.imageUrl || ''
  return page.thumbnail?.imageUrl || page.thumbnailUrl || ''
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
    cover = {
      imageUrl: cover.imageUrl || "",
      height: cover.height === "partial" ? "partial" : "full",
      overlayText: cover.overlayText || "",
    };
  }

  return {
    ...page,
    parentId: page.parentId ?? null,
    showInNav: page.showInNav ?? true,
    sortOrder: page.sortOrder ?? 0,
    password: page.password || "",
    cover,
    thumbnail,
    thumbnailUrl: thumbnail.imageUrl, // legacy mirror, derived
    slideshow: {
      enabled: page.slideshow?.enabled ?? false,
      layout: page.slideshow?.layout || "kenburns",
      musicUrl: page.slideshow?.musicUrl || "",
    },
    clientFeatures: {
      enabled: page.clientFeatures?.enabled ?? false,
      passwordHash: page.clientFeatures?.passwordHash || "",
      watermarkEnabled: page.clientFeatures?.watermarkEnabled ?? false,
      votingEnabled: page.clientFeatures?.votingEnabled ?? false,
      downloadEnabled: page.clientFeatures?.downloadEnabled ?? false,
    },
    blocks: (page.blocks || []).map((block) => normalizeBlockImageFields(block)),
  };
}
