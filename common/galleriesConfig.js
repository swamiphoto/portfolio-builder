// common/galleriesConfig.js
import { downloadJSON, uploadJSON } from './gcsClient'

const GALLERIES_CONFIG_PATH = 'galleries-config.json'

export async function readGalleriesConfig() {
  try {
    return await downloadJSON(GALLERIES_CONFIG_PATH)
  } catch {
    return null // file doesn't exist yet (normal on first run)
  }
}

export async function writeGalleriesConfig(config) {
  await uploadJSON(GALLERIES_CONFIG_PATH, config)
}
