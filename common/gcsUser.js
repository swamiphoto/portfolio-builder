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
