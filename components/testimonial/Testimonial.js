import React from "react";
import { useInView } from "react-intersection-observer";
import WiggleLine from "../wiggle-line/WiggleLine";

const Testimonial = ({ imageSrc, altText, testimony, name, role, reverse = false, layout = "layout1" }) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: "-20px",
  });

  // Layout 1: Image on the left with fixed spacing regardless of image height
  if (layout === "layout1") {
    const animationClass = inView ? "animate-fadeIn" : "";

    return (
      <div ref={ref} className={`flex flex-col md:flex-row w-full md:w-9/12 mx-auto items-center overflow-hidden p-4 md:p-6 mb-8 rounded-xl ${animationClass}`}>
        {/* Image on the Left with fixed spacing */}
        <div className="flex-shrink-0 mr-[20px]">
          <img
            src={imageSrc}
            alt={altText}
            className="w-auto h-full object-cover rounded" // You can adjust the height here, and the gap will remain 20px
          />
        </div>

        {/* Text content aligned center with the image */}
        <div className="flex-grow text-left flex flex-col justify-center">
          <p className="text-lg leading-7 tracking-tight text-gray-900 sm:text-xl sm:leading-8">{testimony}</p>
          {/* Name and Role below */}
          <div className="mt-4">
            <p className="font-semibold text-lg text-gray-900">{name}</p>
            <p className="text-gray-600 text-base">{role}</p>
          </div>
        </div>
      </div>
    );
  }

  // Layout 2: Optional Image with name and role on the side
  if (layout === "layout2") {
    return (
      <section className="bg-white px-6 lg:px-8 py-16 pb-24">
        <WiggleLine />
        <figure className="mx-auto max-w-2xl text-center">
          <blockquote className="mt-10 text-xl font-semibold leading-8 tracking-tight text-gray-900 sm:text-2xl sm:leading-9">
            <p>{testimony}</p>
          </blockquote>

          <figcaption className="mt-10 flex items-center justify-center space-x-6">
            {imageSrc && (
              <div className="h-16 w-16 flex-shrink-0">
                <img alt={altText} src={imageSrc} className="h-full w-full object-cover rounded-full" />
              </div>
            )}
            <div className="text-center">
              <div className="font-semibold text-2xl text-gray-500">— {name}</div>
              <div className="mt-0.5 text-gray-600">{role}</div>
            </div>
          </figcaption>
        </figure>
      </section>
    );
  }

  // Layout 3: Image and name/role above the text
  if (layout === "layout3") {
    return (
      <section className="bg-white px-6 lg:px-8 py-16 pb-24">
        <figure className="mx-auto max-w-2xl text-center">
          <figcaption className="flex flex-col items-center justify-center">
            {imageSrc && (
              <div className="h-20 w-20 mb-4">
                <img alt={altText} src={imageSrc} className="h-full w-full object-cover rounded-full" />
              </div>
            )}
            <div className="text-center">
              <div className="font-semibold text-2xl text-gray-500">{name}</div>
              <div className="mt-0.5 text-gray-600">{role}</div>
            </div>
          </figcaption>
          <blockquote className="mt-6 text-xl font-semibold leading-8 tracking-tight text-gray-900 sm:text-2xl sm:leading-9">
            <p>{testimony}</p>
          </blockquote>
        </figure>
        <WiggleLine />
      </section>
    );
  }

  return null; // Default if no layout is selected
};

export default Testimonial;
