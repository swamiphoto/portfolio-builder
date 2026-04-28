// components/admin/slideshow-builder/SlideshowBuilder.js
import { useState, useCallback, useEffect, useRef } from "react";
import SlideshowSidebar from "./SlideshowSidebar";
import PhotoPickerModal from "../gallery-builder/PhotoPickerModal";
import Slideshow from "../../image-displays/slideshow/Slideshow";

function collectGalleryImages(blocks) {
  const urls = [];
  for (const block of blocks || []) {
    if (block.type === "photo" && block.imageUrl) urls.push(block.imageUrl);
    if ((block.type === "stacked" || block.type === "masonry") && block.imageUrls) {
      urls.push(...block.imageUrls);
    }
  }
  return urls;
}

export default function SlideshowBuilder({ initialGallery, galleryIndex, allGalleries }) {
  const [gallery, setGallery] = useState(() => {
    if (initialGallery.draft) return { ...initialGallery, ...initialGallery.draft };
    return initialGallery;
  });

  const [publishing, setPublishing] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState("idle");
  const [hasDraft, setHasDraft] = useState(!!initialGallery.draft);
  const [collapsed, setCollapsed] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [libraryImages, setLibraryImages] = useState(null);
  const [libraryData, setLibraryData] = useState(null);
  const [libraryLoading, setLibraryLoading] = useState(false);

  const allGalleriesRef = useRef(allGalleries);
  useEffect(() => { allGalleriesRef.current = allGalleries; }, [allGalleries]);

  const galleryRef = useRef(gallery);
  useEffect(() => { galleryRef.current = gallery; }, [gallery]);

  const isFirstRender = useRef(true);

  // Autosave — 1.5s debounce, same pattern as GalleryBuilder
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setAutosaveStatus("unsaved");
    const timer = setTimeout(async () => {
      const g = galleryRef.current;
      if (!g.slug) return;
      setAutosaveStatus("saving");
      try {
        const draftData = { ...g };
        delete draftData.draft;
        const updatedGalleries = allGalleriesRef.current.map((x, i) =>
          i === galleryIndex ? { ...x, draft: draftData } : x
        );
        const res = await fetch("/api/admin/galleries", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ galleries: updatedGalleries }),
        });
        if (res.ok) { setAutosaveStatus("saved"); setHasDraft(true); }
        else setAutosaveStatus("unsaved");
      } catch { setAutosaveStatus("unsaved"); }
    }, 1500);
    return () => clearTimeout(timer);
  }, [gallery, galleryIndex]);

  const fetchLibrary = useCallback(() => {
    if (libraryImages !== null) return;
    setLibraryLoading(true);
    fetch("/api/admin/library")
      .then(r => r.json())
      .then(data => {
        setLibraryImages(data.images || data.allImages || []);
        setLibraryData(data);
      })
      .catch(() => setLibraryImages([]))
      .finally(() => setLibraryLoading(false));
  }, [libraryImages]);

  const handlePickCover = () => { fetchLibrary(); setCoverPickerOpen(true); };

  const handleCoverConfirm = (urls) => {
    setCoverPickerOpen(false);
    if (urls.length === 0) return;
    setGallery(prev => ({
      ...prev,
      slideshowSettings: { ...(prev.slideshowSettings || {}), coverImageUrl: urls[0] },
    }));
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const g = galleryRef.current;
      if (!g.slug) { alert("Gallery has no slug."); setPublishing(false); return; }
      const publishedGallery = { ...g, status: "published" };
      delete publishedGallery.draft;
      const updatedGalleries = allGalleriesRef.current.map((x, i) =>
        i === galleryIndex ? publishedGallery : x
      );
      const res = await fetch("/api/admin/galleries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ galleries: updatedGalleries }),
      });
      if (!res.ok) throw new Error(`Publish failed ${res.status}`);
      setGallery(publishedGallery);
      setHasDraft(false);
      setAutosaveStatus("saved");
    } catch (err) {
      alert(`Error publishing: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  // Derive live preview slides
  const ss = gallery.slideshowSettings || {};
  const excludedSet = new Set(ss.excludedImageUrls || []);
  const allImages = collectGalleryImages(gallery.blocks);
  const coverUrl = ss.coverImageUrl;

  let slides = allImages
    .filter(url => !excludedSet.has(url))
    .map(url => ({ type: "image", url }));

  if (coverUrl && !excludedSet.has(coverUrl)) {
    slides = [
      { type: "image", url: coverUrl },
      ...slides.filter(s => s.url !== coverUrl),
    ];
  }

  const isPublished = initialGallery.status === "published";

  return (
    <div className="flex h-screen bg-stone-50">
      {!collapsed ? (
        <SlideshowSidebar
          gallery={gallery}
          onChange={setGallery}
          onPublish={handlePublish}
          publishing={publishing}
          autosaveStatus={autosaveStatus}
          hasDraft={hasDraft}
          isPublished={isPublished}
          onPickCover={handlePickCover}
          onCollapse={() => setCollapsed(true)}
        />
      ) : (
        <button
          onClick={() => setCollapsed(false)}
          className="absolute left-3 top-3 z-20 w-7 h-7 flex items-center justify-center bg-white border border-stone-200 text-stone-400 hover:text-stone-800 shadow-sm transition-colors text-sm leading-none"
        >
          →
        </button>
      )}

      {/* Live Slideshow preview — transform creates a containing block so Slideshow's fixed overlay stays within this panel */}
      <div className="flex-1 relative overflow-hidden" style={{ transform: "translateZ(0)" }}>
        {slides.length === 0 ? (
          <div className="flex items-center justify-center h-full text-stone-300 text-sm">
            Add photos to your gallery to preview the slideshow
          </div>
        ) : (
          <Slideshow
            key={`${ss.layout || "kenburns"}-${ss.youtubeLink || "no-music"}`}
            slides={slides}
            layout={ss.layout || "kenburns"}
            title={ss.title || gallery.name || ""}
            subtitle={ss.description || gallery.description || ""}
            youtubeUrl={ss.youtubeLink || ""}
            thumbnailUrl={coverUrl || gallery.thumbnailUrl || ""}
            musicCredits={ss.musicCredit ? [ss.musicCredit] : []}
            slug={gallery.slug}
            disableFullscreen
          />
        )}
      </div>

      {coverPickerOpen && (
        <PhotoPickerModal
          images={libraryImages || []}
          libraryConfig={libraryData}
          loading={libraryLoading}
          blockType="photo"
          onConfirm={handleCoverConfirm}
          onClose={() => setCoverPickerOpen(false)}
          defaultFolder={(() => {
            const firstImg = collectGalleryImages(gallery.blocks)[0];
            if (!firstImg) return undefined;
            const match = firstImg.match(/\/photos\/(.+)\/[^/]+$/);
            return match ? match[1] : undefined;
          })()}
        />
      )}
    </div>
  );
}
