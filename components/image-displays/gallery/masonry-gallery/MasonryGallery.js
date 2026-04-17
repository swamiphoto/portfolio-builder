import React from "react";
import Masonry from "react-masonry-css";
import { getSizedUrl } from "../../../../common/imageUtils";
import styles from "./MasonryGallery.module.css";

const MasonryGallery = ({ images = [], imageUrls = [], onImageClick }) => {
  const items = images.length > 0 ? images : imageUrls.map(url => ({ url, caption: '' }));
  const breakpointColumnsObj = { default: 2, 700: 1 };

  return (
    <div className="flex flex-col items-center">
      <div className={`${styles.masonryGallery} w-full max-w-6xl mx-auto`}>
        <div className="gallery-content flex-grow md:p-4 overflow-hidden">
          <Masonry breakpointCols={breakpointColumnsObj} className="flex w-auto -ml-5" columnClassName="pl-5">
            {items.length > 0 ? (
              items.map(({ url, caption }, index) => {
                const imageUrl = getSizedUrl(url, 'display');
                return (
                  <div key={index} className="mb-5">
                    <img
                      src={imageUrl}
                      alt={caption || `Image ${index + 1}`}
                      className="w-full h-auto transition-opacity duration-500 ease-in shadow-lg rounded-3xl cursor-pointer"
                      onError={(e) => {
                        console.error("Image failed to load:", imageUrl);
                        e.target.style.display = 'none';
                      }}
                      onClick={() => onImageClick && onImageClick(index)}
                    />
                    {caption && (
                      <p className="mt-2 text-sm italic text-center text-gray-500">{caption}</p>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-center text-gray-500">No images available.</p>
            )}
          </Masonry>
        </div>
      </div>
    </div>
  );
};

export default MasonryGallery;
