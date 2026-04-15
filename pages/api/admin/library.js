import { bucket, CONFIG_PATH } from "../../../common/gcsClient";
import { seedConfig, mergeLibraryData } from "../../../common/adminConfig";
import { withAuth } from "../../../common/withAuth";

const BUCKET_URL = "https://storage.googleapis.com/swamiphoto";

async function listAllImages() {
  const [files] = await bucket.getFiles({ prefix: "photos/" });
  const imageFiles = files.filter((f) => /\.(jpg|jpeg|png|gif)$/i.test(f.name));
  return imageFiles.map((f) => ({
    url: `${BUCKET_URL}/${f.name}`,
    name: f.name,
    timeCreated: f.metadata.timeCreated || null,
    updated: f.metadata.updated || null,
    size: parseInt(f.metadata.size || "0", 10),
  }));
}

async function listFolder(folderPath) {
  const [files] = await bucket.getFiles({ prefix: `photos/${folderPath}/` });
  return files
    .filter((f) => /\.(jpg|jpeg|png|gif)$/i.test(f.name))
    .map((f) => `${BUCKET_URL}/${f.name}`);
}

async function readConfig() {
  try {
    const file = bucket.file(CONFIG_PATH);
    const [contents] = await file.download();
    return JSON.parse(contents.toString());
  } catch {
    return null; // doesn't exist yet
  }
}

async function writeConfig(config) {
  const file = bucket.file(CONFIG_PATH);
  await file.save(JSON.stringify(config, null, 2), {
    contentType: "application/json",
    metadata: { cacheControl: "no-cache" },
  });
}

async function handler(req, res, user) {
  if (req.method === "GET") {
    try {
      const [allImages, existingConfig] = await Promise.all([
        listAllImages(),
        readConfig(),
      ]);

      let config = existingConfig;
      if (!config) {
        config = await seedConfig(listFolder);
        await writeConfig(config);
      }

      const data = mergeLibraryData(allImages, config);
      return res.status(200).json(data);
    } catch (err) {
      console.error("GET /api/admin/library error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "PUT") {
    try {
      const config = req.body;
      if (!config || typeof config !== "object") {
        return res.status(400).json({ error: "Invalid config body" });
      }
      await writeConfig(config);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("PUT /api/admin/library error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withAuth(handler)
