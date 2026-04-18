// common/galleriesConfig.js
import { downloadJSON, uploadJSON } from './gcsClient'
import { getUserGalleriesConfigPath } from './gcsUser'

export async function readGalleriesConfig(userId) {
  try {
    return await downloadJSON(getUserGalleriesConfigPath(userId))
  } catch {
    return null // file doesn't exist yet (normal on first run)
  }
}

export async function writeGalleriesConfig(userId, config) {
  await uploadJSON(getUserGalleriesConfigPath(userId), config)
}
