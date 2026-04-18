# Image Lightbox with URL Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user clicks any image in a public gallery page, a full-screen lightbox opens with prev/next navigation, the browser URL updates to `?photo=N` (shareable), and opening that URL directly re-opens the lightbox at that image.

**Architecture:** Gallery.js builds a flat global image list from all blocks (with per-block offsets to map local→global indices), manages lightbox state + URL sync, and passes an `onImageClick(localIndex)` callback to each block component. A new `PhotoLightbox` component handles the modal UI. Block components stop calling `handleImageClick` from `common/images.js` and instead call their `onImageClick` prop.

**Tech Stack:** React (hooks), Next.js router (shallow push for URL sync), Tailwind CSS, existing `getSizedUrl` from `common/imageUtils.js`

---

## File Structure

**Create:**
- `components/image-displays/PhotoLightbox.js` — modal overlay UI: image, caption, X button, prev/next arrows, keyboard handling, backdrop click to close

**Modify:**
- `components/image-displays/gallery/Gallery.js` — add global image list, lightbox state, URL sync, render PhotoLightbox, pass onImageClick to blocks
- `components/image-displays/gallery/photo-block/PhotoBlock.js` — accept `onImageClick` prop, remove handleImageClick/router/allPhotos
- `components/image-displays/gallery/masonry-gallery/MasonryGallery.js` — accept `onImageClick(index)` prop
- `components/image-displays/gallery/stacked-gallery/StackedGallery.js` — accept `onImageClick(index)` prop, use image.id for original index

---

### Task 1: PhotoLightbox component

**Files:**
- Create: `components/image-displays/PhotoLightbox.js`

- [ ] **Step 1: Write the failing test**

```js
// __tests__/components/PhotoLightbox.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import PhotoLightbox from '../../components/image-displays/PhotoLightbox';

const images = [
  { url: 'https://example.com/a.jpg', caption: 'Alpha' },
  { url: 'https://example.com/b.jpg', caption: 'Beta' },
  { url: 'https://example.com/c.jpg' },
];

test('renders current image and caption', () => {
  render(<PhotoLightbox images={images} index={0} onClose={jest.fn()} onNavigate={jest.fn()} />);
  expect(screen.getByRole('img').src).toContain('a.jpg');
  expect(screen.getByText('Alpha')).toBeInTheDocument();
});

test('shows prev/next buttons', () => {
  render(<PhotoLightbox images={images} index={1} onClose={jest.fn()} onNavigate={jest.fn()} />);
  expect(screen.getByLabelText('Previous image')).toBeInTheDocument();
  expect(screen.getByLabelText('Next image')).toBeInTheDocument();
});

test('hides prev button on first image', () => {
  render(<PhotoLightbox images={images} index={0} onClose={jest.fn()} onNavigate={jest.fn()} />);
  expect(screen.queryByLabelText('Previous image')).toBeNull();
});

test('hides next button on last image', () => {
  render(<PhotoLightbox images={images} index={2} onClose={jest.fn()} onNavigate={jest.fn()} />);
  expect(screen.queryByLabelText('Next image')).toBeNull();
});

test('calls onNavigate with correct index on prev click', () => {
  const onNavigate = jest.fn();
  render(<PhotoLightbox images={images} index={1} onClose={jest.fn()} onNavigate={onNavigate} />);
  fireEvent.click(screen.getByLabelText('Previous image'));
  expect(onNavigate).toHaveBeenCalledWith(0);
});

test('calls onNavigate with correct index on next click', () => {
  const onNavigate = jest.fn();
  render(<PhotoLightbox images={images} index={1} onClose={jest.fn()} onNavigate={onNavigate} />);
  fireEvent.click(screen.getByLabelText('Next image'));
  expect(onNavigate).toHaveBeenCalledWith(2);
});

test('calls onClose on X button click', () => {
  const onClose = jest.fn();
  render(<PhotoLightbox images={images} index={0} onClose={onClose} onNavigate={jest.fn()} />);
  fireEvent.click(screen.getByLabelText('Close lightbox'));
  expect(onClose).toHaveBeenCalled();
});

test('calls onClose on backdrop click', () => {
  const onClose = jest.fn();
  render(<PhotoLightbox images={images} index={0} onClose={onClose} onNavigate={jest.fn()} />);
  fireEvent.click(screen.getByTestId('lightbox-backdrop'));
  expect(onClose).toHaveBeenCalled();
});

test('calls onClose on Escape key', () => {
  const onClose = jest.fn();
  render(<PhotoLightbox images={images} index={0} onClose={onClose} onNavigate={jest.fn()} />);
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(onClose).toHaveBeenCalled();
});

test('calls onNavigate on ArrowRight key', () => {
  const onNavigate = jest.fn();
  render(<PhotoLightbox images={images} index={0} onClose={jest.fn()} onNavigate={onNavigate} />);
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  expect(onNavigate).toHaveBeenCalledWith(1);
});

test('calls onNavigate on ArrowLeft key', () => {
  const onNavigate = jest.fn();
  render(<PhotoLightbox images={images} index={1} onClose={jest.fn()} onNavigate={onNavigate} />);
  fireEvent.keyDown(window, { key: 'ArrowLeft' });
  expect(onNavigate).toHaveBeenCalledWith(0);
});

test('does not show caption when image has none', () => {
  render(<PhotoLightbox images={images} index={2} onClose={jest.fn()} onNavigate={jest.fn()} />);
  expect(screen.queryByRole('paragraph')).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest __tests__/components/PhotoLightbox.test.js --no-coverage 2>&1 | tail -20
```

