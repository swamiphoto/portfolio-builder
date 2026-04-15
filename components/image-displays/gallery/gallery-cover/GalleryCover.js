import React from "react";
import { HiOutlineArrowLeft } from "react-icons/hi2";

const GalleryCover = ({ name, description, enableSlideshow = false, enableClientView = false, onBackClick, onSlideshowClick, onClientLoginClick }) => {
  return (
    <div className="relative flex flex-col items-center justify-center text-gray-900 p-4 pb-10 md:p-20">
      <div className="text-center px-6">
        {name && <h1 className="text-4xl md:text-6xl font-serif2 mb-4">{name}</h1>}
        {description && <p className="text-lg md:text-xl max-w-xl mx-auto mb-6">{description}</p>}

        <div className="flex flex-col sm:flex-row items-center justify-center sm:space-x-4 space-y-4 sm:space-y-0 mt-6 w-full sm:w-auto">
          {enableSlideshow && (
            <button onClick={onSlideshowClick} className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 bg-gray-900 text-white text-base sm:text-lg font-medium hover:bg-gray-800 transition">
              View Music Show
            </button>
          )}

          {enableClientView && (
            <button onClick={onClientLoginClick} className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 border border-gray-500 text-gray-700 text-base sm:text-lg font-medium hover:text-black hover:border-gray-700 transition">
              Client Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GalleryCover;
