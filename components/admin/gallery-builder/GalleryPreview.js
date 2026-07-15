import { useState, useEffect, useMemo } from "react";
import Gallery from "../../image-displays/gallery/Gallery";
import { resolveCaption } from '../../../common/captionResolver'
import ThemeProvider from '../../image-displays/ThemeProvider'

function printForUrl(assetsByUrl, url) {
  const p = assetsByUrl?.[url]?.print
  return p && p.sellable ? p : undefined
}

function resolveBlock(block, assetsByUrl) {
  if (!assetsByUrl) return block
  if (block.type === 'photo') {
    const ref = { url: block.imageUrl, caption: block.caption }
    const out = { ...block, caption: resolveCaption(ref, assetsByUrl) }
    const print = printForUrl(assetsByUrl, block.imageUrl)
    if (print) out.print = print
    return out
  }
  if (block.type === 'photos' || block.type === 'stacked' || block.type === 'masonry') {
    const refs = (block.images || []).length
      ? block.images
      : (block.imageUrls || []).map(url => ({ url }))
    const images = refs.map(r => {
      const out = { ...r, caption: resolveCaption(r, assetsByUrl) }
      const print = printForUrl(assetsByUrl, r.url)
      if (print) out.print = print
      return out
    })
    return { ...block, images, imageUrls: images.map(i => i.url) }
  }
  return block
}

export default function GalleryPreview({ gallery, pages, childPages, activeChildId, username, assetsByUrl, printStore, noWrap = false, enableSlideshow = false, onSlideshowClick, onChildPageClick, highlightedBlockIndex, onBlockHover, onBlockClick, siteConfig }) {
  // Debounce the preview so a heavy re-render doesn't fire on every keystroke.
  // This only resets while the `gallery` prop keeps changing (i.e. while typing);
  // the parent (PagePreview) is memoized so unrelated re-renders, like autosave
  // status changes, don't reach here and can't starve the timer.
  const [debouncedGallery, setDebouncedGallery] = useState(gallery);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedGallery(gallery), 250);
    return () => clearTimeout(timer);
  }, [gallery]);

  const themeId = siteConfig?.design?.theme || 'kyoto';

  const resolvedBlocks = useMemo(
    () => (debouncedGallery.blocks || []).map(b => resolveBlock(b, assetsByUrl)),
    [debouncedGallery, assetsByUrl]
  );

  // The heavy part: drawing every block/image. Memoize it on the DEBOUNCED
  // content so per-keystroke re-renders of the parent (hero title/description,
  // hover, autosave status) reuse this exact element and React skips re-running
  // it entirely. Without this, on a photo-dense page the block render re-executes
  // on every keystroke and blocks the same commit that should paint the edit, so
  // nothing appears to update. It recomputes 250ms after the last edit, when
  // debouncedGallery updates. Non-content props (siteConfig/pages/highlight) are
  // read from the closure and are at most ~250ms stale, which is imperceptible.
  const inner = useMemo(() => (
    <ThemeProvider themeId={themeId}>
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
        siteConfig={siteConfig}
        printStore={printStore}
        themeId={themeId}
      />
    </ThemeProvider>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [debouncedGallery, resolvedBlocks, themeId, printStore]);

  if (noWrap) return inner;

  return (
    <div className="flex-1 h-full min-w-0 overflow-y-auto bg-white">
      {inner}
    </div>
  );
}