Expected: FAIL — "Cannot find module '../../components/image-displays/PhotoLightbox'"

- [ ] **Step 3: Implement PhotoLightbox**

```jsx
// components/image-displays/PhotoLightbox.js
import { useEffect } from "react";
import { getSizedUrl } from "../../common/imageUtils";

export default function PhotoLightbox({ images, index, onClose, onNavigate }) {
  const image = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && hasNext) onNavigate(index + 1);
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(index - 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, hasPrev, hasNext, onClose, onNavigate]);

  if (!image) return null;

  return (
    <div
      data-testid="lightbox-backdrop"
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center"
      onClick={onClose}
    >
      {/* Close */}
      <button
        aria-label="Close lightbox"
        className="absolute top-4 right-4 z-10 text-white/70 hover:text-white text-3xl leading-none"
        onClick={onClose}
      >
        ×
      </button>

      {/* Prev */}
      {hasPrev && (
        <button
          aria-label="Previous image"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white/70 hover:text-white text-4xl leading-none px-2"
          onClick={(e) => { e.stopPropagation(); onNavigate(index - 1); }}
        >
          ‹
        </button>
      )}

      {/* Image + caption — stop propagation so clicking image doesn't close */}
      <div
        className="flex flex-col items-center max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={getSizedUrl(image.url, 'display')}
          alt={image.caption || ""}
          className="max-w-full max-h-[80vh] object-contain"
        />
        {image.caption && (
          <p className="mt-3 text-white/70 text-sm italic text-center max-w-xl">{image.caption}</p>
        )}
      </div>

      {/* Next */}
      {hasNext && (
        <button
          aria-label="Next image"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white/70 hover:text-white text-4xl leading-none px-2"
          onClick={(e) => { e.stopPropagation(); onNavigate(index + 1); }}
        >
          ›
        </button>
      )}

      {/* Counter */}
      <div className="absolute bottom-4 text-white/40 text-xs">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest __tests__/components/PhotoLightbox.test.js --no-coverage 2>&1 | tail -20
```

Expected: PASS — all 12 tests green

- [ ] **Step 5: Commit**

```bash
git add components/image-displays/PhotoLightbox.js __tests__/components/PhotoLightbox.test.js
git commit -m "feat: add PhotoLightbox modal component with keyboard and caption support"
```

---

### Task 2: Gallery.js — global image list + lightbox state + URL sync

**Files:**
- Modify: `components/image-displays/gallery/Gallery.js`

Context: Gallery.js renders all blocks. We need to:
1. Build a flat `allImages` array from all image-bearing blocks (photos, stacked, masonry, photo)
2. Track per-block start offsets so each block can map local index → global index
3. Manage `lightboxIndex` state (null = closed)
4. Sync `lightboxIndex` to/from `router.query.photo` (shallow routing)
5. Pass `onImageClick(localIndex)` to each block component
6. Render `<PhotoLightbox>` when lightboxIndex is not null

- [ ] **Step 1: Write the failing test**

