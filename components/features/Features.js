import React from "react";
import { useInView } from "react-intersection-observer";

const Feature = ({ title, description, imageUrl, reverse }) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1, // Lower the threshold
    rootMargin: "-20px", // Adjust this value to trigger the animation a bit earlier or later
  });

  // Decide the order and animation class of elements based on `reverse` prop and inView status
  const orderClasses = reverse ? "md:flex-row-reverse" : "md:flex-row";
  const animationClass = inView ? (reverse ? "animate-rotateRight" : "animate-rotateLeft") : "";

  const imageComponent = (
    <div ref={ref} className={`${animationClass} ${orderClasses} flex-1 p-4 ${reverse ? "lg:order-2" : ""}`} style={{ flexBasis: "65%" }}>
      <img className="rounded-lg w-full h-auto" src={imageUrl} alt={title} />
    </div>
  );

  const textComponent = (
    <div className={`flex-1 text-left p-3 ${reverse ? "lg:order-1 mt-0 lg:mt-28" : "mt-28"}`} style={{ flexBasis: "35%" }}>
      <h3 className="text-5xl font-bold mb-3 tracking-tighter">{title}</h3>
      <p className="text-gray-700 text-lg">{description}</p>
    </div>
  );

  return (
    <div className={`flex flex-col lg:flex-row mb-20 ${reverse ? "lg:flex-row-reverse" : ""}`}>
      {textComponent}
      {imageComponent}
    </div>
  );
};

export default Feature;
