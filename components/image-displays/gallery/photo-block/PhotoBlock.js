import React from "react";
import { useRouter } from "next/router";
import { getCloudimageUrl, handleImageClick } from "../../../../common/images";

const PhotoBlock = ({ imageUrl, caption = "", variant = 1, allPhotos = [] }) => {
  const router = useRouter();
  const [isVertical, setIsVertical] = React.useState(false);

  const handleImageLoad = (e) => {
    setIsVertical(e.target.naturalHeight > e.target.naturalWidth);
  };

  const renderCaption = () => {
    return <p className="my-4 md:mb-20 font-medium text-sm md:text-xl italic text-center max-w-3xl mx-auto">{caption}</p>;
  };

  const renderImage = () => {
    if (variant === 1) {
      // Edge-to-edge layout without horizontal scroll
      return (
        <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
          <img 
            src={getCloudimageUrl(imageUrl, { width: 1400, quality: 75 })} 
            alt={caption || "Photo"} 
            className="w-full h-auto object-cover cursor-pointer" 
            loading="lazy" 
            onClick={() => handleImageClick(imageUrl, allPhotos, router)}
            onError={(e) => {
              console.error("Failed to load image in PhotoBlock:", imageUrl);
              e.target.style.display = 'none';
            }}
          />
        </div>
      );
    }

    if (variant === 2) {
      // Normal-width layout
      return (
        <div className="w-full flex justify-center">
          <img
            src={getCloudimageUrl(imageUrl, { width: 900, quality: 75 })}
            alt={caption || "Photo"}
            className={`w-full md:w-[72%] ${isVertical ? "md:w-[40%]" : ""} max-h-[calc(100vw * 0.35)] object-cover shadow-lg rounded-3xl transition-opacity duration-500 cursor-pointer`}
            loading="lazy"
            onClick={() => handleImageClick(imageUrl, allPhotos, router)}
            onLoad={handleImageLoad}
            onError={(e) => {
              console.error("Failed to load image in PhotoBlock:", imageUrl);
              e.target.style.display = 'none';
            }}
          />
        </div>
      );
    }

    // Default fallback (variant 1)
    return (
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden">
        <img 
          src={getCloudimageUrl(imageUrl, { width: 1400, quality: 75 })} 
          alt={caption || "Photo"} 
          className="w-full h-auto object-cover cursor-pointer" 
          loading="lazy" 
          onClick={() => handleImageClick(imageUrl, allPhotos, router)}
          onError={(e) => {
            console.error("Failed to load image in PhotoBlock:", imageUrl);
            e.target.style.display = 'none';
          }}
        />
      </div>
    );
  };

  return (
    <div className="w-full relative overflow-x-hidden">
      {/* Render Image Based on Variant */}
      {renderImage()}
      {/* Caption */}
      {caption && renderCaption()}
    </div>
  );
};

export default PhotoBlock;
