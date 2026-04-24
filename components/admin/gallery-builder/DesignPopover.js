import { useRef, useEffect, useState } from "react";

// Only include layout options that are actually rendered
const LAYOUTS = {
  photo: ["Edge to edge", "Centered"],
  photos: ["Stacked", "Masonry"],
  stacked: ["Stacked", "Masonry"],
  masonry: ["Stacked", "Masonry"],
  video: ["Edge to edge", "Centered"],
};

const overlineCls = 'text-[10px] font-mono font-medium text-ink-4 uppercase tracking-[0.14em]'

function Section({ label, children }) {
  return (
    <div className="py-3 border-b border-rule last:border-0">
      <div className={`${overlineCls} mb-2 pl-1`}>{label}</div>
      {children}
    </div>
  );
}

export default function DesignPopover({ block, onUpdate, onClose, anchorEl }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  const blockType = block.type;

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
      className="fixed bg-paper border border-rule z-[9999]"
      style={{ width: 200, boxShadow: 'var(--pane-shadow-lift)', ...(pos || {}) }}
    >
      <div className="px-3 pt-2.5 pb-2 border-b border-rule flex items-center justify-between">
        <span className={overlineCls}>Design</span>
        <button onClick={onClose} className="text-ink-4 hover:text-ink-2 text-base leading-none transition-colors">×</button>
      </div>

      <div className="px-3">
        <Section label="Layout">
          <div className="flex flex-wrap gap-1.5 pl-1">
            {layouts.map((l) => (
              <button
                key={l}
                onClick={() => handleLayoutChange(l)}
                className={`text-[10px] font-mono uppercase tracking-[0.12em] px-2.5 py-1 border transition-colors ${
                  currentLayout === l
                    ? "border-ink bg-ink text-paper"
                    : "border-rule text-ink-3 hover:border-ink-4"
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
