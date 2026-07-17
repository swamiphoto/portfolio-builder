import React from "react";
import { getSizedUrl } from "../../../../common/imageUtils";
import { captionStyleCss } from "../../../../common/captionStyles";
import BuyPrintButton from "../../print/BuyPrintButton";

// variant: 1 full-bleed | 2 centered | 3 side (image left, caption right).
// widthPct scales the centered layout (small/medium/large → 44/56/72).
const PhotoBlock = ({ imageUrl, caption = "", variant = 1, widthPct = 72, onImageClick, print, captionStyle = 'sans' }) => {
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
    <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      <BuyPrintButton print={print} imageUrl={imageUrl} />
    </div>
  );

  const renderCaption = () => {
    return <p className="my-4 md:mb-20 font-medium text-sm md:text-xl italic text-center max-w-3xl mx-auto" style={captionStyleCss(captionStyle)}>{caption}</p>;
  };

  const renderImage = () => {
    if (variant === 3) {
      // Side: image on the left, caption on the right (great for About pages).
      return (
        <div className="w-full md:w-[90%] max-w-5xl mx-auto flex flex-col md:flex-row md:items-center gap-6">
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
              {buyOverlay}
            </div>
          </div>
          <div className="w-full md:w-1/3 flex items-center">
            {caption && <p className="my-4 font-medium text-sm md:text-xl italic text-left mx-auto md:mx-0" style={captionStyleCss(captionStyle)}>{caption}</p>}
          </div>
        </div>
      );
    }

    if (variant === 2) {
      const displayWidth = aspectRatio !== null && aspectRatio < 1
        ? `${(widthPct * aspectRatio).toFixed(1)}%`
        : `${widthPct}%`;
      return (
        <div className="w-full flex justify-center py-2">
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
            {buyOverlay}
          </div>
        </div>
      );
    }

    // variant 1 (default): full-bleed
    return (
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-x-hidden group">
        <img
          src={getSizedUrl(imageUrl, 'display')}
          alt={caption || "Photo"}
          className="w-full h-auto object-cover cursor-pointer"
          loading="lazy"
          onClick={handleClick}
          onError={(e) => {
            console.error("Failed to load image in PhotoBlock:", imageUrl);
            e.target.style.display = 'none';
          }}
        />
        {buyOverlay}
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
