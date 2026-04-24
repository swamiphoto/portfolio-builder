import { useEffect, useRef } from "react";

const BLOCK_TYPES = [
  { type: "photo", label: "Photo", desc: "Single photo with caption" },
  { type: "photos", label: "Photos", desc: "Multi-photo layout" },
  { type: "text", label: "Text", desc: "Text between photos" },
  { type: "video", label: "Video", desc: "YouTube video embed" },
  { type: "page-gallery", label: "Page Gallery", desc: "Thumbnail links to other pages" },
];

export function defaultBlock(type) {
  switch (type) {
    case "photo":
      return { type: "photo", imageUrl: "", caption: "", variant: 1 };
    case "photos":
      return { type: "photos", images: [], imageUrls: [], layout: "stacked" };
    case "stacked":
      return { type: "photos", images: [], imageUrls: [], layout: "stacked" };
    case "masonry":
      return { type: "photos", images: [], imageUrls: [], layout: "masonry" };
    case "text":
      return { type: "text", content: "", variant: 1 };
    case "video":
      return { type: "video", url: "", caption: "", variant: 1 };
    case "page-gallery":
      return { type: "page-gallery", pageIds: [] };
    default:
      return { type };
  }
}

export default function BlockTypeMenu({ onAdd, onClose, anchorRect }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const openUpward = anchorRect && window.innerHeight - anchorRect.bottom < 280;
  const style = anchorRect
    ? {
        position: "fixed",
        left: anchorRect.left,
        width: 256,
        zIndex: 9999,
        ...(openUpward
          ? { bottom: window.innerHeight - anchorRect.top + 4 }
          : { top: anchorRect.bottom + 4 }),
      }
    : undefined;

  return (
    <div
      ref={ref}
      className="bg-paper border border-rule py-1.5 overflow-hidden"
      style={{ ...style, boxShadow: 'var(--pane-shadow-lift)' }}
    >
      {BLOCK_TYPES.map(({ type, label, desc }) => (
        <button
          key={type}
          onClick={() => {
            onAdd(defaultBlock(type));
            onClose();
          }}
          className="w-full text-left px-4 py-2.5 hover:bg-paper-2 transition-colors"
        >
          <div className="text-sm font-medium text-ink-2">{label}</div>
          <div className="text-xs text-ink-4 mt-0.5">{desc}</div>
        </button>
      ))}
    </div>
  );
}
