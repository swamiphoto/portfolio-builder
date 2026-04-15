import React from "react";
import Masonry from "react-masonry-css";
import { handleImageClick, getCloudimageUrl } from "../../../../common/images";
import { useRouter } from "next/router";
import styles from "./MasonryGallery.module.css";

const MasonryGallery = ({ imageUrls = [] }) => {
  const router = useRouter();

  const breakpointColumnsObj = {
    default: 2, // Use 2 columns for larger screens
    700: 1, // Use 1 column for smaller screens (mobile)
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`${styles.masonryGallery} w-full max-w-6xl mx-auto`}>
        <div className="gallery-content flex-grow md:p-4 overflow-hidden">
          <Masonry breakpointCols={breakpointColumnsObj} className="flex w-auto -ml-5" columnClassName="pl-5">
            {imageUrls.length > 0 ? (
              imageUrls.map((image, index) => {
                const imageUrl = getCloudimageUrl(image, { width: 600, quality: 75 });
                return (
                  <div key={index} className="mb-5">
                    <img 
                      src={imageUrl} 
                      alt={`Image ${index + 1}`} 
                      className="w-full h-auto transition-opacity duration-500 ease-in shadow-lg rounded-3xl" 
                      onError={(e) => {
                        console.error("Image failed to load:", imageUrl, "Original URL:", image);
                        e.target.style.display = 'none';
                      }} 
                      onClick={() => handleImageClick(image, imageUrls, router)} 
                    />
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
