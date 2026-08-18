import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import styles from "./PolaroidSlideshowLayout.module.css";

const PolaroidSlideshowLayout = ({ slides, currentImageIndex, transitioning }) => {
  const [tilts, setTilts] = useState([]);

  useEffect(() => {
    if (slides.length > 0) {
      setTilts(slides.map(() => Math.random() * 6 - 3));
    }
  }, [slides]);

  return (
    <div className={`${styles["polaroid-container"]} mt-8 md:mt-0`}>
      {slides.map((slide, index) => {
        const isCurrentSlide = index === currentImageIndex;
        // One at a time: current shows (and develops); everything else is hidden.
        // While transitioning out, the current one fades so the next crossfades in.
        const stateClass = isCurrentSlide && !transitioning ? styles["visible"] : styles["hidden"];

        if (slide.type === "image") {
          return (
            <div
              key={index}
              className={`${styles["polaroid"]} ${stateClass}`}
              style={{ "--rotate": `${tilts[index] || 0}deg`, zIndex: slides.length - index }}>
              <div className={styles["polaroid-photo"]}>
                <img src={slide.url} alt={`Slide ${index + 1}`} />
              </div>
              <div className={styles["polaroid-caption"]}>{slide.caption || ""}</div>
            </div>
          );
        }

        if (slide.type === "text") {
          return (
            <div
              key={index}
              className={`${styles["polaroid-text"]} ${stateClass}`}
              style={{ "--rotate": `${tilts[index] || 0}deg`, zIndex: slides.length - index }}>
              <p className={`${styles["polaroid-text-content"]} font-serif2`}>{slide.content}</p>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};

PolaroidSlideshowLayout.propTypes = {
  slides: PropTypes.array.isRequired,
  currentImageIndex: PropTypes.number.isRequired,
  transitioning: PropTypes.bool.isRequired,
};

export default PolaroidSlideshowLayout;
