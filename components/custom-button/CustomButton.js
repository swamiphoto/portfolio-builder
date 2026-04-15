import React from "react";
import { ArrowRightIcon } from "@heroicons/react/24/solid";
import { useInView } from "react-intersection-observer";
import "./CustomButton.module.css";

const CustomButton = ({ label = "Book a Session", url, small = false, className = "", type = "button" }) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: "-20px",
  });

  const orderClasses = "md:flex-row";
  const animationClass = inView ? "animate-rotateRight" : "";

  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <button
        ref={ref}
        type={type}
        className={`${animationClass} ${orderClasses} ${
          small ? "text-lg py-3" : "text-2xl py-5"
        } tilt-button bg-black text-white font-mono px-10 inline-flex items-center justify-center cursor-pointer outline-none focus:outline-none transition-transform duration-300 ease-in-out hover:-rotate-6 ${className}`}>
        <span>{label}</span>
        <ArrowRightIcon className="w-5 h-5 ml-2" aria-hidden="true" />
      </button>
    </a>
  );
};

export default CustomButton;
