// components/admin/slideshow-builder/SlideshowSidebar.js
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { MUSIC_PRESETS } from "./musicPresets";

const THEMES = [
  { label: "Ken Burns", value: "kenburns" },
  { label: "Film Stack", value: "film-stack" },
  { label: "Film Single", value: "film-single" },
];

const INPUT = "w-full border-b border-stone-200 p-0 pb-1 text-sm leading-snug text-stone-800 outline-none focus:border-stone-500 transition-colors placeholder:text-stone-300 bg-transparent";

function ChevronIcon({ expanded }) {
  return (
    <svg
      className={`w-3.5 h-3.5 transition-transform ${expanded ? "" : "rotate-180"}`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}

function Card({ title, children, defaultExpanded = true }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden mb-1.5">
      <button
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-stone-50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <span className="text-xs font-semibold text-stone-600 flex-1 tracking-wide">{title}</span>
        <ChevronIcon expanded={expanded} />
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-stone-100 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

function AutoGrowTextarea({ className, value, onChange, placeholder, ...props }) {
  const ref = useRef(null);
  const adjust = useCallback(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, []);
  useEffect(() => { adjust(); }, [value, adjust]);
  return (
    <textarea
      ref={ref}
      className={className}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={1}
      style={{ overflow: "hidden", resize: "none" }}
      {...props}
    />
  );
}

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

export default function SlideshowSidebar({
  gallery,
  onChange,
  onPublish,
  publishing,
  autosaveStatus,
  hasDraft,
  isPublished,
  onPickCover,
  onCollapse,
}) {
  const ss = gallery.slideshowSettings || {};
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [contextMenu]);

  const updateSS = (key, value) => onChange({
    ...gallery,
    slideshowSettings: { ...ss, [key]: value },
  });

  const isCustomMusic = ss.youtubeLink !== undefined && ss.youtubeLink !== "" && !MUSIC_PRESETS.some(p => p.url === ss.youtubeLink);

  // Title and description: show the actual value if set, otherwise fall back to gallery name/description
  const titleValue = ss.title !== undefined && ss.title !== "" ? ss.title : gallery.name || "";
  const descValue = ss.description !== undefined && ss.description !== "" ? ss.description : gallery.description || "";

  return (
    <div
      className="w-72 flex-shrink-0 flex flex-col h-full bg-stone-50 relative z-10 text-left font-sans"
      style={{ boxShadow: "1px 0 0 #e7e5e3, 4px 0 20px rgba(0,0,0,0.05)" }}
    >
      {/* Header */}
      <div className="px-3 pt-3 pb-3 flex items-center gap-2 flex-shrink-0 border-b border-stone-200">
        <Link
          href={`/admin/galleries/${gallery.slug}`}
          className="text-xs text-stone-400 hover:text-stone-700 transition-colors leading-none"
        >
          ← Gallery
        </Link>
        <span className="flex-1" />
        <span className="text-[10px] text-stone-400">
          {autosaveStatus === "saving" && "Saving…"}
          {autosaveStatus === "saved" && "Saved"}
          {autosaveStatus === "unsaved" && "Unsaved"}
        </span>
        <button
          onClick={onCollapse}
          className="text-stone-400 hover:text-stone-700 transition-colors flex-shrink-0"
          title="Collapse sidebar"
        >
          <svg className="w-3.5 h-3.5 -rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-3 py-3">

        {/* Theme card */}
        <Card title="Theme">
          <select
            className="w-full border-b border-stone-200 pb-0.5 text-sm text-stone-800 outline-none focus:border-stone-500 bg-transparent transition-colors"
            value={ss.layout || "kenburns"}
            onChange={e => updateSS("layout", e.target.value)}
          >
            {THEMES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Card>

        {/* Cover card */}
        <Card title="Cover">
          <div className="space-y-4">
            {/* Cover photo */}
            <div>
            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Cover Photo</div>
            <div className="flex items-center gap-3 pt-0.5">
              <div
                onClick={onPickCover}
                className={`w-12 h-12 overflow-hidden flex-shrink-0 flex items-center justify-center border border-stone-200 cursor-pointer hover:border-stone-400 transition-colors ${ss.coverImageUrl ? "" : "bg-stone-50"}`}
              >
                {ss.coverImageUrl ? (
                  <img src={`/_next/image?url=${encodeURIComponent(ss.coverImageUrl)}&w=200&q=70`} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-4 h-4 text-stone-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5" />
                  </svg>
                )}
              </div>
              <button
                onClick={onPickCover}
                className="text-xs text-stone-600 hover:text-stone-900 text-left transition-colors leading-none"
              >
                Select from library
              </button>
            </div>
            </div>

            {/* Title */}
            <div>
              <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Title</div>
              <input
                className={INPUT}
                placeholder="Slideshow title"
                value={titleValue}
                onChange={e => updateSS("title", e.target.value)}
              />
            </div>

            {/* Description */}
            <div>
              <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Description</div>
              <AutoGrowTextarea
                className={INPUT}
                placeholder="Slideshow description"
                value={descValue}
                onChange={e => updateSS("description", e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Images card */}
        <Card title="Images">
          {(() => {
            const allUrls = collectGalleryImages(gallery.blocks);
            const excluded = new Set(ss.excludedImageUrls || []);
            if (allUrls.length === 0) {
              return <p className="text-xs text-stone-400">No images in this gallery yet.</p>;
            }
            return (
              <div className="grid grid-cols-3 gap-px bg-stone-200">
                {allUrls.map((url) => {
                  const isExcluded = excluded.has(url);
                  return (
                    <div
                      key={url}
                      className="relative group/thumb aspect-square bg-stone-100 overflow-hidden cursor-context-menu"
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, url });
                      }}
                    >
                      <img
                        src={`/_next/image?url=${encodeURIComponent(url)}&w=200&q=65`}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ opacity: isExcluded ? 0.3 : 1 }}
                        loading="lazy"
                      />
                      {isExcluded && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-stone-500 text-xs font-bold bg-white/80 rounded px-1">✕</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Card>

        {/* Music card */}
        <Card title="Music">
          <div className="space-y-4">
            <div>
              <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Track</div>
              <select
                className="w-full border-b border-stone-200 pb-0.5 text-sm text-stone-800 outline-none focus:border-stone-500 bg-transparent transition-colors"
                value={MUSIC_PRESETS.some(p => p.url === ss.youtubeLink) ? ss.youtubeLink : (ss.youtubeLink ? "__custom__" : "")}
                onChange={e => {
                  if (e.target.value === "__custom__" || e.target.value === "") {
                    onChange({ ...gallery, slideshowSettings: { ...ss, youtubeLink: e.target.value === "" ? "" : (ss.youtubeLink && !MUSIC_PRESETS.some(p => p.url === ss.youtubeLink) ? ss.youtubeLink : "") } });
                  } else {
                    const preset = MUSIC_PRESETS.find(p => p.url === e.target.value);
                    onChange({
                      ...gallery,
                      slideshowSettings: {
                        ...ss,
                        youtubeLink: e.target.value,
                        musicCredit: preset ? preset.label : ss.musicCredit,
                      },
                    });
                  }
                }}
              >
                <option value="">Select a track…</option>
                {MUSIC_PRESETS.map(p => (
                  <option key={p.url} value={p.url}>{p.label}</option>
                ))}
                <option value="__custom__">Custom URL…</option>
              </select>
            </div>

            {/* Custom URL input */}
            {isCustomMusic && (
              <input
                className={INPUT}
                placeholder="YouTube URL"
                value={ss.youtubeLink || ""}
                onChange={e => updateSS("youtubeLink", e.target.value)}
              />
            )}

            {/* Music credit */}
            <div>
              <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Credit</div>
              <input
                className={INPUT}
                placeholder="e.g. Music: Song — Artist"
                value={ss.musicCredit || ""}
                onChange={e => updateSS("musicCredit", e.target.value)}
              />
            </div>
          </div>
        </Card>

      </div>

      {/* Publish — bottom */}
      <div className="p-3 border-t border-stone-200 flex-shrink-0">
        <button
          onClick={onPublish}
          disabled={publishing || (isPublished && !hasDraft)}
          className="w-full text-xs font-semibold bg-stone-900 text-white px-3 py-2.5 hover:bg-stone-700 disabled:opacity-40 transition-colors"
        >
          {publishing ? "Publishing…" : "Publish"}
        </button>
      </div>

      {/* Context menu for image exclude/include */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-stone-200 shadow-lg z-[9999] py-1 w-44"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          {(() => {
            const excluded = new Set(ss.excludedImageUrls || []);
            const isExcluded = excluded.has(contextMenu.url);
            const toggle = () => {
              const next = isExcluded
                ? (ss.excludedImageUrls || []).filter(u => u !== contextMenu.url)
                : [...(ss.excludedImageUrls || []), contextMenu.url];
              updateSS("excludedImageUrls", next);
              setContextMenu(null);
            };
            return (
              <button
                onClick={toggle}
                className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50 transition-colors"
              >
                {isExcluded ? "Include in slideshow" : "Exclude from slideshow"}
              </button>
            );
          })()}
        </div>
      )}
    </div>
  );
}
