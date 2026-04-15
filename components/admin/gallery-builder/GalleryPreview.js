import { useState, useEffect } from "react";
import Gallery from "../../image-displays/gallery/Gallery";

export default function GalleryPreview({ gallery, pages }) {
  const [debouncedGallery, setDebouncedGallery] = useState(gallery);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedGallery(gallery), 300);
    return () => clearTimeout(timer);
  }, [gallery]);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-white">
        {(debouncedGallery.blocks || []).length > 0 ? (
          <Gallery
            name={debouncedGallery.name}
            description={debouncedGallery.description}
            blocks={debouncedGallery.blocks}
            enableSlideshow={false}
            pages={pages}
            onBackClick={() => {}}
            onSlideshowClick={() => {}}
            onClientLoginClick={() => {}}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-300 text-sm">
            Add blocks to preview the gallery
          </div>
        )}
      </div>
    </div>
  );
}
