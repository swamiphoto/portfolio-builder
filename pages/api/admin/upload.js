import { bucket, FALLBACK_FOLDER } from "../../../common/gcsClient";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { filename, contentType, folder } = req.body;

  if (!filename || !contentType) {
    return res.status(400).json({ error: "filename and contentType required" });
  }

  // Sanitize filename: strip path traversal, keep extension
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const targetFolder = folder ? folder.replace(/^\/|\/$/g, "") : FALLBACK_FOLDER;
  const objectPath = `${targetFolder}/${safeName}`;

  try {
    const file = bucket.file(objectPath);
    const [signedUrl] = await file.generateSignedPostPolicyV4({
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      conditions: [
        ["content-length-range", 0, 50 * 1024 * 1024], // max 50MB
        ["eq", "$Content-Type", contentType],
      ],
      fields: { "Content-Type": contentType },
    });

    const gcsUrl = `https://storage.googleapis.com/swamiphoto/${objectPath}`;
    return res.status(200).json({ signedUrl, gcsUrl, objectPath });
  } catch (err) {
    console.error("POST /api/admin/upload error:", err);
    return res.status(500).json({ error: err.message });
  }
}
