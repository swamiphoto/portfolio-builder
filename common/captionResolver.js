export function resolveCaption(ref, assetsByUrl) {
  if (ref && ref.caption !== undefined) return ref.caption
  const asset = assetsByUrl?.[ref?.url]
  return asset?.caption ?? ''
}

export function isCaptionOverridden(ref) {
  return ref != null && ref.caption !== undefined
}
