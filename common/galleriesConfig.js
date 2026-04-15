// common/galleriesConfig.js
import { bucket } from "./gcsClient";

const GALLERIES_CONFIG_PATH = "galleries-config.json";

export async function readGalleriesConfig() {
  try {
    const file = bucket.file(GALLERIES_CONFIG_PATH);
    const [contents] = await file.download();
    return JSON.parse(contents.toString());
  } catch {
    return null; // file doesn't exist yet (normal on first run)
  }
}

export async function writeGalleriesConfig(config) {
  const file = bucket.file(GALLERIES_CONFIG_PATH);
  await file.save(JSON.stringify(config, null, 2), {
    contentType: "application/json",
    metadata: { cacheControl: "no-cache" },
  });
}
