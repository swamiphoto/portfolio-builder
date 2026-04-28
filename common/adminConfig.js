// Server-side only — never import from client components.
import { downloadJSON } from './gcsClient'
import { getUserLibraryConfigPath } from './gcsUser'

export const LIBRARY_CONFIG_VERSION = 2;

/**
 * Read the library config for a user from R2.
 * Returns an empty config if the file doesn't exist yet.
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function readLibraryConfig(userId) {
  try {
    return await downloadJSON(getUserLibraryConfigPath(userId))
  } catch (err) {
    if (err?.name === 'NoSuchKey' || err?.Code === 'NoSuchKey') return { assets: {} }
    throw err
  }
}

function uniqueStrings(values = []) {
  return [...new Set((values || []).filter((value) => typeof value === "string" && value.trim()))];
}

function normalizeLegacySection(section = {}) {
  const normalized = {};
  for (const [key, urls] of Object.entries(section || {})) {
    normalized[key] = uniqueStrings(urls);
  }
  return normalized;
}

function normalizeCollections(collections = {}) {
  const normalized = {};
  for (const [collectionId, collection] of Object.entries(collections || {})) {
    if (!collection || typeof collection !== "object") continue;
    normalized[collectionId] = {
      collectionId,
      name: collection.name || collectionId,
      kind: collection.kind || "manual",
      assetIds: uniqueStrings(collection.assetIds),
      rule: collection.rule || null,
      createdAt: collection.createdAt || null,
      updatedAt: collection.updatedAt || null,
    };
  }
  return normalized;
}

function normalizeSavedViews(savedViews = {}) {
  const normalized = {};
  for (const [viewId, view] of Object.entries(savedViews || {})) {
    if (!view || typeof view !== "object") continue;
    normalized[viewId] = {
      name: view.name || viewId,
      filters: view.filters && typeof view.filters === "object" ? view.filters : {},
    };
  }
  return normalized;
}

function extractStorageKeyFromUrl(url) {
  if (!url || typeof url !== "string") return "";

  try {
    const parsed = new URL(url);
    return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  } catch {
    return url;
  }
}

function inferOrientation(width, height) {
  if (!width || !height) return "unknown";
  if (width === height) return "square";
  return width > height ? "landscape" : "portrait";
}

function stableHash(input) {
  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36).padStart(7, "0");
}

export function createAssetIdFromUrl(url) {
  return `ast_${stableHash(url || "unknown")}`;
}

function normalizeImageRecord(image) {
  if (typeof image === "string") {
    return {
      url: image,
      name: extractStorageKeyFromUrl(image),
      timeCreated: null,
      updated: null,
      size: 0,
      width: null,
      height: null,
      mimeType: null,
    };
  }

  if (!image || typeof image !== "object" || !image.url) {
    return null;
  }

  return {
    url: image.url,
    name: image.name || extractStorageKeyFromUrl(image.url),
    timeCreated: image.timeCreated ?? null,
    updated: image.updated ?? null,
    size: image.size ?? 0,
    width: image.width ?? null,
    height: image.height ?? null,
    mimeType: image.mimeType ?? null,
  };
}

function normalizeUsage(usage = {}) {
  const cover = Boolean(usage.cover);
  const pageIds = uniqueStrings(usage.pageIds);
  const galleryIds = uniqueStrings(usage.galleryIds);
  const blockIds = uniqueStrings(usage.blockIds);

  return {
    cover,
    pageIds,
    galleryIds,
    blockIds,
    usageCount: (cover ? 1 : 0) + pageIds.length + galleryIds.length + blockIds.length,
    lastUsedAt: usage.lastUsedAt || null,
  };
}

function buildUsageForUrl(imageUrl, portfolios, galleries, existingUsage = {}) {
  const pageIds = [
    ...(existingUsage.pageIds || []),
    ...Object.entries(portfolios)
      .filter(([, urls]) => urls.includes(imageUrl))
      .map(([key]) => key),
  ];

  const galleryIds = [
    ...(existingUsage.galleryIds || []),
    ...Object.entries(galleries)
      .filter(([, urls]) => urls.includes(imageUrl))
      .map(([key]) => key),
  ];

  return normalizeUsage({
    ...existingUsage,
    pageIds,
    galleryIds,
  });
}

function createAssetRecord(assetId, imageRecord, existingAsset = {}, portfolios = {}, galleries = {}) {
  const publicUrl = existingAsset.publicUrl || imageRecord.url;
  const width = imageRecord.width ?? existingAsset.width ?? null;
  const height = imageRecord.height ?? existingAsset.height ?? null;
  const storageKey = existingAsset.storageKey || extractStorageKeyFromUrl(publicUrl);
  const bytes = imageRecord.size > 0 ? imageRecord.size : existingAsset.bytes ?? 0;
  const orientation =
    existingAsset.orientation && existingAsset.orientation !== "unknown"
      ? existingAsset.orientation
      : inferOrientation(width, height);

  return {
    assetId,
    storageKey,
    publicUrl,
    originalFilename: existingAsset.originalFilename || imageRecord.name || storageKey,
    mimeType: existingAsset.mimeType || imageRecord.mimeType || null,
    bytes,
    width,
    height,
    aspectRatio: width && height ? Number((width / height).toFixed(4)) : null,
    orientation,
    caption: existingAsset.caption || "",
    alt: existingAsset.alt || "",
    tags: uniqueStrings(existingAsset.tags),
    collectionIds: uniqueStrings(existingAsset.collectionIds),
    forSale: existingAsset.forSale ?? false,
    source: {
      type: existingAsset.source?.type || "upload",
      provider: existingAsset.source?.provider || "manual",
      label: existingAsset.source?.label ?? null,
      sourceUrl: existingAsset.source?.sourceUrl ?? null,
      importBatchId: existingAsset.source?.importBatchId ?? null,
      externalAssetId: existingAsset.source?.externalAssetId ?? null,
      externalCollectionId: existingAsset.source?.externalCollectionId ?? null,
      syncMode: existingAsset.source?.syncMode ?? null,
      lastSyncedAt: existingAsset.source?.lastSyncedAt ?? null,
    },
    capture: {
      capturedAt: existingAsset.capture?.capturedAt ?? null,
      timezone: existingAsset.capture?.timezone ?? null,
      cameraMake: existingAsset.capture?.cameraMake ?? null,
      cameraModel: existingAsset.capture?.cameraModel ?? null,
      lens: existingAsset.capture?.lens ?? null,
      focalLengthMm: existingAsset.capture?.focalLengthMm ?? null,
      aperture: existingAsset.capture?.aperture ?? null,
      shutterSpeed: existingAsset.capture?.shutterSpeed ?? null,
      iso: existingAsset.capture?.iso ?? null,
      locationName: existingAsset.capture?.locationName ?? null,
      latitude: existingAsset.capture?.latitude ?? null,
      longitude: existingAsset.capture?.longitude ?? null,
    },
    hashes: {
      exact: existingAsset.hashes?.exact ?? null,
      perceptual: existingAsset.hashes?.perceptual ?? null,
    },
    duplicateStatus: {
      exactOf: existingAsset.duplicateStatus?.exactOf ?? null,
      possibleDuplicateIds: uniqueStrings(existingAsset.duplicateStatus?.possibleDuplicateIds),
    },
    usage: buildUsageForUrl(publicUrl, portfolios, galleries, existingAsset.usage),
    createdAt: existingAsset.createdAt || imageRecord.timeCreated || null,
    updatedAt: existingAsset.updatedAt || imageRecord.updated || imageRecord.timeCreated || null,
  };
}

export function createEmptyLibraryConfig() {
  return {
    version: LIBRARY_CONFIG_VERSION,
    assets: {},
    assetOrder: [],
    collections: {},
    savedViews: {},
    portfolios: {},
    galleries: {},
  };
}

/**
 * Returns an empty library config for new users.
 * The old seedConfig seeded from hardcoded static site data — not applicable
 * in the multi-tenant platform where each user starts fresh.
 */
