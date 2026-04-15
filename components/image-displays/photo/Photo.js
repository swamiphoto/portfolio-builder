import React, { useState } from "react";
import { useRouter } from "next/router"; // Next.js routing
import "./Photo.module.css";
import { useScrollContext } from "../../../hooks/ScrollContext";
import { getCloudimageUrl, handleImageClick } from "../../../common/images"; // Import handleImageClick

function Photo({ src, alt = "", layout = "default", caption = "", title = "", orientation = "horizontal", captionDesign = "design1", allPhotos = [] }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const { isScrolled } = useScrollContext();
  const router = useRouter();

  // Determine alt text based on available title or caption if alt is not provided
  const imageAltText = alt || title || caption || "© 2024 Swami Venkataramani";

  const imageClass = orientation === "vertical" ? "vertical-image" : "horizontal-image";

  // Function to render caption based on design
  const renderCaption = () => {
    if (captionDesign === "design1") {
      return <p className={`my-4 font-medium text-sm md:text-xl italic max-w-3xl mx-auto`}>{caption}</p>;
    } else if (captionDesign === "design2") {
      return <p className={`my-4 font-bold text-sm md:text-lg tracking-widest uppercase text-red-600 max-w-3xl mx-auto`}>{caption}</p>;
    }
    return null;
  };

  const renderDefaultLayout = () => (
    <div className="text-center mb-4 md:mb-10">
      <img
        src={getCloudimageUrl(src, { width: 1200, quality: 75 })}
        alt={imageAltText} // Use fallback for alt
        loading="lazy"
        className={`transition-opacity duration-500 ease-in-out rounded-3xl ${imageClass} ${isLoaded ? "opacity-100" : "opacity-0"} shadow-lg`}
        onLoad={() => setIsLoaded(true)}
        onClick={() => handleImageClick(src, allPhotos, router)} // Use the handleImageClick function
        style={{ cursor: "pointer" }}
      />
      {caption && renderCaption()} {/* Render caption based on design */}
    </div>
  );

  const renderPrintLayout = () => (
    <div className="flex flex-col xl:flex-row mb-10">
      <div className="w-full xl:w-2/3 flex justify-end p-0 xl:pl-6">
        <div className="md:m-3 max-w-full xl:max-w-[calc(100%-60px)]">
          <img
            src={src + "?width=1300"}
            alt={imageAltText} // Use fallback for alt
            loading="lazy"
            className={`xl:max-h-screen shadow-lg transition-opacity duration-500 ease-in-out rounded-3xl ${imageClass} ${isLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setIsLoaded(true)}
            onClick={() => handleImageClick(src, allPhotos, router)} // Use the handleImageClick function
            style={{ cursor: "pointer" }}
          />
        </div>
      </div>
      <div className={`w-full xl:w-1/3 p-6 xl:pt-20 text-left`}>
        <p className={`text-2xl font-bold`}>{title}</p>
        <p className={`text-lg mt-3`}>{caption}</p>
      </div>
    </div>
  );

  return <div className={`flex justify-center items-center ${!isLoaded ? "animate-pulse" : ""}`}>{layout === "print" ? renderPrintLayout() : renderDefaultLayout()}</div>;
}

export default Photo;
