import { useRef, useEffect, useState } from "react";

// Only include layout options that are actually rendered
const LAYOUTS = {
  photo: ["Edge to edge", "Centered"],
  photos: ["Stacked", "Masonry"],
  stacked: ["Stacked", "Masonry"],
  masonry: ["Stacked", "Masonry"],
  video: ["Edge to edge", "Centered"],
};

function Section({ label, children }) {
  return (
    <div className="py-3 border-b border-stone-100 last:border-0">
      <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2 pl-1">{label}</div>
      {children}
    </div>
  );
}

export default function DesignPopover({ block, onUpdate, onClose, anchorEl }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  const blockType = block.type;

  // Position just below the brush icon, left-aligned to it
  useEffect(() => {
    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const popoverHeight = 180;
      if (spaceBelow < popoverHeight) {
        setPos({ left: rect.left, bottom: window.innerHeight - rect.top + 4, top: "auto" });
      } else {
        setPos({ left: rect.left, top: rect.bottom + 4 });
      }
    }
  }, [anchorEl]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target) &&
          anchorEl && !anchorEl.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorEl]);

  const layouts = LAYOUTS[blockType] || [];
  const isPhotos = blockType === "photos" || blockType === "stacked" || blockType === "masonry";

  const currentLayout = isPhotos
    ? (blockType === "masonry" ? "Masonry" : "Stacked")
    : (block.layout || layouts[0]);

  const handleLayoutChange = (layout) => {
    if (isPhotos) {
      onUpdate({ ...block, type: layout === "Masonry" ? "masonry" : "stacked" });
    } else {
      onUpdate({ ...block, layout });
    }
  };

  if (layouts.length === 0) return null;

  return (
    <div
      ref={ref}
      className="fixed bg-white border border-stone-200 shadow-[0_4px_24px_rgba(0,0,0,0.12)] z-[9999]"
      style={{ width: 200, ...(pos || {}) }}
    >
      <div className="px-3 pt-2.5 pb-2 border-b border-stone-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-stone-700 tracking-wide">Design</span>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-base leading-none transition-colors">×</button>
      </div>

      <div className="px-3">
        <Section label="Layout">
          <div className="flex flex-wrap gap-1.5 pl-1">
            {layouts.map((l) => (
              <button
                key={l}
                onClick={() => handleLayoutChange(l)}
                className={`text-xs px-2.5 py-1 border transition-colors ${
                  currentLayout === l
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-200 text-stone-600 hover:border-stone-400"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