export async function seedConfig() {
  return createEmptyLibraryConfig();
}

export function normalizeLibraryConfig(config = {}, allImages = []) {
  const raw = config && typeof config === "object" ? config : {};
  const normalized = {
    ...createEmptyLibraryConfig(),
    version: LIBRARY_CONFIG_VERSION,
    portfolios: normalizeLegacySection(raw.portfolios),
    galleries: normalizeLegacySection(raw.galleries),
    collections: normalizeCollections(raw.collections),
    savedViews: normalizeSavedViews(raw.savedViews),
  };

  const seenAssetIds = new Set();
  const assetIdsByUrl = new Map();

  for (const [key, asset] of Object.entries(raw.assets || {})) {
    if (!asset || typeof asset !== "object") continue;

    const publicUrl = asset.publicUrl || asset.url;
    if (!publicUrl) continue;

    const assetId = asset.assetId || key || createAssetIdFromUrl(publicUrl);
    const imageRecord = normalizeImageRecord({
      url: publicUrl,
      name: asset.originalFilename || asset.storageKey || extractStorageKeyFromUrl(publicUrl),
      timeCreated: asset.createdAt || null,
      updated: asset.updatedAt || null,
      size: asset.bytes ?? 0,
      width: asset.width ?? null,
      height: asset.height ?? null,
      mimeType: asset.mimeType ?? null,
    });

    normalized.assets[assetId] = createAssetRecord(
      assetId,
      imageRecord,
      asset,
      normalized.portfolios,
      normalized.galleries
    );
    assetIdsByUrl.set(publicUrl, assetId);

    if (!seenAssetIds.has(assetId)) {
      normalized.assetOrder.push(assetId);
      seenAssetIds.add(assetId);
    }
  }

  for (const image of allImages || []) {
    const imageRecord = normalizeImageRecord(image);
    if (!imageRecord) continue;

    const existingAssetId = assetIdsByUrl.get(imageRecord.url);
    const assetId = existingAssetId || createAssetIdFromUrl(imageRecord.url);
    const existingAsset = normalized.assets[assetId] || {};

    normalized.assets[assetId] = createAssetRecord(
      assetId,
      imageRecord,
      existingAsset,
      normalized.portfolios,
      normalized.galleries
    );
    assetIdsByUrl.set(imageRecord.url, assetId);

    if (!seenAssetIds.has(assetId)) {
      normalized.assetOrder.push(assetId);
      seenAssetIds.add(assetId);
    }
  }

  if (Array.isArray(raw.assetOrder)) {
    const preferredOrder = [];
    for (const assetId of raw.assetOrder) {
      if (normalized.assets[assetId] && !preferredOrder.includes(assetId)) {
        preferredOrder.push(assetId);
      }
    }

    for (const assetId of normalized.assetOrder) {
      if (!preferredOrder.includes(assetId)) preferredOrder.push(assetId);
    }

    normalized.assetOrder = preferredOrder;
  }

  return normalized;
}

