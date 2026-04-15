import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import styles from "./KenBurnsSlideshowLayout.module.css";
import Text from "../../../text/Text";

const KenBurnsSlideshowLayout = ({ slides, currentImageIndex, transitioning, aspectRatios = [], currentMusicCredit }) => {
  const [showMusicCredit, setShowMusicCredit] = useState(true);

  useEffect(() => {
    // Show the music credit whenever it changes
    setShowMusicCredit(true);

    // Hide it after 5 seconds
    const timer = setTimeout(() => {
      setShowMusicCredit(false);
    }, 7000);

    return () => clearTimeout(timer);
  }, [currentMusicCredit]);

  // Filter the slides to extract only the images for proper aspect ratio handling
  const imageSlides = slides.filter((slide) => slide.type === "image");

  return (
    <div className={`${styles["kenburns-container"]} bg-black relative`}>
      {slides.map((slide, index) => {
        if (slide.type === "text") {
          // Render text slide
          return (
            <div key={index} className={`${styles["kenburns-text"]} bg-black text-white ${index === currentImageIndex ? (transitioning ? styles["kenburns-slide-out"] : styles["kenburns-visible"]) : styles["kenburns-hidden"]}`}>
              <div className="flex justify-center items-center h-full">
                <div className={`max-w-3xl px-4 ${styles["kenburns-zoom-text"]} font-serif2`}>
                  <Text layout="layout2" color="white">
                    <span className="drop-cap">{slide.content}</span>
                  </Text>
                </div>
              </div>
            </div>
          );
        } else if (slide.type === "image") {
          // Calculate the aspect ratio using the filtered imageSlides array
          const aspectRatio = aspectRatios[imageSlides.findIndex((imgSlide) => imgSlide.url === slide.url)];
          const isVertical = aspectRatio < 1;
          const isHorizontal = aspectRatio >= 1;

          return (
            <div key={index} className={`${styles["kenburns-image"]} ${isVertical ? styles["vertical"] : ""} ${isHorizontal ? styles["horizontal"] : ""} ${index === currentImageIndex ? (transitioning ? styles["kenburns-slide-out"] : styles["kenburns-visible"]) : styles["kenburns-hidden"]}`}>
              <img src={slide.url} alt={`Image ${index + 1}`} />
              {slide.caption && (
                <div className="absolute bottom-10 left-0 right-0 flex justify-center">
                  <div className="text-center text-gray-200 p-4 text-2xl max-w-3xl mx-4 leading-tight">{slide.caption}</div>
                </div>
              )}
            </div>
          );
        }
      })}
      {currentMusicCredit && <div className={`absolute bottom-4 left-4  text-white z-10 text-lg transition-opacity duration-1000 font-serif2 ${showMusicCredit ? "opacity-100" : "opacity-0"}`}>{currentMusicCredit}</div>}
    </div>
  );
};

KenBurnsSlideshowLayout.propTypes = {
  slides: PropTypes.array.isRequired, // Combined slides with both image and text types
  currentImageIndex: PropTypes.number.isRequired,
  transitioning: PropTypes.bool.isRequired,
  aspectRatios: PropTypes.array.isRequired,
  hideCaptionsOnMobile: PropTypes.bool.isRequired,
  currentMusicCredit: PropTypes.string,
};

export default KenBurnsSlideshowLayout;