```js
// __tests__/components/GalleryLightbox.test.js
import { render, screen, fireEvent, act } from '@testing-library/react';
import Gallery from '../../components/image-displays/gallery/Gallery';

// Mock router
const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    query: {},
    push: mockPush,
    pathname: '/test',
  }),
}));

// Mock responsive
jest.mock('react-responsive', () => ({
  useMediaQuery: () => false,
}));

const blocks = [
  {
    type: 'masonry',
    images: [
      { assetId: 'a1', url: 'https://example.com/a.jpg', caption: 'Alpha' },
      { assetId: 'a2', url: 'https://example.com/b.jpg', caption: 'Beta' },
    ],
  },
  {
    type: 'photo',
    layout: 'Centered',
    image: { assetId: 'b1', url: 'https://example.com/c.jpg' },
    caption: 'Charlie',
  },
];

test('opens lightbox and updates URL when image clicked', async () => {
  render(<Gallery name="Test" description="" blocks={blocks} />);
  const imgs = screen.getAllByRole('img');
  fireEvent.click(imgs[0]);
  expect(mockPush).toHaveBeenCalledWith(
    expect.objectContaining({ query: expect.objectContaining({ photo: 0 }) }),
    undefined,
    { shallow: true }
  );
});

test('renders PhotoLightbox when lightboxIndex is set via URL', async () => {
  jest.resetModules();
  jest.mock('next/router', () => ({
    useRouter: () => ({
      query: { photo: '1' },
      push: mockPush,
      pathname: '/test',
    }),
  }));
  const GalleryFresh = require('../../components/image-displays/gallery/Gallery').default;
  render(<GalleryFresh name="Test" description="" blocks={blocks} />);
  // lightbox should be open at index 1 (second image = 'Beta')
  expect(screen.getByText('Beta')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest __tests__/components/GalleryLightbox.test.js --no-coverage 2>&1 | tail -20
```

Expected: FAIL — "mockPush not called" or similar

- [ ] **Step 3: Implement Gallery.js changes**

Replace the full contents of `components/image-displays/gallery/Gallery.js` with:

