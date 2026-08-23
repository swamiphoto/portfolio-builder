import React, { useEffect, useMemo, useState } from "react";
import { getSizedUrl } from "../../../../common/imageUtils";
import { captionStyleCss } from "../../../../common/captionStyles";
import { packColumns } from "./packColumns";
import styles from "./MasonryGallery.module.css";
import BuyPrintButton from "../../print/BuyPrintButton";
import EngagementActions from "../../engagement/EngagementActions";
import WatermarkOverlay from "../../engagement/WatermarkOverlay";
import HoverCaption from "../HoverCaption";

// Aspect ratio (width/height) assumed before an image's real dimensions are
// known. Only affects the very first paint for images that carry no stored
// ratio; the layout re-packs once each image reports its natural size on load.
const DEFAULT_ASPECT = 1.4;

const clampAspect = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const MasonryGallery = ({ images = [], imageUrls = [], onImageClick, columns, captionStyle = 'sans', insideCaption = false, bleed = false, mobile = false }) => {
  const capCss = captionStyleCss(captionStyle);
  // Serif (Cormorant) has a small x-height, so bump it to a fixed, legible size —
  // never scales, same for every image in the block.
  // Serif (Cormorant) lifted to a ~20px medium; readable measure via max-w-xl.
  const capSize = captionStyle === 'serif' ? 'text-[17px] md:text-[20px] leading-snug max-w-xl mx-auto' : 'text-sm';
  const items = images.length > 0 ? images : imageUrls.map(url => ({ url, caption: '' }));
  // Gallery always passes an explicit column count (1 on mobile); fall back to 2.
  const columnCount = columns != null ? Math.max(1, columns) : 2;

  // Aspect ratio per image. Seed from any stored ratio (captured at upload) so
  // images with known dimensions place correctly on the first paint; the rest
  // start null and get measured on load. Re-seed only when the image set itself
  // changes so measured values survive unrelated re-renders.
  const urlSig = items.map((it) => it.url).join('|');
  const [ratios, setRatios] = useState(() => items.map((it) => clampAspect(it.aspectRatio)));
  useEffect(() => {
    setRatios(items.map((it) => clampAspect(it.aspectRatio)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSig]);

  const columnData = useMemo(() => {
    // rendered height per unit column width = 1 / aspectRatio
    const factors = items.map((_, i) => 1 / (ratios[i] || DEFAULT_ASPECT));
    return packColumns(factors, columnCount);
  }, [ratios, columnCount, urlSig]);

  // Record an image's real aspect ratio. Called both from onLoad and from a ref
  // callback: cached images are already `complete` before React attaches onLoad,
  // so onLoad never fires for them — the ref callback measures those on mount so
  // the columns still balance instead of falling back to the default ratio.
  const measureNode = (index, node) => {
    if (!node) return;
    const { naturalWidth: w, naturalHeight: h } = node;
    if (!w || !h) return;
    const r = w / h;
    setRatios((prev) => {
      if (prev[index] && Math.abs(prev[index] - r) < 0.001) return prev;
      const next = prev.slice();
      next[index] = r;
      return next;
    });
  };

  const renderItem = (item, index) => {
    const { url, caption, print } = item;
    const imageUrl = getSizedUrl(url, 'display');
    return (
      <div key={index} className="w-full">
        <div className="relative group">
          <div className="photo-cta-scrim" aria-hidden="true" />
          <img
            src={imageUrl}
            alt={caption || `Image ${index + 1}`}
            className="w-full h-auto transition-opacity duration-500 ease-in shadow-lg rounded-3xl cursor-pointer"
            ref={(node) => { if (node && node.complete) measureNode(index, node); }}
            onLoad={(e) => measureNode(index, e.target)}
            onError={(e) => {
              console.error("Image failed to load:", imageUrl);
              e.target.style.display = 'none';
            }}
            onClick={() => onImageClick && onImageClick(index)}
          />
          <WatermarkOverlay />
          <div className="photo-cta-overlay absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <BuyPrintButton print={print} imageUrl={url} />
          </div>
          <div className="photo-cta-overlay absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 [&:has([data-engagement=always-visible])]:opacity-100 transition-opacity duration-300">
            <EngagementActions imageUrl={url} />
          </div>
          {insideCaption && <HoverCaption caption={caption} captionStyle={captionStyle} />}
        </div>
        {caption && !insideCaption && (
          <p className={`mt-2 ${capSize} italic text-center text-gray-500`} style={capCss}>{caption}</p>
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col ${bleed ? 'items-stretch' : 'items-center'}`}>
      <div className={`${styles.masonryGallery} w-full ${bleed ? '' : 'max-w-6xl mx-auto'}`}>
        <div className={`gallery-content flex-grow ${bleed ? '' : 'md:p-4'} overflow-hidden ${mobile ? 'px-[10px]' : ''}`}>
          {items.length > 0 ? (
            <div className="flex gap-5 items-start">
              {columnData.map((colIndexes, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-5 min-w-0" style={{ flex: '1 1 0' }}>
                  {colIndexes.map((index) => renderItem(items[index], index))}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No images available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MasonryGallery;
