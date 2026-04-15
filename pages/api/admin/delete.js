import { downloadJSON, uploadJSON, deleteFile, CONFIG_PATH, PUBLIC_URL } from '../../../common/gcsClient'
import { removeFromAllAlbums } from '../../../common/adminConfig'
import { withAuth } from '../../../common/withAuth'

async function readConfig() {
  try {
    return await downloadJSON(CONFIG_PATH)
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

  try {
    await deleteFile(key)

    const config = await readConfig()
    const updatedConfig = removeFromAllAlbums(config, imageUrl)
    await uploadJSON(CONFIG_PATH, updatedConfig)

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/admin/delete error:', err)
    return res.status(500).json({ error: err.message })
  }
}

export default withAuth(handler)
