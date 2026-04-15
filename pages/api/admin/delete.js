import { bucket, CONFIG_PATH } from "../../../common/gcsClient";
import { removeFromAllAlbums } from "../../../common/adminConfig";
import { withAuth } from "../../../common/withAuth";

const BUCKET_URL = "https://storage.googleapis.com/swamiphoto";

async function readConfig() {
  try {
    const [contents] = await bucket.file(CONFIG_PATH).download();
    return JSON.parse(contents.toString());
  } catch {
    return { portfolios: {}, galleries: {} };
  }
}

async function writeConfig(config) {
  await bucket.file(CONFIG_PATH).save(JSON.stringify(config, null, 2), {
    contentType: "application/json",
    metadata: { cacheControl: "no-cache" },
  });
}

async function handler(req, res, user) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imageUrl } = req.body;

  if (!imageUrl || !imageUrl.startsWith(BUCKET_URL)) {
    return res.status(400).json({ error: "Invalid imageUrl" });
  }

  // Derive GCS object path from full URL
  const objectPath = imageUrl.replace(`${BUCKET_URL}/`, "");

  try {
    // Delete the GCS object
    await bucket.file(objectPath).delete();

    // Remove from config
    const config = await readConfig();
    const updatedConfig = removeFromAllAlbums(config, imageUrl);
    await writeConfig(updatedConfig);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/delete error:", err);
    return res.status(500).json({ error: err.message });
  }
}

export default withAuth(handler)
