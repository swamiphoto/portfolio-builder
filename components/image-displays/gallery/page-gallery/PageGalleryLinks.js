import React from "react";
import { pageDisplayThumbnail, focalPointToObjectPosition, pageThumbGradient } from "../../../../common/assetRefs";
import { useIsMobile } from "../../../../common/useIsMobile";

// Overall image size for the block. `maxW` scales the container (both layouts);
// `thumbH` scales the list thumbnails (and the stack behind them, which must
// match). Height/width classes appear here as literals so Tailwind JIT emits them.
const SIZES = {
  small:  { maxW: "max-w-4xl", thumbH: "h-[200px] md:h-[260px] lg:h-[320px]" },
  medium: { maxW: "max-w-5xl", thumbH: "h-[240px] md:h-[320px] lg:h-[400px]" },
  large:  { maxW: "max-w-6xl", thumbH: "h-[280px] md:h-[360px] lg:h-[440px] xl:h-[500px]" },
};

// Position + rotation of the two decorative "stack" cards behind a list
// thumbnail. Height is applied per-size so the stack lines up with the thumb.
const STACK_POS = [
  { first: "-right-2 -bottom-2 rotate-2",  second: "-right-1 -bottom-1 rotate-1" },
  { first: "-left-2 -bottom-2 -rotate-2",  second: "-left-1 -bottom-1 -rotate-1" },
  { first: "-right-2 -top-2 -rotate-2",    second: "-right-1 -top-1 -rotate-1" },
  { first: "-left-2 -top-2 rotate-2",      second: "-left-1 -top-1 rotate-1" },
];

function makeClickHandler(onChildPageClick, id) {
  if (!onChildPageClick) return undefined;
  return (e) => {
    e.preventDefault();
    onChildPageClick(id);
  };
}