```jsx
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import GalleryCover from "./gallery-cover/GalleryCover";
import MasonryGallery from "./masonry-gallery/MasonryGallery";
import StackedGallery from "./stacked-gallery/StackedGallery";
import { useMediaQuery } from "react-responsive";
import WiggleLine from "components/wiggle-line/WiggleLine";
import VideoBlock from "./video-block/VideoBlock";
import PhotoBlock from "./photo-block/PhotoBlock";
import PhotoLightbox from "../PhotoLightbox";
import { getImageRefUrl, normalizeImageRefs } from "../../../common/assetRefs";

const Gallery = ({ name, description, blocks, enableSlideshow, enableClientView, pages, onBackClick, onSlideshowClick, onClientLoginClick }) => {
  const isSmallScreen = useMediaQuery({ query: "(max-width: 768px)" });
  const router = useRouter();
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // Build flat image list + per-block offsets
  const { allImages, blockOffsets } = useMemo(() => {
    const allImages = [];
    const blockOffsets = [];
    (blocks || []).forEach((block) => {
      blockOffsets.push(allImages.length);
      if (block.type === "photos" || block.type === "stacked" || block.type === "masonry") {
        const refs = normalizeImageRefs(block.images || block.imageUrls || []);
        allImages.push(...refs);
      } else if (block.type === "photo") {
        const url = getImageRefUrl(block.image || block.imageUrl);
        if (url) allImages.push({ url, caption: block.caption || "" });
      } else {
        // non-image block: no images, offset just marks the position
      }
    });
    return { allImages, blockOffsets };
  }, [blocks]);

  // Sync lightboxIndex from URL query
  useEffect(() => {
    const n = parseInt(router.query.photo, 10);
    if (!isNaN(n) && n >= 0 && n < allImages.length) {
      setLightboxIndex(n);
    } else {
      setLightboxIndex(null);
    }
  }, [router.query.photo, allImages.length]);

  const openLightbox = (globalIndex) => {
    router.push({ query: { ...router.query, photo: globalIndex } }, undefined, { shallow: true });
  };

  const closeLightbox = () => {
    const q = { ...router.query };
    delete q.photo;
    router.push({ query: q }, undefined, { shallow: true });
  };

  const navigateLightbox = (globalIndex) => {
    router.push({ query: { ...router.query, photo: globalIndex } }, undefined, { shallow: true });
  };

  // Returns onImageClick(localIndex) for a given block index
  const makeClickHandler = (blockIdx) => (localIndex) => {
    openLightbox(blockOffsets[blockIdx] + localIndex);
  };

  return (
    <div className="gallery-container">
      <GalleryCover name={name} description={description} enableSlideshow={enableSlideshow} enableClientView={enableClientView} onBackClick={onBackClick} onSlideshowClick={onSlideshowClick} onClientLoginClick={onClientLoginClick} />

      <div className="space-y-10">
        {(blocks || []).map((block, index) => {
          switch (block.type) {
            case "photos": {
              const usemasonry = block.layout === "masonry" || isSmallScreen;
              const imageRefs = normalizeImageRefs(block.images || block.imageUrls || []);
              return (
                <div key={`block-${index}`} className="photos-block">
                  {usemasonry
                    ? <MasonryGallery images={imageRefs} onImageClick={makeClickHandler(index)} />
                    : <StackedGallery images={imageRefs} onImageClick={makeClickHandler(index)} />}
                  <WiggleLine />
                </div>
              );
            }

            case "stacked": {
              const imageRefs = normalizeImageRefs(block.images || block.imageUrls || []);
              return (
                <div key={`block-${index}`} className="stacked-gallery-block">
                  {isSmallScreen
                    ? <MasonryGallery images={imageRefs} onImageClick={makeClickHandler(index)} />
                    : <StackedGallery images={imageRefs} onImageClick={makeClickHandler(index)} />}
                  <WiggleLine />
                </div>
              );
            }

            case "masonry": {
              const imageRefs = normalizeImageRefs(block.images || block.imageUrls || []);
              return (
                <div key={`block-${index}`} className="masonry-gallery-block">
                  <MasonryGallery images={imageRefs} onImageClick={makeClickHandler(index)} />
                  <WiggleLine />
                </div>
              );
            }

            case "text":
              return (
                <div key={`block-${index}`} className={`text-block text-center text-2xl md:text-4xl text-gray-800 max-w-3xl mx-auto py-10 ${block.variant === 2 ? "font-serif2" : ""}`}>
                  {block.content}
                </div>
              );

            case "photo": {
              if (!getImageRefUrl(block.image || block.imageUrl)) return null;
              const photoVariant = block.layout === "Centered" ? 2 : (block.variant || 1);
              return (
                <div key={`block-${index}`} className="photo-block">
                  <PhotoBlock
                    imageUrl={getImageRefUrl(block.image || block.imageUrl)}
                    caption={block.caption}
                    variant={photoVariant}
                    onImageClick={makeClickHandler(index)}
                  />
                  <WiggleLine />
                </div>
              );
            }

            case "video": {
              const videoVariant = block.layout === "Centered" ? 2 : (block.variant || 1);
              return (
                <div key={`block-${index}`} className="video-block">
                  <VideoBlock url={block.url} caption={block.caption} variant={videoVariant} />
                  <WiggleLine />
                </div>
              );
            }

            case "page-gallery": {
              const linkedPages = (block.pageIds || [])
                .map(id => (pages || []).find(p => p.id === id))
                .filter(Boolean);
              if (linkedPages.length === 0) return null;
              return (
                <div key={`block-${index}`} className="page-gallery-block px-8 py-4">
                  <div className="grid grid-cols-2 gap-6">
                    {linkedPages.map(p => (
                      <a key={p.id} href="#" className="block group">
                        {getImageRefUrl(p.thumbnail || p.thumbnailUrl) ? (
                          <img
                            src={getImageRefUrl(p.thumbnail || p.thumbnailUrl)}
                            alt={p.title}
                            className="w-full aspect-[4/3] object-cover"
                          />
                        ) : (
                          <div className="w-full aspect-[4/3] bg-gray-100 flex items-center justify-center text-gray-300 text-sm">
                            No thumbnail
                          </div>
                        )}
                        <div className="mt-2 text-sm text-gray-800 font-medium">{p.title}</div>
                      </a>
                    ))}
                  </div>
                </div>
              );
            }

            default:
              console.error(`Unsupported block type: ${block.type}`);
              return null;
          }
        })}
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          images={allImages}
          index={lightboxIndex}
          onClose={closeLightbox}
          onNavigate={navigateLightbox}
        />
      )}
    </div>
  );
};

export default Gallery;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest __tests__/components/GalleryLightbox.test.js --no-coverage 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/image-displays/gallery/Gallery.js __tests__/components/GalleryLightbox.test.js
git commit -m "feat: add lightbox state and URL sync to Gallery.js"
```

