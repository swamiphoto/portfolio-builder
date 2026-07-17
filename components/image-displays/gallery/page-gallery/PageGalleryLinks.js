import React from "react";
import { pageDisplayThumbnail, focalPointToObjectPosition, pageThumbGradient } from "../../../../common/assetRefs";

// Decorative rotated "stack" of cards behind each list/alternating thumbnail.
// Heights match the responsive thumbnail so the stack lines up at every breakpoint.
const pgStackVariants = [
  {
    first: "absolute -right-2 -bottom-2 w-full h-[280px] md:h-[360px] lg:h-[440px] xl:h-[500px] bg-[#ede8e0] rotate-2 transition-transform duration-300 rounded-3xl",
    second: "absolute -right-1 -bottom-1 w-full h-[280px] md:h-[360px] lg:h-[440px] xl:h-[500px] bg-[#f4efe8] rotate-1 transition-transform duration-300 rounded-3xl",
  },
  {
    first: "absolute -left-2 -bottom-2 w-full h-[280px] md:h-[360px] lg:h-[440px] xl:h-[500px] bg-[#ede8e0] -rotate-2 transition-transform duration-300 rounded-3xl",
    second: "absolute -left-1 -bottom-1 w-full h-[280px] md:h-[360px] lg:h-[440px] xl:h-[500px] bg-[#f4efe8] -rotate-1 transition-transform duration-300 rounded-3xl",
  },
  {
    first: "absolute -right-2 -top-2 w-full h-[280px] md:h-[360px] lg:h-[440px] xl:h-[500px] bg-[#ede8e0] -rotate-2 transition-transform duration-300 rounded-3xl",
    second: "absolute -right-1 -top-1 w-full h-[280px] md:h-[360px] lg:h-[440px] xl:h-[500px] bg-[#f4efe8] -rotate-1 transition-transform duration-300 rounded-3xl",
  },
  {
    first: "absolute -left-2 -top-2 w-full h-[280px] md:h-[360px] lg:h-[440px] xl:h-[500px] bg-[#ede8e0] rotate-2 transition-transform duration-300 rounded-3xl",
    second: "absolute -left-1 -top-1 w-full h-[280px] md:h-[360px] lg:h-[440px] xl:h-[500px] bg-[#f4efe8] rotate-1 transition-transform duration-300 rounded-3xl",
  },
];

const THUMB_HEIGHT = "h-[280px] md:h-[360px] lg:h-[440px] xl:h-[500px]";

function makeClickHandler(onChildPageClick, id) {
  if (!onChildPageClick) return undefined;
  return (e) => {
    e.preventDefault();
    onChildPageClick(id);
  };
}

// list + alternating share the same row markup; `reverse` flips the image/text
// sides on desktop for odd rows in the alternating variant.
function RowLink({ page, index, linkBase, onChildPageClick, reverse }) {
  const thumb = pageDisplayThumbnail(page);
  const href = `${linkBase}/${page.slug || page.id}`;
  const stackStyle = pgStackVariants[index % pgStackVariants.length];
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
          <div className={stackStyle.first} />
          <div className={stackStyle.second} />
          <div className="relative overflow-hidden shadow-lg rounded-3xl">
            {thumb ? (
              <img
                src={thumb}
                alt={page.title}
                className={`w-full ${THUMB_HEIGHT} object-cover relative z-10 rounded-3xl`}
                style={{ objectPosition: focalPointToObjectPosition(page.thumbnail?.focalPoint) }}
              />
            ) : (
              <div className={`w-full ${THUMB_HEIGHT} rounded-3xl`} style={{ background: pageThumbGradient(page.id) }} />
            )}
          </div>
        </div>
      </div>
      <div className="md:w-1/2 lg:w-5/12 space-y-3 py-2 flex flex-col justify-center text-left px-0 md:px-8">
        <h2 className="text-4xl font-medium tracking-tight font-serif" style={{ color: "#1a1410", fontWeight: 400 }}>
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

function GridCell({ page, linkBase, onChildPageClick }) {
  const thumb = pageDisplayThumbnail(page);
  const href = `${linkBase}/${page.slug || page.id}`;
  return (
    <a
      href={href}
      onClick={makeClickHandler(onChildPageClick, page.id)}
      className="block group hover:opacity-95 transition-opacity hover:no-underline"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div className="relative">
        <div className="absolute -right-1.5 -bottom-1.5 w-full aspect-square bg-[#ede8e0] rotate-2 transition-transform duration-300 rounded-3xl" />
        <div className="absolute -right-1 -bottom-1 w-full aspect-square bg-[#f4efe8] rotate-1 transition-transform duration-300 rounded-3xl" />
        <div className="relative overflow-hidden shadow-lg rounded-3xl">
          {thumb ? (
            <img
              src={thumb}
              alt={page.title}
              className="w-full aspect-square object-cover relative z-10 rounded-3xl"
              style={{ objectPosition: focalPointToObjectPosition(page.thumbnail?.focalPoint) }}
            />
          ) : (
            <div className="w-full aspect-square rounded-3xl" style={{ background: pageThumbGradient(page.id) }} />
          )}
        </div>
      </div>
      <h2 className="mt-4 text-center font-serif text-lg md:text-xl" style={{ color: "#1a1410", fontWeight: 400 }}>
        {page.title}
      </h2>
    </a>
  );
}

export default function PageGalleryLinks({ pages, variant = "list", linkBase, onChildPageClick }) {
  const list = pages || [];
  if (list.length === 0) return null;

  if (variant === "grid") {
    return (
      <div className="max-w-6xl mx-auto px-5 sm:px-8 md:px-10">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-10">
          {list.map((p) => (
            <GridCell key={p.id} page={p} linkBase={linkBase} onChildPageClick={onChildPageClick} />
          ))}
        </div>
      </div>
    );
  }

  const alternating = variant === "alternating";
  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 md:px-10">
      <div className="space-y-10 md:space-y-14">
        {list.map((p, i) => (
          <RowLink
            key={p.id}
            page={p}
            index={i}
            linkBase={linkBase}
            onChildPageClick={onChildPageClick}
            reverse={alternating && i % 2 === 1}
          />
        ))}
      </div>
    </div>
  );
}