/**
 * Given the full list of GCS image URLs and the library config,
 * compute what to show for each view while preserving the current
 * URL-based contract for the existing admin UI.
 */
export function mergeLibraryData(allImages, config) {
  const normalized = normalizeLibraryConfig(config, allImages);
  const orderedAssets = normalized.assetOrder
    .map((assetId) => normalized.assets[assetId])
    .filter(Boolean);

  const counts = { all: orderedAssets.length };
  for (const [key, urls] of Object.entries(normalized.portfolios)) counts[key] = urls.length;
  for (const key of Object.keys(normalized.galleries)) counts[key] = getRollupCount(key, normalized.galleries);

  const metadata = {};
  const assetIdByUrl = {};

  for (const asset of orderedAssets) {
    metadata[asset.publicUrl] = {
      assetId: asset.assetId,
      name: asset.originalFilename,
      timeCreated: asset.createdAt,
      updated: asset.updatedAt,
      size: asset.bytes,
      width: asset.width,
      height: asset.height,
      orientation: asset.orientation,
      usageCount: asset.usage.usageCount,
      source: asset.source,
    };
    assetIdByUrl[asset.publicUrl] = asset.assetId;
  }

  return {
    version: normalized.version,
    allImages: orderedAssets.map((asset) => asset.publicUrl),
    images: orderedAssets,
    assets: normalized.assets,
    assetOrder: normalized.assetOrder,
    assetIdByUrl,
    collections: normalized.collections,
    savedViews: normalized.savedViews,
    portfolios: normalized.portfolios,
    galleries: normalized.galleries,
    counts,
    metadata,
  };
}

/**
 * Remove a URL from all album arrays in the config.
 * Returns a new config object (does not mutate).
 */
export function removeFromAllAlbums(config, imageUrl) {
  const normalized = normalizeLibraryConfig(config);
  const portfolios = {};
  for (const [key, urls] of Object.entries(normalized.portfolios)) {
    portfolios[key] = urls.filter((u) => u !== imageUrl);
  }
  const galleries = {};
  for (const [key, urls] of Object.entries(normalized.galleries)) {
    galleries[key] = urls.filter((u) => u !== imageUrl);
  }
  return { ...normalized, portfolios, galleries };
}

/**
 * Remove a URL from one specific album in the config.
 * albumType: 'portfolios' | 'galleries'
 * albumKey: e.g. 'landscapes', 'arizona'
 */
export function removeFromAlbum(config, albumType, albumKey, imageUrl) {
  const normalized = normalizeLibraryConfig(config);
  const section = { ...(normalized[albumType] || {}) };
  section[albumKey] = (section[albumKey] || []).filter((u) => u !== imageUrl);
  return { ...normalized, [albumType]: section };
}

/**
 * Add URLs to a specific album in the config.
 * De-duplicates automatically.
 */
export function addToAlbum(config, albumType, albumKey, imageUrls) {
  const normalized = normalizeLibraryConfig(config);
  const section = { ...(normalized[albumType] || {}) };
  const existing = new Set(section[albumKey] || []);
  for (const url of imageUrls) existing.add(url);
  section[albumKey] = [...existing];
  return { ...normalized, [albumType]: section };
}

export function getRollupUrls(key, galleries) {
  const prefix = key + '/'
  const matchingKeys = Object.keys(galleries).filter(
    (k) => k === key || k.startsWith(prefix)
  )
  return [...new Set(matchingKeys.flatMap((k) => galleries[k] || []))]
}

export function getRollupCount(key, galleries) {
  return getRollupUrls(key, galleries).length
}