---

### Task 3: Wire up PhotoBlock to onImageClick

**Files:**
- Modify: `components/image-displays/gallery/photo-block/PhotoBlock.js`

Context: PhotoBlock currently calls `handleImageClick(imageUrl, allPhotos, router)` on click. We replace this with calling `onImageClick(0)` (always index 0 since it's a single image block). Remove the `allPhotos` prop, `useRouter`, and `handleImageClick` import.

- [ ] **Step 1: Write the test**

```js
// __tests__/components/PhotoBlockClick.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import PhotoBlock from '../../components/image-displays/gallery/photo-block/PhotoBlock';

jest.mock('next/router', () => ({ useRouter: () => ({ push: jest.fn(), query: {} }) }));

test('calls onImageClick(0) when image is clicked (variant 1)', () => {
  const onImageClick = jest.fn();
  render(<PhotoBlock imageUrl="https://example.com/photo.jpg" variant={1} onImageClick={onImageClick} />);
  fireEvent.click(screen.getByRole('img'));
  expect(onImageClick).toHaveBeenCalledWith(0);
});

test('calls onImageClick(0) when image is clicked (variant 2)', () => {
  const onImageClick = jest.fn();
  render(<PhotoBlock imageUrl="https://example.com/photo.jpg" variant={2} onImageClick={onImageClick} />);
  fireEvent.click(screen.getByRole('img'));
  expect(onImageClick).toHaveBeenCalledWith(0);
});

test('does not throw when onImageClick is not provided', () => {
  render(<PhotoBlock imageUrl="https://example.com/photo.jpg" variant={1} />);
  expect(() => fireEvent.click(screen.getByRole('img'))).not.toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest __tests__/components/PhotoBlockClick.test.js --no-coverage 2>&1 | tail -20
```

Expected: FAIL — onImageClick not called

- [ ] **Step 3: Update PhotoBlock.js**

Replace the full file content:

```jsx
// components/image-displays/gallery/photo-block/PhotoBlock.js
import React from "react";
import { getSizedUrl } from "../../../../common/imageUtils";

const PhotoBlock = ({ imageUrl, caption = "", variant = 1, onImageClick }) => {
  const [aspectRatio, setAspectRatio] = React.useState(null);
  const imgRef = React.useRef(null);

  const handleImageLoad = (e) => {
    setAspectRatio(e.target.naturalWidth / e.target.naturalHeight);
  };

  React.useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth) {
      setAspectRatio(imgRef.current.naturalWidth / imgRef.current.naturalHeight);
    }
  }, [imageUrl]);

  const handleClick = () => {
    if (onImageClick) onImageClick(0);
  };

  const renderCaption = () => {
    return <p className="my-4 md:mb-20 font-medium text-sm md:text-xl italic text-center max-w-3xl mx-auto">{caption}</p>;
  };

  const renderImage = () => {
    if (variant === 1) {
      return (
        <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
          <img
            src={getSizedUrl(imageUrl, 'display')}
            alt={caption || "Photo"}
            className="w-full h-auto object-cover cursor-pointer"
            loading="lazy"
            onClick={handleClick}
            onError={(e) => {
              console.error("Failed to load image in PhotoBlock:", imageUrl);
              e.target.style.display = 'none';
            }}
          />
        </div>
      );
    }

    if (variant === 2) {
      const displayWidth = aspectRatio !== null && aspectRatio < 1
        ? `${(72 * aspectRatio).toFixed(1)}%`
        : '72%';
      return (
        <div className="w-full flex justify-center py-2">
          <img
            ref={imgRef}
            src={getSizedUrl(imageUrl, 'display')}
            alt={caption || "Photo"}
            className="h-auto shadow-lg rounded-3xl transition-opacity duration-500 cursor-pointer"
            style={{ width: displayWidth }}
            loading="lazy"
            onClick={handleClick}
            onLoad={handleImageLoad}
            onError={(e) => {
              console.error("Failed to load image in PhotoBlock:", imageUrl);
              e.target.style.display = 'none';
            }}
          />
        </div>
      );
    }

    // Default fallback (variant 1)
    return (
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden">
        <img
          src={getSizedUrl(imageUrl, 'display')}
          alt={caption || "Photo"}
          className="w-full h-auto object-cover cursor-pointer"
          loading="lazy"
          onClick={handleClick}
          onError={(e) => {
            console.error("Failed to load image in PhotoBlock:", imageUrl);
            e.target.style.display = 'none';
          }}
        />
      </div>
    );
  };

  return (
    <div className="w-full relative overflow-x-hidden">
      {renderImage()}
      {caption && renderCaption()}
    </div>
  );
};

export default PhotoBlock;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest __tests__/components/PhotoBlockClick.test.js --no-coverage 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/image-displays/gallery/photo-block/PhotoBlock.js __tests__/components/PhotoBlockClick.test.js
git commit -m "feat: wire PhotoBlock to onImageClick callback"
```

---

### Task 4: Wire up MasonryGallery to onImageClick

**Files:**
- Modify: `components/image-displays/gallery/masonry-gallery/MasonryGallery.js`

Context: MasonryGallery renders images in order. The index in the `items.map()` call is the correct local index. Replace the `handleImageClick` call with `onImageClick(index)`.

Current MasonryGallery.js (lines 1-51):
```jsx
import React from "react";
import Masonry from "react-masonry-css";
import { handleImageClick } from "../../../../common/images";
import { getSizedUrl } from "../../../../common/imageUtils";
import { useRouter } from "next/router";
import styles from "./MasonryGallery.module.css";

const MasonryGallery = ({ images = [], imageUrls = [] }) => {
  const router = useRouter();
  const items = images.length > 0 ? images : imageUrls.map(url => ({ url, caption: '' }));
  const allUrls = items.map(i => i.url);
  ...
  onClick={() => handleImageClick(url, allUrls, router)}
```

- [ ] **Step 1: Write the test**

```js
// __tests__/components/MasonryGalleryClick.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import MasonryGallery from '../../components/image-displays/gallery/masonry-gallery/MasonryGallery';

jest.mock('react-masonry-css', () => ({ __esModule: true, default: ({ children }) => <div>{children}</div> }));

const images = [
  { url: 'https://example.com/a.jpg', caption: 'Alpha' },
  { url: 'https://example.com/b.jpg', caption: 'Beta' },
];

test('calls onImageClick with correct index', () => {
  const onImageClick = jest.fn();
  render(<MasonryGallery images={images} onImageClick={onImageClick} />);
  const imgs = screen.getAllByRole('img');
  fireEvent.click(imgs[1]);
  expect(onImageClick).toHaveBeenCalledWith(1);
});

test('does not throw when onImageClick is not provided', () => {
  render(<MasonryGallery images={images} />);
  expect(() => fireEvent.click(screen.getAllByRole('img')[0])).not.toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest __tests__/components/MasonryGalleryClick.test.js --no-coverage 2>&1 | tail -20
```

Expected: FAIL

- [ ] **Step 3: Update MasonryGallery.js**

Replace the full file content:

```jsx
// components/image-displays/gallery/masonry-gallery/MasonryGallery.js
import React from "react";
import Masonry from "react-masonry-css";
import { getSizedUrl } from "../../../../common/imageUtils";
import styles from "./MasonryGallery.module.css";

const MasonryGallery = ({ images = [], imageUrls = [], onImageClick }) => {
  const items = images.length > 0 ? images : imageUrls.map(url => ({ url, caption: '' }));
  const breakpointColumnsObj = { default: 2, 700: 1 };

  return (
    <div className="flex flex-col items-center">
      <div className={`${styles.masonryGallery} w-full max-w-6xl mx-auto`}>
        <div className="gallery-content flex-grow md:p-4 overflow-hidden">
          <Masonry breakpointCols={breakpointColumnsObj} className="flex w-auto -ml-5" columnClassName="pl-5">
            {items.length > 0 ? (
              items.map(({ url, caption }, index) => {
                const imageUrl = getSizedUrl(url, 'display');
                return (
                  <div key={index} className="mb-5">
                    <img
                      src={imageUrl}
                      alt={caption || `Image ${index + 1}`}
                      className="w-full h-auto transition-opacity duration-500 ease-in shadow-lg rounded-3xl cursor-pointer"
                      onError={(e) => {
                        console.error("Image failed to load:", imageUrl);
                        e.target.style.display = 'none';
                      }}
                      onClick={() => onImageClick && onImageClick(index)}
                    />
                    {caption && (
                      <p className="mt-2 text-sm italic text-center text-gray-500">{caption}</p>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-center text-gray-500">No images available.</p>
            )}
          </Masonry>
        </div>
      </div>
    </div>
  );
};

export default MasonryGallery;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest __tests__/components/MasonryGalleryClick.test.js --no-coverage 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/image-displays/gallery/masonry-gallery/MasonryGallery.js __tests__/components/MasonryGalleryClick.test.js
git commit -m "feat: wire MasonryGallery to onImageClick callback"
```

---

### Task 5: Wire up StackedGallery to onImageClick

**Files:**
- Modify: `components/image-displays/gallery/stacked-gallery/StackedGallery.js`

Context: StackedGallery loads images async, computes aspect ratios, then reorders them (portrait pairs interleaved with horizontals). The `id` field on each `processedImage` is the original array index. So `onImageClick(image.id)` maps back to the original local index correctly.

Two click sites exist:
1. Portrait image: `onClick={() => handleImageClick(image.src, processedImages, router)}` → `onClick={() => onImageClick && onImageClick(image.id)}`
2. Horizontal image: `onClick={() => handleImageClick(entry.src, imageUrls, router)}` → `onClick={() => onImageClick && onImageClick(entry.id)}`

- [ ] **Step 1: Write the test**

```js
// __tests__/components/StackedGalleryClick.test.js
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import StackedGallery from '../../components/image-displays/gallery/stacked-gallery/StackedGallery';

// Mock window.Image to control async loading
class MockImage {
  constructor() {
    setTimeout(() => {
      this.width = 800;
      this.height = 600;
      if (this.onload) this.onload();
    }, 0);
  }
  set src(_) {}
}
global.Image = MockImage;

const images = [
  { url: 'https://example.com/a.jpg', caption: 'Alpha' },
  { url: 'https://example.com/b.jpg', caption: 'Beta' },
];

test('calls onImageClick with original index when image is clicked', async () => {
  const onImageClick = jest.fn();
  render(<StackedGallery images={images} onImageClick={onImageClick} />);
  await waitFor(() => expect(screen.getAllByRole('img').length).toBeGreaterThan(0));
  fireEvent.click(screen.getAllByRole('img')[0]);
  expect(onImageClick).toHaveBeenCalledWith(expect.any(Number));
});

test('does not throw when onImageClick is not provided', async () => {
  render(<StackedGallery images={images} />);
  await waitFor(() => expect(screen.getAllByRole('img').length).toBeGreaterThan(0));
  expect(() => fireEvent.click(screen.getAllByRole('img')[0])).not.toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest __tests__/components/StackedGalleryClick.test.js --no-coverage 2>&1 | tail -20
```

Expected: FAIL

- [ ] **Step 3: Update StackedGallery.js**

Replace the full file content:

```jsx
// components/image-displays/gallery/stacked-gallery/StackedGallery.js
import React, { useEffect, useState, useMemo } from "react";
import { getSizedUrl } from "../../../../common/imageUtils";
import styles from "./StackedGallery.module.css";

const StackedGallery = ({ images: imagesProp = [], imageUrls: imageUrlsProp = [], onImageClick }) => {
  const urlsKey = (imagesProp.length > 0 ? imagesProp.map(i => i.url) : imageUrlsProp).join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const imageUrls = useMemo(
    () => imagesProp.length > 0 ? imagesProp.map(i => i.url) : imageUrlsProp,
    [urlsKey]
  );
  const getCaptionForUrl = (url) => imagesProp.find(i => i.url === url)?.caption || '';

  const [processedImages, setProcessedImages] = useState([]);

  useEffect(() => {
    setProcessedImages([]);
    if (imageUrls.length === 0) return;

    imageUrls.forEach((url, index) => {
      const processedUrl = getSizedUrl(url, 'display');
      const img = new window.Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        setProcessedImages((prev) => {
          if (prev.some((image) => image.src === url)) return prev;
          return [...prev, { src: url, aspectRatio, id: index }];
        });
      };
      img.onerror = () => {
        setProcessedImages((prev) => {
          if (prev.some((image) => image.src === url)) return prev;
          return [...prev, { src: url, aspectRatio: 1, id: index }];
        });
      };
      img.src = processedUrl;
    });
  }, [imageUrls]); // eslint-disable-line react-hooks/exhaustive-deps

  const verticalImages = processedImages.filter((image) => image.aspectRatio < 1);
  const horizontalImages = processedImages.filter((image) => image.aspectRatio >= 1);

  const verticalPairs = [];
  for (let i = 0; i < verticalImages.length; i += 2) {
    verticalPairs.push([verticalImages[i], verticalImages[i + 1]]);
  }

  const combinedRows = [];
  const maxLength = Math.max(horizontalImages.length, verticalPairs.length);
  for (let i = 0; i < maxLength; i++) {
    if (i < horizontalImages.length) combinedRows.push(horizontalImages[i]);
    if (i < verticalPairs.length) combinedRows.push(verticalPairs[i]);
  }

  return (
    <div className="pb-2">
      <div className={`${styles.stackedGallery}`}>
        {combinedRows.map((entry, index) => (
          <div key={`row-${index}`} className="mb-8">
            {Array.isArray(entry) ? (
              <div style={{ width: "72%", margin: "0 auto" }}>
                <div className="flex flex-row items-start justify-center gap-4">
                  {entry.map((image, idx) =>
                    image ? (
                      <div
                        key={`vertical-${index}-${idx}`}
                        className="flex flex-col"
                        style={{ width: "48%" }}
                      >
                        <img
                          src={getSizedUrl(image.src, 'display')}
                          alt=""
                          className="h-auto w-full object-cover shadow-lg rounded-3xl transition-opacity duration-500 cursor-pointer"
                          onClick={() => onImageClick && onImageClick(image.id)}
                          onError={(e) => {
                            console.error("Failed to load image in StackedGallery:", image.src);
                            e.target.style.display = 'none';
                          }}
                        />
                        {getCaptionForUrl(image.src) && (
                          <p className="mt-2 text-sm italic text-center text-gray-500">{getCaptionForUrl(image.src)}</p>
                        )}
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                <img
                  src={getSizedUrl(entry.src, 'display')}
                  alt=""
                  className="w-[72%] max-h-[calc(100vw * 0.35)] object-cover shadow-lg rounded-3xl transition-opacity duration-500 cursor-pointer"
                  onClick={() => onImageClick && onImageClick(entry.id)}
                  onError={(e) => {
                    console.error("Failed to load image in StackedGallery:", entry.src);
                    e.target.style.display = 'none';
                  }}
                />
                {getCaptionForUrl(entry.src) && (
                  <p className="mt-2 text-sm italic text-center text-gray-500 max-w-[72%]">{getCaptionForUrl(entry.src)}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StackedGallery;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest __tests__/components/StackedGalleryClick.test.js --no-coverage 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest --no-coverage 2>&1 | tail -30
```

Expected: All existing tests still pass; StackedGalleryClick tests pass

- [ ] **Step 6: Commit**

```bash
git add components/image-displays/gallery/stacked-gallery/StackedGallery.js __tests__/components/StackedGalleryClick.test.js
git commit -m "feat: wire StackedGallery to onImageClick callback"
```

---

## Self-Review

### 1. Spec coverage

| Requirement | Task |
|---|---|
| Lightbox modal overlay UI | Task 1 |
| Prev/Next navigation | Task 1 |
| Keyboard support (Escape, arrows) | Task 1 |
| Caption display | Task 1 |
| Backdrop click to close | Task 1 |
| URL sync (push `?photo=N` on open) | Task 2 |
| URL sync (read `?photo=N` on load to open) | Task 2 |
| Close removes `?photo` from URL | Task 2 |
| Global flat image list across blocks | Task 2 |
| PhotoBlock wired | Task 3 |
| MasonryGallery wired | Task 4 |
| StackedGallery wired | Task 5 |

All requirements covered.

### 2. Placeholder scan

No TBDs, no "handle edge cases" without implementation. All code is complete.

### 3. Type consistency

- `onImageClick(localIndex: number)` — consistent across Tasks 2, 3, 4, 5
- `images: [{url, caption?}]` — consistent between Gallery allImages and PhotoLightbox props
- `makeClickHandler(blockIdx)` returns `(localIndex) => openLightbox(blockOffsets[blockIdx] + localIndex)` — consistent
- `image.id` in StackedGallery = original array index — used consistently in Task 5
