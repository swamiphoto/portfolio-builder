import { normalizeGalleryEntity } from "../../../common/assetRefs";
import { readGalleriesConfig, writeGalleriesConfig } from "../../../common/galleriesConfig";
import { withAuth } from "../../../common/withAuth";

function createEmptyGalleriesConfig() {
  return { galleries: [] };
}

async function handler(req, res, user) {
  if (req.method === "GET") {
    try {
      let config = await readGalleriesConfig(user.id);
      if (!config) {
        config = createEmptyGalleriesConfig();
        await writeGalleriesConfig(user.id, config);
      }
      return res.status(200).json({
        galleries: (config.galleries || []).map((gallery) => normalizeGalleryEntity(gallery)),
      });
    } catch (err) {
      console.error("GET /api/admin/galleries error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "PUT") {
    try {
      const config = req.body;
      if (!config || !Array.isArray(config.galleries)) {
        return res.status(400).json({ error: "Invalid config: must have galleries array" });
      }
      await writeGalleriesConfig(user.id, {
        galleries: config.galleries.map((gallery) => normalizeGalleryEntity(gallery)),
      });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("PUT /api/admin/galleries error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withAuth(handler)