// list + alternating share the same row markup; `reverse` flips the image/text
// sides on desktop for odd rows in the alternating variant. `thumbH` is the
// size-driven height ladder (shared by the thumbnail and its stack).
function RowLink({ page, index, linkBase, onChildPageClick, reverse, thumbH }) {
  const thumb = pageDisplayThumbnail(page);
  const href = `${linkBase}/${page.slug || page.id}`;
  const pos = STACK_POS[index % STACK_POS.length];
  const rowDir = reverse ? "md:flex-row-reverse" : "md:flex-row";
  return (
    <a
      href={href}
      onClick={makeClickHandler(onChildPageClick, page.id)}
      className={`flex flex-col ${rowDir} gap-6 md:gap-8 items-center group hover:opacity-95 transition-opacity hover:no-underline`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div className="relative md:w-1/2 lg:w-7/12">
        <div className="relative">
          <div className={`absolute ${pos.first} w-full ${thumbH} bg-[#ede8e0] transition-transform duration-300 rounded-3xl`} />
          <div className={`absolute ${pos.second} w-full ${thumbH} bg-[#f4efe8] transition-transform duration-300 rounded-3xl`} />
          <div className="relative overflow-hidden shadow-lg rounded-3xl">
            {thumb ? (
              <img
                src={thumb}
                alt={page.title}
                className={`w-full ${thumbH} object-cover relative z-10 rounded-3xl`}
                style={{ objectPosition: focalPointToObjectPosition(page.thumbnail?.focalPoint) }}
              />
            ) : (
              <div className={`w-full ${thumbH} rounded-3xl`} style={{ background: pageThumbGradient(page.id) }} />
            )}
          </div>
        </div>
      </div>
      <div className="md:w-1/2 lg:w-5/12 space-y-3 py-2 flex flex-col justify-center text-left px-3 md:px-8">
        <h2 className="text-2xl md:text-4xl font-medium tracking-tight font-serif" style={{ color: "#1a1410", fontWeight: 400 }}>
          {page.title}
        </h2>
        {page.description && (
          <p className="font-serif" style={{ color: "#7a6b55", fontSize: "1.1rem", lineHeight: 1.6 }}>
            {page.description}
          </p>
        )}
      </div>
    </a>
  );
}

// Balanced mosaic plan for a given page count. `heroes` lists the tile indices
// that span 2 columns (a wide hero); with aspect-[2/1] a hero keeps the same
// height as a square tile, so it fills its row cleanly with a neighbour.
// Hand-tuned for the common counts so every row is filled; n>8 falls back to a
// 3-column grid (accepting a rare centered orphan when n % 3 === 1).
function mosaicPlan(n) {
  const TABLE = {
    1: { cols: 1, heroes: [] },
    2: { cols: 2, heroes: [] },
    3: { cols: 2, heroes: [0] },
    4: { cols: 2, heroes: [] },
    5: { cols: 3, heroes: [0] },
    6: { cols: 3, heroes: [] },
    7: { cols: 4, heroes: [0] },
    8: { cols: 4, heroes: [] },
  };
  if (TABLE[n]) return TABLE[n];
  return { cols: 3, heroes: n % 3 === 2 ? [0] : [] };
}

function MosaicCell({ page, linkBase, onChildPageClick, hero, mobile }) {
  const thumb = pageDisplayThumbnail(page);
  const href = `${linkBase}/${page.slug || page.id}`;
  // On mobile every tile is a uniform full-width landscape card (no wide-hero span).
  const aspect = mobile ? "aspect-[3/2]" : (hero ? "aspect-[2/1]" : "aspect-square");
  const cellStyle = (!mobile && hero) ? { gridColumn: "span 2" } : undefined;
  return (
    <a
      href={href}
      onClick={makeClickHandler(onChildPageClick, page.id)}
      className="block group hover:opacity-95 transition-opacity hover:no-underline"
      style={{ textDecoration: "none", color: "inherit", ...cellStyle }}
    >
      <div className="relative">
        <div className={`absolute -right-1.5 -bottom-1.5 w-full ${aspect} bg-[#ede8e0] rotate-2 transition-transform duration-300 rounded-3xl`} />
        <div className={`absolute -right-1 -bottom-1 w-full ${aspect} bg-[#f4efe8] rotate-1 transition-transform duration-300 rounded-3xl`} />
        <div className="relative overflow-hidden shadow-lg rounded-3xl">
          {thumb ? (
            <img
              src={thumb}
              alt={page.title}
              className={`w-full ${aspect} object-cover relative z-10 rounded-3xl`}
              style={{ objectPosition: focalPointToObjectPosition(page.thumbnail?.focalPoint) }}
            />
          ) : (
            <div className={`w-full ${aspect} rounded-3xl`} style={{ background: pageThumbGradient(page.id) }} />
          )}
        </div>
      </div>
      <h2 className="mt-3 text-center font-serif text-lg" style={{ color: "#1a1410", fontWeight: 400 }}>
        {page.title}
      </h2>
    </a>
  );
}

export default function PageGalleryLinks({ pages, variant = "list", imageSide = "one", size = "medium", linkBase, onChildPageClick }) {
  const isMobile = useIsMobile();
  const list = pages || [];
  if (list.length === 0) return null;
  const sz = SIZES[size] || SIZES.medium;

  if (variant === "mosaic") {
    const { cols, heroes } = mosaicPlan(list.length);
    const heroSet = new Set(heroes);
    // Mobile: one column, uniform landscape tiles top-to-bottom (no side-by-side mosaic).
    const gridCols = isMobile ? 1 : cols;
    return (
      <div className={`${sz.maxW} mx-auto px-3 sm:px-8 md:px-10`}>
        <div
          className="grid gap-4 md:gap-6"
          style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0,1fr))`, alignItems: "start" }}
        >
          {list.map((p, i) => (
            <MosaicCell
              key={p.id}
              page={p}
              linkBase={linkBase}
              onChildPageClick={onChildPageClick}
              hero={heroSet.has(i)}
              mobile={isMobile}
            />
          ))}
        </div>
      </div>
    );
  }

  const alternating = imageSide === "alternating";
  return (
    <div className={`${sz.maxW} mx-auto px-5 sm:px-8 md:px-10`}>
      <div className="space-y-10 md:space-y-14">
        {list.map((p, i) => (
          <RowLink
            key={p.id}
            page={p}
            index={i}
            linkBase={linkBase}
            onChildPageClick={onChildPageClick}
            reverse={alternating && i % 2 === 1}
            thumbH={sz.thumbH}
          />
        ))}
      </div>
    </div>
  );
}
