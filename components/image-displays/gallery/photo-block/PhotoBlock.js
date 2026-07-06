import React from "react";
import { getSizedUrl } from "../../../../common/imageUtils";
import BuyPrintButton from "../../print/BuyPrintButton";

const PhotoBlock = ({ imageUrl, caption = "", variant = 1, onImageClick, print }) => {
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
    return <p className="my-4 md:mb-20 font-medium text-sm md:text-xl italic text-center max-w-3xl mx-auto">{caption}</p>;
  };

  const renderImage = () => {
    if (variant === 2) {
      const displayWidth = aspectRatio !== null && aspectRatio < 1
        ? `${(72 * aspectRatio).toFixed(1)}%`
        : '72%';
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
      {caption && renderCaption()}
    </div>
  );
};

export default PhotoBlock;
