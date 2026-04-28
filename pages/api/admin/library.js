import { listFiles, downloadJSON, uploadJSON, PUBLIC_URL } from '../../../common/gcsClient'
import { seedConfig, mergeLibraryData, normalizeLibraryConfig } from '../../../common/adminConfig'
import { getUserLibraryConfigPath, getUserPhotosPrefix } from '../../../common/gcsUser'
import { withAuth } from '../../../common/withAuth'

async function listAllImages(userId) {
  const keys = await listFiles(getUserPhotosPrefix(userId))
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

async function readConfig(userId) {
  try {
    return await downloadJSON(getUserLibraryConfigPath(userId))
  } catch {
    return null // doesn't exist yet
  }
}

async function writeConfig(userId, config) {
  await uploadJSON(getUserLibraryConfigPath(userId), config)
}

function mergeIncomingConfig(existingConfig, incomingConfig) {
  return normalizeLibraryConfig({
    ...existingConfig,
    ...incomingConfig,
    portfolios: incomingConfig.portfolios ?? existingConfig.portfolios,
    galleries: incomingConfig.galleries ?? existingConfig.galleries,
    assets: incomingConfig.assets ?? existingConfig.assets,
    assetOrder: incomingConfig.assetOrder ?? existingConfig.assetOrder,
    // Legacy `collections` key accepted for in-flight clients; remove once all clients ship `sets`.
    sets: incomingConfig.sets ?? incomingConfig.collections ?? existingConfig.sets,
    savedViews: incomingConfig.savedViews ?? existingConfig.savedViews,
  })
}

async function handler(req, res, user) {
  if (req.method === 'GET') {
    try {
      const [allImages, existingConfig] = await Promise.all([
        listAllImages(user.id),
        readConfig(user.id),
      ])

      const config = existingConfig || await seedConfig()
      const normalizedConfig = normalizeLibraryConfig(config, allImages)

      const shouldPersist =
        !existingConfig ||
        existingConfig.version !== normalizedConfig.version ||
        !existingConfig.assets ||
        Object.keys(existingConfig.assets || {}).length !== Object.keys(normalizedConfig.assets).length ||
        !Array.isArray(existingConfig.assetOrder)

      if (shouldPersist) {
        await writeConfig(user.id, normalizedConfig)
      }

      const data = mergeLibraryData(allImages, normalizedConfig)
      return res.status(200).json(data)
    } catch (err) {
      console.error('GET /api/admin/library error:', err)
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'PUT') {
    try {
      const incomingConfig = req.body
      if (!incomingConfig || typeof incomingConfig !== 'object') {
        return res.status(400).json({ error: 'Invalid config body' })
      }

      const existingConfig = await readConfig(user.id) || await seedConfig()
      const nextConfig = mergeIncomingConfig(existingConfig, incomingConfig)

      await writeConfig(user.id, nextConfig)
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('PUT /api/admin/library error:', err)
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { assetId, patch } = req.body || {}
      if (!assetId || !patch || typeof patch !== 'object') {
        return res.status(400).json({ error: 'assetId and patch required' })
      }
      const existingConfig = await readConfig(user.id)
      const asset = existingConfig?.assets?.[assetId]
      if (!asset) return res.status(404).json({ error: 'asset not found' })
      const nextAsset = { ...asset }
      if ('caption' in patch) nextAsset.caption = String(patch.caption ?? '')
      const next = {
        ...existingConfig,
        assets: { ...existingConfig.assets, [assetId]: nextAsset },
      }
      await writeConfig(user.id, next)
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('PATCH /api/admin/library error:', err)
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default withAuth(handler)
