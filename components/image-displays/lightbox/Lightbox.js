import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { HiOutlineX } from "react-icons/hi";
import { base64Encode, base64Decode, imageMapping } from "../../../common/images";

const Lightbox = () => {
  const router = useRouter();
  const { imageId } = router.query; // Get the encoded image ID from the query params

  const [currentImage, setCurrentImage] = useState(null);
  const [previousImageUrls, setPreviousImageUrls] = useState([]);
  const [nextImageUrls, setNextImageUrls] = useState([]);
  const [cursorType, setCursorType] = useState("default");

  // Preload image function
  const preloadImage = (src) => {
    const img = new Image();
    img.src = src;
  };

  // Fetch the navigation state from localStorage
  useEffect(() => {
    const navigationData = localStorage.getItem("imageNavigation");
    if (navigationData) {
      const { previousImageUrls, nextImageUrls, currentImage } = JSON.parse(navigationData);
      setPreviousImageUrls(previousImageUrls);
      setNextImageUrls(nextImageUrls);
      setCurrentImage(currentImage);

      // Preload the next and previous images
      if (nextImageUrls.length > 0) {
        preloadImage(nextImageUrls[0]); // Preload the next image
      }
      if (previousImageUrls.length > 0) {
        preloadImage(previousImageUrls[previousImageUrls.length - 1]); // Preload the previous image
      }
    }
  }, [imageId]);

  // Handle decoding and setting the image URL
  useEffect(() => {
    if (imageId) {
      const decodedImageUrl = base64Decode(imageId); // Decode the Base64-encoded image URL

      const matchingImage = imageMapping[decodedImageUrl];
      if (matchingImage) {
        setCurrentImage(matchingImage);
      } else {
        setCurrentImage(decodedImageUrl); // Set the dynamic image URL
      }
    }
  }, [imageId]);

  // Handle mouse movement to set the cursor type for navigation
  useEffect(() => {
    const handleMouseMove = (event) => {
      const containerWidth = window.innerWidth;
      const mouseX = event.clientX;

      if (mouseX < containerWidth / 2 && previousImageUrls.length > 0) {
        setCursorType("left");
      } else if (mouseX >= containerWidth / 2 && nextImageUrls.length > 0) {
        setCursorType("right");
      } else {
        setCursorType("default");
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [previousImageUrls, nextImageUrls]);

  // Handle image navigation on click (left or right)
  const handleClick = () => {
    if (cursorType === "left" && previousImageUrls.length > 0) {
      const previousImage = previousImageUrls[previousImageUrls.length - 1];
      const encodedPreviousImage = base64Encode(previousImage); // Encode the previous image URL

      // Update the localStorage with the new state
      localStorage.setItem(
        "imageNavigation",
        JSON.stringify({
          previousImageUrls: previousImageUrls.slice(0, -1),
          nextImageUrls: [currentImage, ...nextImageUrls],
          currentImage: previousImage,
        })
      );

      // Navigate to the previous image
      router.push(`/image/${encodedPreviousImage}`);
    }

    if (cursorType === "right" && nextImageUrls.length > 0) {
      const nextImage = nextImageUrls[0];
      const encodedNextImage = base64Encode(nextImage); // Encode the next image URL

      // Update the localStorage with the new state
      localStorage.setItem(
        "imageNavigation",
        JSON.stringify({
          previousImageUrls: [...previousImageUrls, currentImage],
          nextImageUrls: nextImageUrls.slice(1),
          currentImage: nextImage,
        })
      );

      // Navigate to the next image
      router.push(`/image/${encodedNextImage}`);
    }
  };

  const handleClose = (e) => {
    e.stopPropagation();

    // Retrieve the parent page from localStorage
    const parentPage = localStorage.getItem("parentPage");

    if (parentPage) {
      // Navigate back to the stored parent page
      router.push(parentPage);
    } else {
      // Fallback to the home page if no parent page is found
      router.push("/");
    }
  };

  if (!currentImage) {
    return <div>Image not found</div>;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      onClick={handleClick}
      style={{
        cursor: cursorType === "left" ? 'url("/left-arrow.svg") 24 24, auto' : cursorType === "right" ? 'url("/right-arrow.svg") 24 24, auto' : "default",
      }}>
      <button className="absolute top-4 right-4 text-white text-3xl p-2 opacity-70 hover:opacity-100 transition-opacity duration-200 ease-in-out z-60" onClick={handleClose} style={{ zIndex: 60 }}>
        <HiOutlineX />
      </button>
      <div className="relative w-full h-full flex items-center justify-center p-5">
        <img src={currentImage + "?width=1300"} alt="Current Image" className="max-h-full max-w-full object-contain" />
      </div>
    </div>
  );
};

export default Lightbox;
