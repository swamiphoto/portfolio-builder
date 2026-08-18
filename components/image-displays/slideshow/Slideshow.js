import React, { useEffect, useState, useRef } from "react";
import { HiOutlinePause, HiOutlinePlay, HiOutlineArrowLeft, HiOutlineArrowRight } from "react-icons/hi2";
import { AiOutlinePlayCircle } from "react-icons/ai";
import { RxEnterFullScreen, RxExitFullScreen } from "react-icons/rx";
import { useMediaQuery } from "react-responsive";
import { useRouter } from "next/router";
import useYouTubePlayer from "./useYouTubePlayer";
import FilmStackSlideshowLayout from "./film-stack-slideshow-layout/FilmStackSlideshowLayout";
import FilmSingleSlideshowLayout from "./film-single-slideshow-layout/FilmSingleSlideshowLayout";
import KenBurnsSlideshowLayout from "./kenburns-slideshow-layout/KenBurnsSlideshowLayout";
import PolaroidSlideshowLayout from "./polaroid-slideshow-layout/PolaroidSlideshowLayout";
import { TfiClose } from "react-icons/tfi";
import styles from "./Slideshow.module.css";

const Slideshow = ({ slides = [], layout = "film-stack", title = "Gallery Title", youtubeUrl, subtitle = "Subtitle", customDurations = {}, duration = 10000, thumbnailUrl = "", hideCaptionsOnMobile = true, slug, musicCredits = [], initialModalOpen = true, disableFullscreen = false }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [aspectRatios, setAspectRatios] = useState([]);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [slideshowPlaying, setSlideshowPlaying] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(initialModalOpen);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimeout = useRef(null);
  const [currentMusicCredit, setCurrentMusicCredit] = useState("");

  const playerRef = useYouTubePlayer(youtubeUrl ? youtubeUrl.split("v=")[1] || youtubeUrl.split("/").pop().split("?")[0] : "", setIsPlayerReady);
  const slideshowInterval = useRef(null);
  const isMobile = useMediaQuery({ query: "(max-width: 768px)" });
  const router = useRouter();

  // Calculate aspect ratios for image slides
  useEffect(() => {
    const calculateAspectRatios = async () => {
      const imageSlides = slides.filter((slide) => slide.type === "image");
      const ratios = await Promise.all(
        imageSlides.map((slide) => {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              const aspectRatio = img.width / img.height;
              resolve(aspectRatio);
            };
            img.onerror = () => resolve(1); // default to 1 if there's an error
            img.src = slide.url;
          });
        })
      );
      setAspectRatios(ratios);
      setImagesLoaded(true);
    };

    if (slides.length > 0) calculateAspectRatios();
  }, [slides]);

  useEffect(() => {
    if (imagesLoaded && isPlayerReady && slides.length > 0 && slideshowPlaying) {
      startSlideshow();
      handlePlayPauseAudio();
      return () => clearInterval(slideshowInterval.current);
    }
  }, [imagesLoaded, isPlayerReady, slides, slideshowPlaying]);

  useEffect(() => {
    if (slideshowPlaying) {
      startSlideshow();
      return () => clearInterval(slideshowInterval.current);
    }
  }, [slideshowPlaying]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "ArrowLeft") {
        handlePreviousPhoto();
      } else if (event.key === "ArrowRight") {
        handleNextPhoto();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentSlideIndex]);

  const startSlideshow = () => {
    clearInterval(slideshowInterval.current);
    const slideDuration = customDurations[currentSlideIndex] || duration;

    slideshowInterval.current = setTimeout(() => {
      setTransitioning(true);
      setCurrentSlideIndex((prevIndex) => (prevIndex + 1) % slides.length); // Loop through all slides
      setTransitioning(false);

      if (slideshowPlaying) startSlideshow();
    }, slideDuration - 2000);
  };
  useEffect(() => {
    if (initialModalOpen) setSlideshowPlaying(false);
  }, [initialModalOpen]);
  const handlePlayPauseAudio = () => {
    if (playerRef.current && isPlayerReady) {
      if (audioPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.unMute();
        playerRef.current.playVideo();
      }
      setAudioPlaying(!audioPlaying);
    }
  };

  const handlePlayPauseSlideshow = () => {
    if (slideshowPlaying) {
      clearInterval(slideshowInterval.current);
      if (playerRef.current) playerRef.current.pauseVideo();
      setSlideshowPlaying(false);
      setAudioPlaying(false);
    } else {
      if (playerRef.current) {
        playerRef.current.unMute();
        playerRef.current.playVideo();
      }
      startSlideshow();
      handlePlayPauseAudio();
      setSlideshowPlaying(true);
    }
  };

  const handleToggleFullscreen = () => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handlePreviousPhoto = () => {
    if (currentSlideIndex > 0) {
      setTransitioning(true);
      setTimeout(() => {
        setCurrentSlideIndex((prevIndex) => prevIndex - 1);
        setTransitioning(false);
      }, 2000);
    }
  };

  const handleNextPhoto = () => {
    if (currentSlideIndex < slides.length - 1) {
      setTransitioning(true);
      setTimeout(() => {
        setCurrentSlideIndex((prevIndex) => prevIndex + 1);
        setTransitioning(false);
      }, 2000);
    }
  };

  const handleStartSlideshow = () => {
    setIsModalOpen(false); // Close the modal when the slideshow starts
    handlePlayPauseSlideshow(); // Start the slideshow by toggling the play/pause state
  };

  const renderPhotos = () => {
    switch (layout) {
      case "film-stack":
        return <FilmStackSlideshowLayout slides={slides} currentImageIndex={currentSlideIndex} transitioning={transitioning} aspectRatios={aspectRatios} hideCaptionsOnMobile={hideCaptionsOnMobile} />;
      case "film-single":
        return <FilmSingleSlideshowLayout slides={slides} currentImageIndex={currentSlideIndex} transitioning={transitioning} aspectRatios={aspectRatios} hideCaptionsOnMobile={hideCaptionsOnMobile} />;
      case "polaroid":
        return <PolaroidSlideshowLayout slides={slides} currentImageIndex={currentSlideIndex} transitioning={transitioning} />;
      case "kenburns":
        return <KenBurnsSlideshowLayout slides={slides} currentImageIndex={currentSlideIndex} transitioning={transitioning} aspectRatios={aspectRatios} hideCaptionsOnMobile={hideCaptionsOnMobile} />;
      default:
        return null;
    }
  };

  // Function to show controls and reset hide timeout
  const handleMouseMovement = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 5000); // Hide controls after 5 seconds of inactivity
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMovement);
    return () => {
      window.removeEventListener("mousemove", handleMouseMovement);
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (musicCredits.length > 0) {
      setCurrentMusicCredit(musicCredits[0]);
    }
  }, [musicCredits]);

  // Back arrow returns to the gallery this slideshow belongs to (one level up from
  // the /slideshow route), falling back to the slug-based gallery path.
  const backToGallery = () => {
    if (isFullscreen) handleToggleFullscreen();
    const parent = router.asPath.replace(/[?#].*$/, "").replace(/\/slideshow\/?$/, "");
    router.push(parent || (slug ? `/galleries/${slug}` : "/"));
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* For Mobile Version */}
      {isMobile && isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center">
          {/* Translucent white background */}
          <div className="absolute inset-0 bg-gray-300 opacity-95"></div>

          {/* Modal with min and max dynamic height */}
          <div className="relative z-50 bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto flex flex-col" style={{ margin: "15px", minHeight: "calc(100dvh - 30px)", maxHeight: "calc(100dvh - 30px)" }}>
            {/* Close button positioned over the image in top-right corner */}
            <button onClick={() => router.push(`/galleries/${slug}`)} className="absolute top-5 right-5 z-60 text-gray-500 hover:text-gray-800">
              <TfiClose className="h-5 w-5" />
            </button>

            {/* Image taking up full width */}
            <div className="w-full">
              <img src={thumbnailUrl} alt="Cover Image" className="w-full h-auto object-cover rounded-t-2xl" />
            </div>

            {/* Scrollable text section */}
            <div className="flex-grow overflow-y-auto p-7 text-left">
              <h2 className="text-2xl font-semibold mb-2">{title}</h2>
              <p className="text-gray-600 mb-4">{subtitle}</p>
            </div>

            {/* Fixed button at the bottom */}
            <div className="p-7 bg-white rounded-b-2xl">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  handlePlayPauseSlideshow(); // Start slideshow
                }}
                className="w-full px-8 py-4 bg-black text-white font-bold uppercase tracking-wider cursor-pointer">
                Start Music Show
              </button>
            </div>
          </div>
        </div>
      )}

      {/* For Non-Mobile (Desktop and Larger Screens) */}
      {!isMobile && isModalOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center">
          {/* Translucent white background */}
          <div className="absolute inset-0 bg-gray-300 opacity-95"></div>

          {/* Full height modal with margin and shadow */}
          <div className="relative z-[100] bg-white  rounded-2xl shadow-xl w-full mx-auto flex" style={{ margin: "15px", height: "calc(100% - 30px)" }}>
            {/* Left 2/3: Cover image with no padding */}
            <div className="w-2/3 h-full">
              <img src={thumbnailUrl} alt="Cover Image" className="w-full h-full object-cover rounded-l-lg" />
            </div>

            {/* Right 1/3: Text and button */}
            <div className="w-1/3 h-full p-10 pr-16 flex flex-col justify-center items-start text-left">
              <h2 className="text-5xl font-serif2 mb-4">{title}</h2>
              <p className="text-xl text-gray-600 mb-6">{subtitle}</p>

              {/* Styled button to start slideshow and dismiss modal */}
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  if (!disableFullscreen) handleToggleFullscreen();
                  handlePlayPauseSlideshow(); // Start slideshow
                }}
                className="px-8 py-4 bg-black hover:opacity-80 text-white font-bold uppercase tracking-wider cursor-pointer">
                Start Music Show
              </button>
            </div>

            {/* Close button in top-right corner */}
            <button onClick={() => router.push("/galleries")} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
              <TfiClose className={`h-5 w-5`} />
            </button>
          </div>
        </div>
      )}

      {isMobile && !isModalOpen && (
        <div className="fixed top-0 left-0 w-full flex items-center gap-4 p-4 bg-black bg-opacity-90 border-b border-gray-800 z-50">
          <HiOutlineArrowLeft className="text-gray-500 hover:text-white cursor-pointer" size={20} onClick={backToGallery} />
          {slideshowPlaying ? <HiOutlinePause className="text-gray-500 hover:text-white cursor-pointer" size={24} onClick={handlePlayPauseSlideshow} /> : <HiOutlinePlay className="text-gray-500 hover:text-white cursor-pointer" size={24} onClick={handlePlayPauseSlideshow} />}
        </div>
      )}

      <main className="flex-grow flex justify-center items-center relative">
        {renderPhotos()}
        {youtubeUrl && <div id="youtube-player" className="absolute top-0 left-0 w-full h-full opacity-0 pointer-events-none"></div>}
      </main>

      {!isMobile && (
        <div
          className={`fixed top-4 left-4 flex items-center gap-3.5 px-3.5 py-2.5 z-50 transition-opacity duration-1000 ${showControls ? "opacity-100" : "opacity-0"}`}
          style={{
            background: "rgba(28,22,16,0.68)",
            border: "1px solid rgba(200,170,120,0.18)",
            borderRadius: 9,
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            color: "rgba(233,222,203,0.82)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          <HiOutlineArrowLeft className="cursor-pointer transition-colors hover:text-white" size={17} onClick={backToGallery} />
          {slideshowPlaying ? <HiOutlinePause className="cursor-pointer transition-colors hover:text-white" size={17} onClick={handlePlayPauseSlideshow} /> : <HiOutlinePlay className="cursor-pointer transition-colors hover:text-white" size={17} onClick={handlePlayPauseSlideshow} />}
          {isFullscreen ? <RxExitFullScreen className="cursor-pointer transition-colors hover:text-white" size={16} onClick={handleToggleFullscreen} /> : <RxEnterFullScreen className="cursor-pointer transition-colors hover:text-white" size={16} onClick={handleToggleFullscreen} />}
        </div>
      )}

      {/* Music credit — a "now playing" ticker that slides in from the left,
          holds, then tickers back off the edge. Works across all layouts. */}
      {currentMusicCredit && (
        <div className={styles["now-playing"]}>
          <span
            style={{
              fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
              fontSize: 8.5,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "rgba(232,201,143,0.6)",
            }}
          >
            Music Credits
          </span>
          <div className={styles["now-playing-row"]}>
            <div className={styles["now-playing-eq"]} aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <span
              style={{
                fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                fontSize: 14,
                fontWeight: 400,
                letterSpacing: "0.01em",
                color: "rgba(233,222,203,0.9)",
              }}
            >
              {currentMusicCredit}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Slideshow;
