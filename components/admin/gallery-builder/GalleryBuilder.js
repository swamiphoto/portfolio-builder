// components/admin/gallery-builder/GalleryBuilder.js
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import BlockBuilder from "./BlockBuilder";
import GalleryPreview from "./GalleryPreview";
import PhotoPickerModal from "./PhotoPickerModal";
import {
  buildMultiImageFields,
  normalizeImageRefs,
} from "../../../common/assetRefs";

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function GalleryBuilder({ initialGallery, galleryIndex, allGalleries, isNew }) {
  const router = useRouter();

  // Working copy — starts from draft if one exists, otherwise from published fields
  const [gallery, setGallery] = useState(() => {
    if (initialGallery.draft) return { ...initialGallery, ...initialGallery.draft };
    return initialGallery;
  });

  const [libraryImages, setLibraryImages] = useState(null);
  const [libraryData, setLibraryData] = useState(null);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState("idle");
  const [hasDraft, setHasDraft] = useState(!!initialGallery.draft);
  const [thumbnailPickerOpen, setThumbnailPickerOpen] = useState(false);
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false);
  const [photoPickerBlockIndex, setPhotoPickerBlockIndex] = useState(null);

  const allGalleriesRef = useRef(allGalleries);
  useEffect(() => { allGalleriesRef.current = allGalleries; }, [allGalleries]);

  const galleryRef = useRef(gallery);
  useEffect(() => { galleryRef.current = gallery; }, [gallery]);

  const isFirstRender = useRef(true);

  // --- Autosave working copy as draft ---
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setAutosaveStatus("unsaved");

    const timer = setTimeout(async () => {
      const g = galleryRef.current;
      const draftData = { ...g };
      delete draftData.draft; // don't nest drafts

      // Need a slug to save
      let slug = g.slug;
      if (!slug && g.name) slug = generateSlug(g.name);
      if (!slug) return;

      setAutosaveStatus("saving");
      try {
        const galleries = allGalleriesRef.current;

        const updatedGalleries = isNew
          ? (() => {
              const existing = galleries.findIndex((x) => x.slug === slug);
              if (existing >= 0) {
                // Already created draft entry — update it
                return galleries.map((x) => x.slug === slug
                  ? { ...x, draft: draftData, slug }
                  : x
                );
              }
              // First autosave of a new gallery — create as draft entry
              return [...galleries, { slug, status: "draft", draft: draftData }];
            })()
          : galleries.map((x, i) => i === galleryIndex
              ? { ...x, draft: draftData }
              : x
            );

        const res = await fetch("/api/admin/galleries", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ galleries: updatedGalleries }),
        });

        if (res.ok) {
          setAutosaveStatus("saved");
          setHasDraft(true);
          if (isNew && !galleryRef.current.slug && slug) {
            setGallery((prev) => ({ ...prev, slug }));
          }
        } else {
          setAutosaveStatus("unsaved");
        }
      } catch {
        setAutosaveStatus("unsaved");
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [gallery, isNew, galleryIndex]);

  const fetchLibrary = useCallback(() => {
    if (libraryImages !== null) return;
    setLibraryLoading(true);
    fetch("/api/admin/library")
      .then((r) => r.json())
      .then((data) => {
        setLibraryImages(data.images || []);
        setLibraryData(data);
      })
      .catch(() => setLibraryImages([]))
      .finally(() => setLibraryLoading(false));
  }, [libraryImages]);

  const handleAddPhotosToBlock = (blockIndex) => {
    setPhotoPickerBlockIndex(blockIndex);
    setPhotoPickerOpen(true);
    fetchLibrary();
  };

  const handlePhotoPickerConfirm = (refs) => {
    setPhotoPickerOpen(false);
    if (photoPickerBlockIndex === null || refs.length === 0) return;
    setGallery((prev) => {
      const blocks = [...(prev.blocks || [])];
      const block = blocks[photoPickerBlockIndex];
      if (!block) return prev;
      if (block.type === "photo") {
        const first = refs[0];
        if (first) blocks[photoPickerBlockIndex] = { ...block, imageUrl: first.url };
      } else {
        const existing = normalizeImageRefs(block.images || block.imageUrls || []);
        const merged = [...existing, ...refs];
        blocks[photoPickerBlockIndex] = { ...block, ...buildMultiImageFields(merged) };
      }
      return { ...prev, blocks };
    });
  };

  const handleThumbnailConfirm = (refs) => {
    setThumbnailPickerOpen(false);
    if (refs.length > 0) {
      const thumbnail = refs[0];
      setGallery((prev) => ({
        ...prev,
        thumbnail,
        thumbnailUrl: getImageRefUrl(thumbnail),
      }));
    }
  };

  // Publish: promote draft → published fields, clear draft
  const handlePublish = async () => {
    setPublishing(true);
    try {
      const g = galleryRef.current;
      let slug = g.slug;
      if (!slug && g.name) slug = generateSlug(g.name);
      if (!slug) {
        alert("Add a gallery name before publishing.");
        setPublishing(false);
        return;
      }

      const publishedGallery = { ...g, slug, status: "published" };
      delete publishedGallery.draft;

      const galleries = allGalleriesRef.current;
      let updatedGalleries;
      if (isNew) {
        const existing = galleries.findIndex((x) => x.slug === slug);
        if (existing >= 0) {
          updatedGalleries = galleries.map((x) => x.slug === slug ? publishedGallery : x);
        } else {
          // Check for slug collision with a different gallery
          const collision = galleries.some((x) => x.slug === slug);
          if (collision) {
            alert(`A gallery with slug "${slug}" already exists.`);
            setPublishing(false);
            return;
          }
          updatedGalleries = [...galleries, publishedGallery];
        }
      } else {
        updatedGalleries = galleries.map((x, i) => i === galleryIndex ? publishedGallery : x);
      }

      const res = await fetch("/api/admin/galleries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ galleries: updatedGalleries }),
      });
      if (!res.ok) throw new Error(`Publish failed ${res.status}`);

      setGallery(publishedGallery);
      setHasDraft(false);
      setAutosaveStatus("saved");

      if (isNew) router.push(`/admin/galleries/${slug}`);
    } catch (err) {
      alert(`Error publishing: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const currentBlockType = photoPickerBlockIndex !== null
    ? (gallery.blocks || [])[photoPickerBlockIndex]?.type
    : null;

  const isPublished = initialGallery.status === "published";

  return (
    <div className="flex h-screen bg-desk">
      {!expanded ? (
        <BlockBuilder
          gallery={gallery}
          onChange={setGallery}
          onPublish={handlePublish}
          publishing={publishing}
          autosaveStatus={autosaveStatus}
          hasDraft={hasDraft}
          isPublished={isPublished}
          onAddPhotosToBlock={handleAddPhotosToBlock}
          onPickThumbnail={() => { fetchLibrary(); setThumbnailPickerOpen(true); }}
          expanded={expanded}
          onToggleExpand={() => setExpanded(true)}
        />
      ) : (
        <button
          onClick={() => setExpanded(false)}
          className="absolute left-3 top-3 z-20 w-7 h-7 flex items-center justify-center bg-parchment border shadow-card rounded-md transition-colors text-sm leading-none"
          style={{ borderColor: 'var(--border-warm)', color: 'var(--text-muted)' }}
        >
          →
        </button>
      )}

      <GalleryPreview gallery={gallery} />

      {photoPickerOpen && (
        <PhotoPickerModal
          images={libraryImages || []}
          libraryConfig={libraryData}
          loading={libraryLoading}
          blockType={currentBlockType}
          onConfirm={handlePhotoPickerConfirm}
          onClose={() => setPhotoPickerOpen(false)}
        />
      )}
      {thumbnailPickerOpen && (
        <PhotoPickerModal
          images={libraryImages || []}
          libraryConfig={libraryData}
          loading={libraryLoading}
          blockType="photo"
          onConfirm={handleThumbnailConfirm}
          onClose={() => setThumbnailPickerOpen(false)}
        />
      )}
    </div>
  );
}
