import { useEffect, useRef } from "react";
import { defaultBlock } from "../../../common/blocks";

export { defaultBlock };

const BLOCK_TYPES = [
  {
    type: "photo",
    label: "Photo",
    desc: "Single image with caption",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8.5" cy="10.5" r="1.5" />
        <path d="M21 15l-5-5a2 2 0 00-2.8 0L7 16" />
      </svg>
    ),
  },
  {
    type: "photos",
    label: "Photos",
    desc: "Stacked or masonry layout",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="8" height="11" rx="1.5" />
        <rect x="13" y="3" width="8" height="6" rx="1.5" />
        <rect x="13" y="12" width="8" height="9" rx="1.5" />
        <rect x="3" y="17" width="8" height="4" rx="1.5" />
      </svg>
    ),
  },
  {
    type: "text",
    label: "Text",
    desc: "Heading or paragraph",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7V5h16v2" />
        <path d="M12 5v14" />
        <path d="M8 19h8" />
      </svg>
    ),
  },
  {
    type: "video",
    label: "Video",
    desc: "YouTube or Vimeo embed",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M10 9l5 3-5 3V9z" strokeWidth={1.5} fill="currentColor" stroke="none" opacity={0.7} />
      </svg>
    ),
  },
  {
    type: "contact",
    label: "Contact",
    desc: "Email and social links",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 6l-10 7L2 6" />
        <rect x="2" y="5" width="20" height="14" rx="2" />
      </svg>
    ),
  },
  {
    type: "page-gallery",
    label: "Pages",
    desc: "Thumbnail links to other pages",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" />
      </svg>
    ),
  },
];

export default function BlockTypeMenu({ onAdd, onClose, anchorRect }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const openUpward = anchorRect && window.innerHeight - anchorRect.bottom < 300;
  const style = anchorRect
    ? {
        position: "fixed",
        left: anchorRect.left,
        width: 230,
        zIndex: 9999,
        ...(openUpward
          ? { bottom: window.innerHeight - anchorRect.top + 6 }
          : { top: anchorRect.bottom + 6 }),
      }
    : undefined;

  return (
    <div
      ref={ref}
      style={{
        ...style,
        background: 'var(--popover)',
        boxShadow: 'var(--popover-shadow)',
        borderRadius: 10,
        padding: '5px 0',
        overflow: 'hidden',
      }}
    >
      {BLOCK_TYPES.map(({ type, label, desc, icon }, i) => (
        <div key={type}>
          {type === 'page-gallery' && (
            <div style={{ height: 1, background: 'rgba(160,140,110,0.18)', margin: '4px 8px' }} />
          )}
          <button
            onClick={() => { onAdd(defaultBlock(type)); onClose(); }}
            className="w-full text-left transition-colors"
            style={{ padding: '7px 12px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,140,110,0.13)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <span style={{ flexShrink: 0, color: 'var(--text-secondary)', opacity: 0.75, paddingTop: 1 }}>
              {icon}
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.2 }}>{label}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>{desc}</span>
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}
