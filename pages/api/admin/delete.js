import { downloadJSON, uploadJSON, deleteFile, PUBLIC_URL } from '../../../common/gcsClient'
import { removeFromAllAlbums } from '../../../common/adminConfig'
import { getUserLibraryConfigPath, getUserPhotosPrefix } from '../../../common/gcsUser'
import { withAuth } from '../../../common/withAuth'

async function readConfig(userId) {
  try {
    return await downloadJSON(getUserLibraryConfigPath(userId))
  } catch {
    return { portfolios: {}, galleries: {} }
  }
}

async function handler(req, res, user) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { imageUrl } = req.body

  if (!imageUrl || !imageUrl.startsWith(PUBLIC_URL)) {
    return res.status(400).json({ error: 'Invalid imageUrl' })
  }

  const key = imageUrl.replace(`${PUBLIC_URL}/`, '')
  const userPrefix = getUserPhotosPrefix(user.id)

  if (!key.startsWith(userPrefix)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    await deleteFile(key)

    const config = await readConfig(user.id)
    const updatedConfig = removeFromAllAlbums(config, imageUrl)
    await uploadJSON(getUserLibraryConfigPath(user.id), updatedConfig)

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/admin/delete error:', err)
    return res.status(500).json({ error: err.message })
  }
}

export default withAuth(handler)
