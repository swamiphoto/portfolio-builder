import { useState, useEffect } from "react";
import Gallery from "../../image-displays/gallery/Gallery";
import { resolveCaption } from '../../../common/captionResolver'

function resolveBlock(block, assetsByUrl) {
  if (!assetsByUrl) return block
  if (block.type === 'photo') {
    const ref = { url: block.imageUrl, caption: block.caption }
    return { ...block, caption: resolveCaption(ref, assetsByUrl) }
  }
  if (block.type === 'photos' || block.type === 'stacked' || block.type === 'masonry') {
    const refs = (block.images || []).length
      ? block.images
      : (block.imageUrls || []).map(url => ({ url }))
    const images = refs.map(r => ({ ...r, caption: resolveCaption(r, assetsByUrl) }))
    return { ...block, images, imageUrls: images.map(i => i.url) }
  }
  return block
}

export default function GalleryPreview({ gallery, pages, assetsByUrl }) {
  const [debouncedGallery, setDebouncedGallery] = useState(gallery);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedGallery(gallery), 300);
    return () => clearTimeout(timer);
  }, [gallery]);

  const resolvedBlocks = (debouncedGallery.blocks || []).map(b => resolveBlock(b, assetsByUrl))

  return (
    <div className="flex-1 h-full min-w-0 overflow-y-auto bg-white">
      {resolvedBlocks.length > 0 ? (
        <Gallery
          name={debouncedGallery.name}
          description={debouncedGallery.description}
          blocks={resolvedBlocks}
          enableSlideshow={false}
          pages={pages}
          onBackClick={() => {}}
          onSlideshowClick={() => {}}
          onClientLoginClick={() => {}}
        />
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-300 text-sm">
          Add blocks to preview the gallery
        </div>
      )}
    </div>
  );
}
