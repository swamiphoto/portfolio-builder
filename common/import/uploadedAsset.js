// common/import/uploadedAsset.js
// Seed a library asset record for a freshly uploaded file (mirrors the fields
// AdminLibrary.handleUploaded set inline, plus the content hash).
export function seedUploadedAsset({ url, width, height, hash, now }, existing = {}) {
  const ratio = width && height ? width / height : null
  return {
    ...existing,
    assetId: existing.assetId,
    publicUrl: url,
    createdAt: existing.createdAt || now,
    ...(width && height
      ? {
          width,
          height,
          aspectRatio: Number(ratio.toFixed(4)),
          orientation: ratio === 1 ? 'square' : ratio > 1 ? 'landscape' : 'portrait',
        }
      : {}),
    hashes: { exact: hash ?? existing.hashes?.exact ?? null, perceptual: existing.hashes?.perceptual ?? null },
  }
}
