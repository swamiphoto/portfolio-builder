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

export default function GalleryPreview({ gallery, pages, childPages, activeChildId, username, assetsByUrl, noWrap = false, enableSlideshow = false, onSlideshowClick, onChildPageClick, highlightedBlockIndex, onBlockHover, onBlockClick }) {
  const [debouncedGallery, setDebouncedGallery] = useState(gallery);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedGallery(gallery), 300);
    return () => clearTimeout(timer);
  }, [gallery]);

  const resolvedBlocks = (debouncedGallery.blocks || []).map(b => resolveBlock(b, assetsByUrl))

  const inner = (
    <Gallery
      name={debouncedGallery.name}
      description={debouncedGallery.description}
      blocks={resolvedBlocks}
      enableSlideshow={enableSlideshow}
      pages={pages}
      childPages={childPages}
      activeChildId={activeChildId}
      username={username}
      onChildPageClick={onChildPageClick}
      showPlaceholders
      onBackClick={() => {}}
      onSlideshowClick={onSlideshowClick || (() => {})}
      onClientLoginClick={() => {}}
      highlightedBlockIndex={highlightedBlockIndex}
      onBlockHover={onBlockHover}
      onBlockClick={onBlockClick}
    />
  );

  if (noWrap) return inner;

  return (
    <div className="flex-1 h-full min-w-0 overflow-y-auto bg-white">
      {inner}
    </div>
  );
}
