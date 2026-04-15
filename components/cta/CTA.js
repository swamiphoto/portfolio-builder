import React, { useState } from "react";
import { ArrowRightIcon } from "@heroicons/react/24/solid";
import { Popover } from "antd";
//import CTAPopup from "./CTAPopup";
import { useInView } from "react-intersection-observer";
import "./CTA.module.css"; // Ensure this is correctly imported

const CTA = ({ label = "Book a Session", small = false, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (newOpenState) => {
    setIsOpen(newOpenState);
  };

  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1, // Lower the threshold
    rootMargin: "-20px", // Adjust this value to trigger the animation a bit earlier or later
  });

  const scrollToContact = () => {
    const contactSection = document.querySelector("#contact");
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Decide the order and animation class of elements based on `reverse` prop and inView status
  const orderClasses = "md:flex-row";
  const animationClass = inView ? "animate-rotateRight" : "";

  return (
    <div>
      {/* <Popover content={<CTAPopup onClose={() => setIsOpen(false)} />} placement="right" trigger="click" open={isOpen} onOpenChange={handleOpenChange}> */}
      <button
        ref={ref}
        onClick={scrollToContact}
        className={`${animationClass} ${orderClasses} ${
          small ? "text-lg py-3" : "text-2xl py-5"
        } tilt-button bg-black text-white font-mono px-10 inline-flex items-center justify-center cursor-pointer outline-none focus:outline-none transition-transform duration-300 ease-in-out hover:-rotate-6 ${className}`}>
        <span>{label}</span>
        <ArrowRightIcon className="w-5 h-5 ml-2" aria-hidden="true" />
      </button>
      {/* </Popover> */}
    </div>
  );
};

export default CTA;
