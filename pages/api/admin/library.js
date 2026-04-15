import { listFiles, downloadJSON, uploadJSON, CONFIG_PATH, PUBLIC_URL } from '../../../common/gcsClient'
import { seedConfig, mergeLibraryData } from '../../../common/adminConfig'
import { withAuth } from '../../../common/withAuth'

async function listAllImages() {
  const keys = await listFiles('photos/')
  return keys
    .filter(k => /\.(jpg|jpeg|png|gif)$/i.test(k))
    .map(k => ({
      url: `${PUBLIC_URL}/${k}`,
      name: k,
      timeCreated: null,
      updated: null,
      size: 0,
    }))
}

async function listFolder(folderPath) {
  const keys = await listFiles(`photos/${folderPath}/`)
  return keys
    .filter(k => /\.(jpg|jpeg|png|gif)$/i.test(k))
    .map(k => `${PUBLIC_URL}/${k}`)
}

async function readConfig() {
  try {
    return await downloadJSON(CONFIG_PATH)
  } catch {
    return null // doesn't exist yet
  }
}

async function writeConfig(config) {
  await uploadJSON(CONFIG_PATH, config)
}

async function handler(req, res, user) {
  if (req.method === 'GET') {
    try {
      const [allImages, existingConfig] = await Promise.all([
        listAllImages(),
        readConfig(),
      ])

      let config = existingConfig
      if (!config) {
        config = await seedConfig(listFolder)
        await writeConfig(config)
      }

      const data = mergeLibraryData(allImages, config)
      return res.status(200).json(data)
    } catch (err) {
      console.error('GET /api/admin/library error:', err)
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'PUT') {
    try {
      const config = req.body
      if (!config || typeof config !== 'object') {
        return res.status(400).json({ error: 'Invalid config body' })
      }
      await writeConfig(config)
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('PUT /api/admin/library error:', err)
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
