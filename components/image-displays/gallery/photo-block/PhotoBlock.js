import React from "react";
import { getSizedUrl } from "../../../../common/imageUtils";
import { captionStyleCss } from "../../../../common/captionStyles";
import { useIsMobile } from "../../../../common/useIsMobile";
import BuyPrintButton from "../../print/BuyPrintButton";
import EngagementActions from "../../engagement/EngagementActions";
import WatermarkOverlay from "../../engagement/WatermarkOverlay";

// variant: 1 full-bleed | 2 centered | 3 side (image left, caption right).
// widthPct scales the centered layout (small/medium/large → 44/56/72).
const PhotoBlock = ({ imageUrl, caption = "", variant = 1, widthPct = 72, onImageClick, print, captionStyle = 'sans' }) => {
  const isMobile = useIsMobile();
  // Drop serif's relative 1.12em so the caption's size class (text-xl = 20px) wins;
  // its 1.12em read too small (see StackedGallery).
  const capCss = captionStyleCss(captionStyle);
  if (captionStyle === 'serif') delete capCss.fontSize;
  const [aspectRatio, setAspectRatio] = React.useState(null);
  const imgRef = React.useRef(null);

  const handleImageLoad = (e) => {
    setAspectRatio(e.target.naturalWidth / e.target.naturalHeight);
  };

  React.useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth) {
      setAspectRatio(imgRef.current.naturalWidth / imgRef.current.naturalHeight);
    }
  }, [imageUrl]);

  const handleClick = () => {
    if (onImageClick) onImageClick(0);
  };

  const buyOverlay = (
    <div className="photo-cta-overlay absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      <BuyPrintButton print={print} imageUrl={imageUrl} />
    </div>
  );

  const engagementOverlay = (
    <div className="photo-cta-overlay absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 [&:has([data-engagement=always-visible])]:opacity-100 transition-opacity duration-300">
      <EngagementActions imageUrl={imageUrl} />
    </div>
  );

  const renderCaption = () => {
    // Sit the caption close under the photo (mt-2) to match the stacked/photos block;
    // the larger bottom margin only spaces this block from the next.
    // max-w-xl caps the caption to a readable measure so it wraps rather than
    // running the full width of a large photo (matches the stacked/photos block).
    return <p className="mt-2 mb-4 md:mb-20 font-medium text-[17px] md:text-xl italic text-center max-w-md mx-auto" style={capCss}>{caption}</p>;
  };

  const renderImage = () => {
    // Mobile: a centered photo renders as one uniform full-width image with the
    // shared 10px side margin, so all non-bleed images on a phone are the same
    // width. Full-bleed (variant 1) falls through to its edge-to-edge path below;
    // side-by-side (3) keeps its own stacking.
    if (isMobile && variant === 2) {
      return (
        <div className="relative group px-[10px]">
          <img
            src={getSizedUrl(imageUrl, 'display')}
            alt={caption || "Photo"}
            className="w-full h-auto object-cover shadow-lg rounded-3xl cursor-pointer"
            loading="lazy"
            onClick={handleClick}
            onError={(e) => {
              console.error("Failed to load image in PhotoBlock:", imageUrl);
              e.target.style.display = 'none';
            }}
          />
          <WatermarkOverlay />
          {buyOverlay}
          {engagementOverlay}
        </div>
      );
    }

    if (variant === 3) {
      // Side: image on the left, caption on the right (great for About pages).
      // Overall width scales with the Size control (widthPct); Large ≈ the old 5xl.
      return (
        <div className="w-full px-[10px] md:px-0 mx-auto flex flex-col md:flex-row md:items-center gap-6" style={{ maxWidth: `${Math.round((widthPct / 72) * 1024)}px` }}>
          <div className="w-full md:w-2/3">
            <div className="relative group">
              <img
                ref={imgRef}
                src={getSizedUrl(imageUrl, 'display')}
                alt={caption || "Photo"}
                className="h-auto w-full shadow-lg rounded-3xl transition-opacity duration-500 cursor-pointer"
                loading="lazy"
                onClick={handleClick}
                onLoad={handleImageLoad}
                onError={(e) => {
                  console.error("Failed to load image in PhotoBlock:", imageUrl);
                  e.target.style.display = 'none';
                }}
              />
              <WatermarkOverlay />
              {buyOverlay}
              {engagementOverlay}
            </div>
          </div>
          <div className="w-full md:w-1/3 flex items-center">
            {caption && <p className="my-4 font-medium text-sm md:text-xl italic text-left mx-auto md:mx-0" style={capCss}>{caption}</p>}
          </div>
        </div>
      );
    }

    if (variant === 2) {
      const displayWidth = aspectRatio !== null && aspectRatio < 1
        ? `${(widthPct * aspectRatio).toFixed(1)}%`
        : `${widthPct}%`;
      return (
        <div className="w-full flex justify-center">
          <div className="relative group" style={{ width: displayWidth }}>
            <img
              ref={imgRef}
              src={getSizedUrl(imageUrl, 'display')}
              alt={caption || "Photo"}
              className="h-auto w-full shadow-lg rounded-3xl transition-opacity duration-500 cursor-pointer"
              loading="lazy"
              onClick={handleClick}
              onLoad={handleImageLoad}
              onError={(e) => {
                console.error("Failed to load image in PhotoBlock:", imageUrl);
                e.target.style.display = 'none';
              }}
            />
            <WatermarkOverlay />
            {buyOverlay}
            {engagementOverlay}
          </div>
        </div>
      );
    }

    // #120: a horizontal (landscape) image looks cropped and awkward when it runs
    // edge-to-edge on a phone. On mobile only vertical (portrait) images stay
    // full-bleed; a landscape one falls back to the centered treatment. Aspect is
    // known after load, so this settles once the image measures (default holds
    // full-bleed until then).
    if (isMobile && variant === 1 && aspectRatio !== null && aspectRatio > 1) {
      return (
        <div className="relative group px-[10px]">
          <img
            ref={imgRef}
            src={getSizedUrl(imageUrl, 'display')}
            alt={caption || "Photo"}
            className="w-full h-auto object-cover shadow-lg rounded-3xl cursor-pointer"
            loading="lazy"
            onClick={handleClick}
            onLoad={handleImageLoad}
            onError={(e) => { console.error("Failed to load image in PhotoBlock:", imageUrl); e.target.style.display = 'none'; }}
          />
          <WatermarkOverlay />
          {buyOverlay}
          {engagementOverlay}
        </div>
      );
    }

    // variant 1 (default): full-bleed on desktop (mobile handled above).
    return (
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-x-hidden group">
        <img
          ref={imgRef}
          src={getSizedUrl(imageUrl, 'display')}
          alt={caption || "Photo"}
          className="w-full h-auto object-cover cursor-pointer"
          loading="lazy"
          onClick={handleClick}
          onLoad={handleImageLoad}
          onError={(e) => {
            console.error("Failed to load image in PhotoBlock:", imageUrl);
            e.target.style.display = 'none';
          }}
        />
        <WatermarkOverlay />
        {buyOverlay}
        {engagementOverlay}
      </div>
    );
  };

  return (
    <div className="w-full relative">
      {renderImage()}
      {caption && variant !== 3 && renderCaption()}
    </div>
  );
};

export default PhotoBlock;
