// pages/api/admin/galleries.js
import { bucket } from "../../../common/gcsClient";
import { readGalleriesConfig, writeGalleriesConfig } from "../../../common/galleriesConfig";
import { galleryData } from "../../../common/galleryData";
import { withAuth } from "../../../common/withAuth";

const BUCKET_URL = "https://storage.googleapis.com/swamiphoto";

async function listGcsFolder(folderPath) {
  // folderPath like "landscapes/arizona/canyon" — relative to "photos/"
  const [files] = await bucket.getFiles({ prefix: `photos/${folderPath}/` });
  return files
    .filter((f) => /\.(jpg|jpeg|png|gif)$/i.test(f.name))
    .map((f) => `${BUCKET_URL}/${f.name}`);
}

async function seedGalleriesConfig() {
  const galleries = [];

  for (const gallery of galleryData) {
    if (gallery.isHidden) continue;

    const processedBlocks = await Promise.all(
      (gallery.blocks || []).map(async (block) => {
        if ((block.type === "stacked" || block.type === "masonry") && block.imagesFolderUrl) {
          let urls = await listGcsFolder(block.imagesFolderUrl);
          urls = urls.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
          if (typeof block.start === "number") {
            urls = block.count === -1
              ? urls.slice(block.start)
              : urls.slice(block.start, block.start + block.count);
          }
          if (block.excludeImageUrls?.length) {
            const excluded = new Set(block.excludeImageUrls);
            urls = urls.filter((u) => !excluded.has(u));
          }
          return { type: block.type, imageUrls: urls };
        }
        if ((block.type === "stacked" || block.type === "masonry") && block.imageUrls) {
          return { type: block.type, imageUrls: block.imageUrls };
        }
        if (block.type === "photo") {
          const out = { type: "photo", imageUrl: block.imageUrl || "", variant: block.variant || 1 };
          if (block.caption) out.caption = block.caption;
          return out;
        }
        if (block.type === "text") {
          return { type: "text", content: block.content || "", variant: block.variant || 1 };
        }
        if (block.type === "video") {
          const out = { type: "video", url: block.url || "", variant: block.variant || 1 };
          if (block.caption) out.caption = block.caption;
          return out;
        }
        return block;
      })
    );

    const seeded = {
      name: gallery.name,
      slug: gallery.slug,
      description: gallery.description || "",
      thumbnailUrl: gallery.thumbnailUrl || "",
      enableSlideshow: gallery.enableSlideshow || false,
      showCover: gallery.showCover !== false,
      slideshowSettings: gallery.slideshowSettings || {
        youtubeLinks: [],
        musicCredits: [],
        layout: "kenburns",
      },
      blocks: processedBlocks,
    };
    if (gallery.clientSettings) seeded.clientSettings = gallery.clientSettings;
    galleries.push(seeded);
  }

  return { galleries };
}

async function handler(req, res, user) {
  if (req.method === "GET") {
    try {
      let config = await readGalleriesConfig();
      if (!config) {
        config = await seedGalleriesConfig();
        await writeGalleriesConfig(config);
      }
      return res.status(200).json(config);
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
      await writeGalleriesConfig(config);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("PUT /api/admin/galleries error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withAuth(handler)
