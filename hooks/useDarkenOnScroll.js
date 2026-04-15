import { useEffect, useContext } from "react";
import { useScrollContext } from "./ScrollContext";

export const useDarkenOnScroll = () => {
  const { isScrolled, setIsScrolled } = useScrollContext();

  useEffect(() => {
    const handleScroll = () => {
      const threshold = 180;
      const bottomThreshold = 50;
      const bottomReached = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - bottomThreshold;

      if (bottomReached) {
        setIsScrolled(false); // Reset when bottom is reached
      } else {
        setIsScrolled(window.scrollY > threshold);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [setIsScrolled]);

  useEffect(() => {
    if (isScrolled) {
      document.body.style.backgroundColor = "#343a40"; // Dark background color
      document.body.style.color = "#ffffff"; // Light text color
      Array.from(document.links).forEach((link) => {
        link.style.color = "#ffffff"; // Light color for links
      });
    } else {
      document.body.style.backgroundColor = ""; // Reset to original styles
      document.body.style.color = ""; // Reset to original text color
      Array.from(document.links).forEach((link) => {
        link.style.color = ""; // Reset links to original color
      });
    }
  }, [isScrolled]);
};
