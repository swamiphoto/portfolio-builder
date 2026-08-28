// Pure functions for building per-user GCS paths.
// Server-side only — never import from client components.

export function getUserPrefix(userId) {
  if (!userId) throw new Error('userId is required')
  return `users/${userId}/`
}

export function getUserSiteConfigPath(userId) {
  return `${getUserPrefix(userId)}site-config.json`
}

export function getUserLibraryConfigPath(userId) {
  return `${getUserPrefix(userId)}library-config.json`
}

export function getUserGalleriesConfigPath(userId) {
  return `${getUserPrefix(userId)}galleries-config.json`
}

export function getUserPhotosPrefix(userId) {
  return `${getUserPrefix(userId)}photos/`
}

export function getUserPhotoPath(userId, filename) {
  if (!filename) throw new Error('filename is required')
  return `${getUserPhotosPrefix(userId)}${filename}`
}

export function getUserProfilePath(userId) {
  if (!userId) throw new Error('userId is required')
  return `users/${userId}/profile.json`
}

export function getUsernameLookupPath(username) {
  if (!username) throw new Error('username is required')
  return `usernames/${username}.json`
}

export function getDomainLookupPath(hostname) {
  if (!hostname) throw new Error('hostname is required')
  return `domains/${hostname}.json`
}

export function getInviteLookupPath(code) {
  if (!code) throw new Error('code is required')
  return `invites/${code}.json`
}

export function getUserPrintMasterPath(userId, filename) {
  if (!filename) throw new Error('filename is required')
  return `${getUserPhotosPrefix(userId)}print-masters/${filename}`
}

export function getUserOrdersPrefix(userId) {
  return `${getUserPrefix(userId)}orders/`
}

export function getUserOrderPath(userId, orderId) {
  if (!orderId) throw new Error('orderId is required')
  return `${getUserOrdersPrefix(userId)}${orderId}.json`
}
