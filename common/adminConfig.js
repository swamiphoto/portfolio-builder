import IMAGES, { bucketUrl } from "./images";
import { galleryData } from "../pages/galleries";

const BUCKET_URL = bucketUrl; // "https://storage.googleapis.com/swamiphoto"

/**
 * Recursively collect all string URL values from a (possibly nested) object.
 * Used to extract URLs from IMAGES.landscapes, IMAGES.portraits etc.
 */
export function collectUrls(obj) {
  const urls = [];
  for (const val of Object.values(obj)) {
    if (typeof val === "string" && val.startsWith("http")) {
      urls.push(val);
    } else if (typeof val === "object" && val !== null) {
      urls.push(...collectUrls(val));
    }
  }
  return urls;
}

/**
 * Build the initial library config from hardcoded data.
 * For gallery blocks that use imagesFolderUrl, listGcsFolder is called to get URLs.
 * @param {Function} listGcsFolder - async (folderPath: string) => string[] of full GCS URLs
 * @returns {Promise<LibraryConfig>}
 *
 * LibraryConfig shape:
 * {
 *   portfolios: { landscapes: string[], portraits: string[], ... },
 *   galleries: { arizona: string[], "naga-sunol": string[], ... }
 * }
 */
export async function seedConfig(listGcsFolder) {
  const portfolios = {
    landscapes: collectUrls(IMAGES.landscapes),
    portraits: collectUrls(IMAGES.portraits),
    bollywood: collectUrls(IMAGES.bollywood),
    tennis: collectUrls(IMAGES.tennis),
    headshots: collectUrls(IMAGES.headshots),
  };

  const galleries = {};

  for (const gallery of galleryData) {
    if (gallery.isHidden) continue;
    const slug = gallery.slug;
    const urls = new Set();

    for (const block of gallery.blocks || []) {
      if (block.type === "photo" && block.imageUrl) {
        urls.add(block.imageUrl);
      } else if (
        (block.type === "stacked" || block.type === "masonry") &&
        block.imagesFolderUrl
      ) {
        const folderUrls = await listGcsFolder(block.imagesFolderUrl);
        for (const u of folderUrls) urls.add(u);
      } else if (
        (block.type === "stacked" || block.type === "masonry") &&
        block.imageUrls
      ) {
        for (const u of block.imageUrls) urls.add(u);
      }
    }

    if (urls.size > 0) galleries[slug] = [...urls];
  }

  return { portfolios, galleries };
}

/**
 * Given the full list of GCS image URLs and the library config,
 * compute what to show for each view.
 *
 * @param {string[]} allImages - every image URL in the bucket
 * @param {LibraryConfig} config
 * @returns {{ allImages: string[], portfolios: Record<string,string[]>, galleries: Record<string,string[]>, counts: Record<string,number> }}
 */
/**
 * allImages is now an array of { url, name, timeCreated, updated, size } objects.
 * portfolios/galleries remain string[] of URLs in the config.
 */
export function mergeLibraryData(allImages, config) {
  const portfolios = config.portfolios || {};
  const galleries = config.galleries || {};

  const counts = { all: allImages.length };
  for (const [key, urls] of Object.entries(portfolios)) counts[key] = urls.length;
  for (const [key, urls] of Object.entries(galleries)) counts[key] = urls.length;

  // Build a metadata map keyed by URL for fast lookup in the UI
  const metadata = {};
  for (const img of allImages) {
    metadata[img.url] = { name: img.name, timeCreated: img.timeCreated, updated: img.updated, size: img.size };
  }

  return { allImages: allImages.map((i) => i.url), portfolios, galleries, counts, metadata };
}

/**
 * Remove a URL from all album arrays in the config.
 * Returns a new config object (does not mutate).
 */
export function removeFromAllAlbums(config, imageUrl) {
  const portfolios = {};
  for (const [key, urls] of Object.entries(config.portfolios || {})) {
    portfolios[key] = urls.filter((u) => u !== imageUrl);
  }
  const galleries = {};
  for (const [key, urls] of Object.entries(config.galleries || {})) {
    galleries[key] = urls.filter((u) => u !== imageUrl);
  }
  return { portfolios, galleries };
}

/**
 * Remove a URL from one specific album in the config.
 * albumType: 'portfolios' | 'galleries'
 * albumKey: e.g. 'landscapes', 'arizona'
 */
export function removeFromAlbum(config, albumType, albumKey, imageUrl) {
  const section = { ...(config[albumType] || {}) };
  section[albumKey] = (section[albumKey] || []).filter((u) => u !== imageUrl);
  return { ...config, [albumType]: section };
}

/**
 * Add URLs to a specific album in the config.
 * De-duplicates automatically.
 */
export function addToAlbum(config, albumType, albumKey, imageUrls) {
  const section = { ...(config[albumType] || {}) };
  const existing = new Set(section[albumKey] || []);
  for (const u of imageUrls) existing.add(u);
  section[albumKey] = [...existing];
  return { ...config, [albumType]: section };
}
