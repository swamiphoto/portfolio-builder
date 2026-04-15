import React, { useRef, useState, useEffect, useMemo } from "react";
import Masonry from "react-masonry-css";
import { handleImageClick } from "../../../../common/images";
import { useRouter } from "next/router";
import { useMediaQuery } from "react-responsive";
import { getCloudimageUrl } from "../../../../common/images";
import { FiCopy } from "react-icons/fi"; // Icon for copy action
import styles from "./AdminGallery.module.css"; // Use a separate CSS module for admin-specific styles

const AdminGallery = ({ name, images, texts, description, gallery } = {}) => {
  const [selectedImages, setSelectedImages] = useState([]); // State for storing selected images
  const [hasMounted, setHasMounted] = useState(false); // Ensure rendering only after component mounts on the client
  const masonryRef = useRef(null);
  const router = useRouter();
  const isMobile = useMediaQuery({ query: "(max-width: 768px)" });

  useEffect(() => {
    // Set hasMounted to true only after client-side rendering starts
    setHasMounted(true);
  }, []);

  // Extract images from gallery blocks (images are already fetched server-side)
  const allImages = useMemo(() => {
    if (gallery && gallery.blocks) {
      const imageList = [];
      for (const block of gallery.blocks) {
        if (block.type === "photo" && block.imageUrl) {
          imageList.push(block.imageUrl);
        } else if (block.type === "stacked" || block.type === "masonry") {
          // Images are already fetched server-side, so imageUrls should be populated
          if (block.imageUrls && block.imageUrls.length > 0) {
            imageList.push(...block.imageUrls);
          }
        }
      }
      return imageList;
    } else if (images) {
      return images;
    }
    return [];
  }, [gallery, images]);

  const handleDownClick = () => {
    if (masonryRef.current) {
      masonryRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const breakpointColumnsObj = {
    default: 3,
    700: 1,
  };

  const getFilename = (imageUrl) => {
    return imageUrl.split("/").pop();
  };

  const getCleanImageUrl = (imageUrl) => {
    // Extract the original image URL from either cloudimg.io format (for migration) or our new API format
    let cleanUrl = imageUrl;
    
    // Remove cloudimg.io prefix if present (for backward compatibility during migration)
    cleanUrl = cleanUrl.replace(/^https?:\/\/[^\/]+\.cloudimg\.io\//, "");
    
    // Remove our API endpoint prefix if present
    cleanUrl = cleanUrl.replace(/^\/?api\/resize-image\?url=/, "");
    
    // Extract URL from query parameters if it's an API URL
    if (cleanUrl.includes("url=")) {
      const urlMatch = cleanUrl.match(/url=([^&]+)/);
      if (urlMatch) {
        cleanUrl = decodeURIComponent(urlMatch[1]);
      }
    }
    
    // Remove query parameters
    cleanUrl = cleanUrl.split("?")[0];
    
    // If it doesn't start with http, ensure it's a full URL
    if (!cleanUrl.startsWith("http")) {
      cleanUrl = `https://${cleanUrl}`;
    }
    
    return cleanUrl;
  };

  const handleCopyToClipboard = (imageUrl) => {
    const cleanUrl = getCleanImageUrl(imageUrl);
    navigator.clipboard
      .writeText(cleanUrl)
      .then(() => {
        // alert("Copied to clipboard: " + cleanUrl);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  // Handle image selection
  const handleImageSelect = (imageUrl) => {
    const cleanUrl = getCleanImageUrl(imageUrl);
    if (selectedImages.includes(cleanUrl)) {
      setSelectedImages(selectedImages.filter((url) => url !== cleanUrl));
    } else {
      setSelectedImages([...selectedImages, cleanUrl]);
    }
  };

  // Handle "Get JSON" button click
  const handleGetJson = () => {
    const jsonOutput = JSON.stringify(selectedImages, null, 2);
    navigator.clipboard
      .writeText(jsonOutput)
      .then(() => {
        alert("Copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy JSON: ", err);
      });
  };

  // Only render after the component has mounted to avoid hydration issues
  if (!hasMounted) {
    return null;
  }

  return (
    <div className={`${styles.adminGallery} h-screen overflow-auto`}>
      <div className="gallery-content flex-grow p-4 overflow-hidden">
        {/* Display the "Get JSON" button if at least one image is selected */}
        {selectedImages.length > 0 && (
          <button onClick={handleGetJson} className="mb-4 px-4 py-2 bg-blue-500 text-white rounded">
            Get JSON
          </button>
        )}

        <div ref={masonryRef} className={isMobile ? "mt-16" : ""}>
          <Masonry breakpointCols={breakpointColumnsObj} className="flex w-auto -ml-5" columnClassName="pl-5">
            {allImages.map((image, index) => (
              <div key={index} className="relative mb-5">
                {/* Checkbox for selecting images */}
                <input
                  type="checkbox"
                  className="absolute top-2 left-2 z-10"
                  style={{ width: "20px", height: "20px" }} // Increase checkbox size
                  onChange={() => handleImageSelect(getCloudimageUrl(image, { width: 800, quality: 80 }))}
                  checked={selectedImages.includes(getCleanImageUrl(getCloudimageUrl(image, { width: 800, quality: 80 })))}
                />
                <img
                  src={getCloudimageUrl(image, { width: 800, quality: 80 })}
                  className="w-full h-auto shadow-lg" // Removed opacity transition
                  onError={(e) => e.target.classList.add("hidden")}
                  onClick={selectedImages.length === 0 ? () => handleImageClick(image, allImages, router) : null} // Disable click if at least one image is selected
                />
                <div className="absolute top-2 right-2 bg-gray-800 text-white text-sm px-2 py-1 rounded font-sans">
                  {getFilename(image)}
                  <FiCopy className="inline-block ml-2 cursor-pointer" onClick={() => handleCopyToClipboard(getCloudimageUrl(image, { width: 800, quality: 80 }))} />
                </div>
              </div>
            ))}
          </Masonry>
        </div>
      </div>
    </div>
  );
};

export default AdminGallery;
