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
    setSlideshowPlaying(false);
  }, []);
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
      case "kenburns":
        return <KenBurnsSlideshowLayout slides={slides} currentImageIndex={currentSlideIndex} transitioning={transitioning} aspectRatios={aspectRatios} hideCaptionsOnMobile={hideCaptionsOnMobile} currentMusicCredit={currentMusicCredit} />;
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
        <div className="fixed top-0 left-0 w-full flex justify-between items-center p-4 bg-black bg-opacity-90 border-b border-gray-800 z-50">
          <div className="flex items-center space-x-4">
            <HiOutlineArrowLeft className="text-gray-500 hover:text-white cursor-pointer" size={20} onClick={() => router.replace("/galleries")} />
            {slideshowPlaying ? <HiOutlinePause className="text-gray-500 hover:text-white cursor-pointer" size={24} onClick={handlePlayPauseSlideshow} /> : <HiOutlinePlay className="text-gray-500 hover:text-white cursor-pointer" size={24} onClick={handlePlayPauseSlideshow} />}
          </div>

          <div className="ml-auto flex space-x-4 text-sm text-gray-400">
            <button className="hover:text-white cursor-pointer" onClick={() => router.push(`/galleries/${slug}`)}>
              View Gallery
            </button>
          </div>
        </div>
      )}

      <main className="flex-grow flex justify-center items-center relative">
        {renderPhotos()}
        {youtubeUrl && <div id="youtube-player" className="absolute top-0 left-0 w-full h-full opacity-0 pointer-events-none"></div>}
      </main>

      {!isMobile && (
        <div className={`fixed top-4 left-4 flex items-center space-x-4 bg-white bg-opacity-80 p-3 shadow-md rounded-lg z-50 transition-opacity duration-1000 ${showControls ? "opacity-100" : "opacity-0"}`}>
          <HiOutlineArrowLeft
            className="hover:text-red-500 cursor-pointer"
            size={24}
            onClick={() => {
              handleToggleFullscreen();
              router.replace("/galleries");
            }}
          />
          {slideshowPlaying ? <HiOutlinePause className="hover:text-red-500 cursor-pointer" size={24} onClick={handlePlayPauseSlideshow} /> : <HiOutlinePlay className="hover:text-red-500 cursor-pointer" size={24} onClick={handlePlayPauseSlideshow} />}
          {isFullscreen ? <RxExitFullScreen className="hover:text-red-500 cursor-pointer" size={20} onClick={handleToggleFullscreen} /> : <RxEnterFullScreen className="hover:text-red-500 cursor-pointer" size={20} onClick={handleToggleFullscreen} />}

          <button className="hover:text-red-500 cursor-pointer" onClick={() => router.push(`/galleries/${slug}`)}>
            View Gallery
          </button>
        </div>
      )}
    </div>
  );
};

export default Slideshow;
