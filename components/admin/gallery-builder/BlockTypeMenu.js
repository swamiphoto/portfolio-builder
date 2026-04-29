import { useEffect, useRef, useState } from "react";
import { defaultBlock } from "../../../common/blocks";

export { defaultBlock };

const PRIMARY_TYPES = [
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

const MORE_TYPES = [
  {
    type: "contact",
    label: "Contact",
    desc: "Contact form with email",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 6l-10 7L2 6" />
        <rect x="2" y="5" width="20" height="14" rx="2" />
      </svg>
    ),
  },
  {
    type: "testimonial",
    label: "Testimonial",
    desc: "Quote with photo and name",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" />
      </svg>
    ),
  },
];

function BlockRow({ type, label, desc, icon, onAdd, onClose }) {
  return (
    <button
      onClick={() => { onAdd(defaultBlock(type)); onClose(); }}
      className="w-full text-left transition-colors"
      style={{ padding: '7px 12px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10 }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,140,110,0.13)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{ flexShrink: 0, color: 'var(--text-secondary)', opacity: 0.75, paddingTop: 1 }}>{icon}</span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.2 }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>{desc}</span>
      </span>
    </button>
  )
}

export default function BlockTypeMenu({ onAdd, onClose, anchorRect }) {
  const ref = useRef(null);
  const [expanded, setExpanded] = useState(false);

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
      {PRIMARY_TYPES.map(({ type, label, desc, icon }) => (
        <BlockRow key={type} type={type} label={label} desc={desc} icon={icon} onAdd={onAdd} onClose={onClose} />
      ))}

      {/* More toggle */}
      <div style={{ height: 1, background: 'rgba(160,140,110,0.18)', margin: '4px 8px' }} />
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left transition-colors"
        style={{ padding: '6px 12px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,140,110,0.13)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', transition: 'transform 150ms', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6l4 4 4-4" />
          </svg>
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
          {expanded ? 'Less' : 'More blocks'}
        </span>
      </button>

      {expanded && MORE_TYPES.map(({ type, label, desc, icon }) => (
        <BlockRow key={type} type={type} label={label} desc={desc} icon={icon} onAdd={onAdd} onClose={onClose} />
      ))}
    </div>
  );
}
