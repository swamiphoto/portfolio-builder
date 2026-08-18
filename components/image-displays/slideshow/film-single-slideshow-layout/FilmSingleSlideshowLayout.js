import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import styles from "./FilmSingleSlideshowLayout.module.css";

const FilmSingleSlideshowLayout = ({ slides, currentImageIndex, transitioning }) => {
  const [tilts, setTilts] = useState([]);
  const [zTilts, setZTilts] = useState([]);
  const [moveXs, setMoveXs] = useState([]);
  const [moveYs, setMoveYs] = useState([]);
  const [durations, setDurations] = useState([]);
  const [direction, setDirection] = useState("left");

  useEffect(() => {
    if (slides.length > 0) {
      // One value per slide index so lookups by index always line up.
      setTilts(slides.map(() => Math.random() * 12 - 6));
      setZTilts(slides.map(() => Math.random() * 20 - 10));
      setMoveXs(slides.map(() => `${Math.random() * 15 - 5}px`));
      setMoveYs(slides.map(() => `${Math.random() * 20 - 5}px`));
      setDurations(slides.map(() => `${Math.random() * 2 + 3}s`));
    }
  }, [slides]);

  useEffect(() => {
    setDirection(Math.random() > 0.5 ? "left" : "right");
  }, [currentImageIndex]);

  return (
    <div className={`${styles["film-single-container"]} mt-8 md:mt-0`}>
      {slides.map((slide, index) => {
        const isCurrentSlide = index === currentImageIndex;
        const isPreviousSlide = index < currentImageIndex;

        // Only the current slide shows; it animates out while transitioning.
        const stateClass = isCurrentSlide
          ? transitioning
            ? styles[`slide-out-${direction}`]
            : styles["visible"]
          : isPreviousSlide
          ? styles["hidden"]
          : styles["stacked"];

        if (slide.type === "image") {
          return (
            <div
              key={index}
              className={`${styles["film-single-image"]} ${stateClass}`}
              style={{
                "--rotate": `${tilts[index] || 0}deg`,
                "--rotateZ": `${zTilts[index] || 0}deg`,
                "--moveX": moveXs[index] || "0px",
                "--moveY": moveYs[index] || "0px",
                "--duration": durations[index] || "4s",
                zIndex: slides.length - index,
              }}>
              <img src={slide.url} alt={`Slide ${index + 1}`} />
              {slide.caption && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                  <div className="text-center text-gray-200 px-4 text-xl max-w-3xl leading-tight drop-shadow-lg">{slide.caption}</div>
                </div>
              )}
            </div>
          );
        }

        if (slide.type === "text") {
          return (
            <div
              key={index}
              className={`${styles["film-single-text"]} ${stateClass}`}
              style={{ "--rotate": `${tilts[index] || 0}deg`, zIndex: slides.length - index }}>
              <p className={`${styles["film-single-text-content"]} font-serif2`}>{slide.content}</p>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};

FilmSingleSlideshowLayout.propTypes = {
  slides: PropTypes.array.isRequired,
  currentImageIndex: PropTypes.number.isRequired,
  transitioning: PropTypes.bool.isRequired,
};

export default FilmSingleSlideshowLayout;
