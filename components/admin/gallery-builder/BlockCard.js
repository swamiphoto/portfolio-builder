import { useState, useRef, useEffect } from "react";
import { getSizedUrl } from "../../../common/imageUtils";
import { normalizeImageRefs, buildMultiImageFields } from "../../../common/assetRefs";
import DesignPopover from "./DesignPopover";
import AdminPhotoLightbox from "../AdminPhotoLightbox";

const TYPE_LABELS = {
  photo: "Photo",
  photos: "Photos",
  stacked: "Photos",
  masonry: "Photos",
  text: "Text",
  video: "Video",
  "page-gallery": "Page Gallery",
};

const INPUT = "w-full border-b border-stone-200 pb-1.5 text-sm text-stone-800 outline-none focus:border-stone-500 transition-colors placeholder:text-stone-300 bg-transparent";

function PaintbrushIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    </svg>
  );
}

function PhotoThumb({ imageRef, dragHandleProps, onRemove, onUpdateCaption, onPreview }) {
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(imageRef.caption || '');
  const inputRef = useRef(null);

  useEffect(() => { setCaption(imageRef.caption || ''); }, [imageRef.caption]);

  const commit = () => {
    setEditing(false);
    if (caption !== (imageRef.caption || '')) onUpdateCaption(caption);
  };

  return (
    <div
      {...dragHandleProps}
      className="relative group/thumb aspect-square bg-stone-100 overflow-hidden cursor-grab"
      onClick={() => !editing && onPreview && onPreview()}
    >
      <img
        src={getSizedUrl(imageRef.url, 'thumbnail')}
        alt=""
        className="w-full h-full object-cover pointer-events-none"
        loading="lazy"
        onError={(e) => { if (e.target.src !== imageRef.url) e.target.src = imageRef.url }}
      />
      {/* Caption overlay — shows current caption on hover, click to edit */}
      {!editing && (
        <div
          className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[9px] px-1.5 py-1 opacity-0 group-hover/thumb:opacity-100 transition-opacity cursor-text leading-tight"
          onClick={(e) => { e.stopPropagation(); setEditing(true); setTimeout(() => inputRef.current?.focus(), 30); }}
        >
          {caption || <span className="italic text-white/50">caption…</span>}
        </div>
      )}
      {editing && (
        <div className="absolute inset-x-0 bottom-0 z-20 bg-white p-1">
          <input
            ref={inputRef}
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') { setCaption(imageRef.caption || ''); setEditing(false); }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-[9px] text-stone-800 outline-none border-b border-stone-400 pb-0.5 bg-transparent"
            placeholder="Caption…"
          />
        </div>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute top-0.5 right-0.5 bg-black/50 text-white text-[9px] px-1 py-0.5 opacity-0 group-hover/thumb:opacity-100 transition-opacity leading-none z-10"
      >
        ×
      </button>
    </div>
  );
}

export default function BlockCard({
  block,
  dragHandleProps,
  onUpdate,
  onRemove,
  onAddPhotos,
  onRemovePhoto,
  pages,
}) {
  const isPhotoBlock = block.type === "photos" || block.type === "stacked" || block.type === "masonry";
  const dragPhotoIndex = useRef(null);
  const hasDesign = block.type === "photo" || block.type === "stacked" || block.type === "masonry" || block.type === "text" || block.type === "video";

  const [expanded, setExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showDesign, setShowDesign] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const menuRef = useRef(null);
  const designBtnRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    const url = e.dataTransfer.getData("text/plain");
    if (!url || !isPhotoBlock) return;
    const existingRefs = normalizeImageRefs(block.images || block.imageUrls || []);
    if (existingRefs.some(r => r.url === url)) return;
    onUpdate({ ...block, ...buildMultiImageFields([...existingRefs, { assetId: null, url }]) });
  };

  const blockImageRefs = isPhotoBlock
    ? normalizeImageRefs(block.images || block.imageUrls || [])
    : [];

  const singlePhotoImages = block.type === "photo" && (block.imageUrl || block.image)
    ? [{ url: block.imageUrl || block.image?.url || '', caption: block.caption || '' }]
    : [];

  return (
    <div
      className="bg-white border border-stone-200 rounded-lg shadow-sm group/card mb-1.5"
      onDragOver={isPhotoBlock ? handleDragOver : undefined}
      onDrop={isPhotoBlock ? handleDrop : undefined}
    >
      {/* Card header */}
      <div className="flex items-center gap-1.5 px-3 py-2.5">
        <span
          {...dragHandleProps}
          className="text-stone-300 cursor-grab hover:text-stone-500 text-sm leading-none select-none flex-shrink-0 transition-colors"
        >
          ⠿
        </span>

        <button
          className="text-xs font-semibold text-stone-600 tracking-wide flex-1 text-left hover:text-stone-900 transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          {TYPE_LABELS[block.type] || block.type}
        </button>

        {/* Hover-reveal actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
          {(block.type === "photo" || isPhotoBlock) && (
            <button
              onClick={onAddPhotos}
              title="Add photos"
              className="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors text-base leading-none"
            >
              +
            </button>
          )}

          {hasDesign && (
            <div className="relative">
              <button
                ref={designBtnRef}
                onClick={() => setShowDesign((v) => !v)}
                title="Design"
                className={`w-6 h-6 flex items-center justify-center transition-colors ${
                  showDesign ? "text-stone-800" : "text-stone-400 hover:text-stone-700"
                }`}
              >
                <PaintbrushIcon />
              </button>
              {showDesign && (
                <DesignPopover
                  block={block}
                  onUpdate={onUpdate}
                  onClose={() => setShowDesign(false)}
                  anchorEl={designBtnRef.current}
                />
              )}
            </div>
          )}

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors text-sm leading-none"
            >
              ⋯
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-stone-200 shadow-lg z-20 py-1 w-36">
                <button
                  onClick={() => { setShowMenu(false); onRemove(); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-stone-50 transition-colors whitespace-nowrap"
                >
                  Remove block
                </button>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-stone-300 hover:text-stone-500 transition-colors flex-shrink-0"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform ${expanded ? "" : "rotate-180"}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-stone-100 pt-3 space-y-2.5">

          {/* Single photo */}
          {block.type === "photo" && (
            <>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const url = e.dataTransfer.getData("text/plain");
                  if (url) onUpdate({ ...block, imageUrl: url });
                }}
              >
                {block.imageUrl ? (
                  <div className="relative group/img cursor-pointer" onClick={() => setLightboxIndex(0)}>
                    <img
                      src={getSizedUrl(block.imageUrl, 'thumbnail')}
                      alt=""
                      className="w-full aspect-video object-cover"
                      onError={(e) => { if (e.target.src !== block.imageUrl) e.target.src = block.imageUrl }}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); onUpdate({ ...block, imageUrl: "" }); }}
                      className="absolute top-1.5 right-1.5 bg-black/50 text-white text-[10px] px-2 py-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity"
                    >
                      × Remove
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={onAddPhotos}
                    className="flex flex-col items-center justify-center h-20 bg-stone-50 border border-dashed border-stone-200 hover:border-stone-400 cursor-pointer transition-colors gap-0.5"
                  >
                    <span className="text-xs text-stone-500">Drag a photo here</span>
                    <span className="text-xs text-stone-400">or <span className="underline underline-offset-2 hover:text-stone-700 transition-colors">select from library</span></span>
                  </div>
                )}
              </div>
              <input
                className={INPUT}
                placeholder="Caption"
                value={block.caption || ""}
                onChange={(e) => onUpdate({ ...block, caption: e.target.value })}
              />
            </>
          )}

          {/* Photos block (stacked or masonry) */}
          {isPhotoBlock && (
            <>
              {blockImageRefs.length === 0 ? (
                <div
                  onClick={onAddPhotos}
                  className="flex flex-col items-center justify-center h-16 bg-stone-50 border border-dashed border-stone-200 hover:border-stone-400 cursor-pointer transition-colors gap-0.5"
                >
                  <span className="text-xs text-stone-500">Drag photos here</span>
                  <span className="text-xs text-stone-400">or <span className="underline underline-offset-2 hover:text-stone-700 transition-colors">select from library</span></span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-px bg-stone-200">
                  {blockImageRefs.map((ref, i) => (
                    <PhotoThumb
                      key={ref.url}
                      imageRef={ref}
                      onPreview={() => setLightboxIndex(i)}
                      dragHandleProps={{
                        draggable: true,
                        onDragStart: (e) => { dragPhotoIndex.current = i; e.dataTransfer.effectAllowed = "move"; e.stopPropagation(); },
                        onDragOver: (e) => { e.preventDefault(); e.stopPropagation(); },
                        onDrop: (e) => {
                          e.preventDefault(); e.stopPropagation();
                          const from = dragPhotoIndex.current;
                          if (from === null || from === i) return;
                          const refs = normalizeImageRefs(block.images || block.imageUrls || []);
                          const [moved] = refs.splice(from, 1);
                          refs.splice(i, 0, moved);
                          dragPhotoIndex.current = null;
                          onUpdate({ ...block, ...buildMultiImageFields(refs) });
                        },
                        onDragEnd: () => { dragPhotoIndex.current = null; },
                      }}
                      onRemove={() => onRemovePhoto(ref)}
                      onUpdateCaption={(caption) => {
                        const refs = normalizeImageRefs(block.images || block.imageUrls || []);
                        const updated = refs.map((r, j) => j === i ? { ...r, caption } : r);
                        onUpdate({ ...block, ...buildMultiImageFields(updated) });
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Text */}
          {block.type === "text" && (
            <textarea
              className={`${INPUT} resize-none`}
              placeholder="Write something…"
              rows={3}
              value={block.content || ""}
              onChange={(e) => onUpdate({ ...block, content: e.target.value })}
            />
          )}

          {/* Video */}
          {block.type === "video" && (
            <>
              <input
                className={INPUT}
                placeholder="YouTube URL"
                value={block.url || ""}
                onChange={(e) => onUpdate({ ...block, url: e.target.value })}
              />
              <input
                className={INPUT}
                placeholder="Caption"
                value={block.caption || ""}
                onChange={(e) => onUpdate({ ...block, caption: e.target.value })}
              />
            </>
          )}

          {/* Page Gallery */}
          {block.type === "page-gallery" && (
            <div className="space-y-1.5">
              {(!pages || pages.length === 0) ? (
                <p className="text-xs text-stone-400">No other pages yet.</p>
              ) : (
                pages.map(p => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(block.pageIds || []).includes(p.id)}
                      onChange={e => {
                        const pageIds = e.target.checked
                          ? [...(block.pageIds || []), p.id]
                          : (block.pageIds || []).filter(id => id !== p.id)
                        onUpdate({ ...block, pageIds })
                      }}
                      className="w-3 h-3 flex-shrink-0"
                    />
                    <span className="text-xs text-stone-700 truncate">{p.title}</span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Admin inspector lightbox for block image previews */}
      {lightboxIndex !== null && (
        <AdminPhotoLightbox
          images={isPhotoBlock ? blockImageRefs : singlePhotoImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          onCaptionChange={(i, newCaption) => {
            if (isPhotoBlock) {
              const refs = normalizeImageRefs(block.images || block.imageUrls || []);
              const updated = refs.map((r, j) => j === i ? { ...r, caption: newCaption } : r);
              onUpdate({ ...block, ...buildMultiImageFields(updated) });
            } else {
              onUpdate({ ...block, caption: newCaption });
            }
          }}
        />
      )}
    </div>
  );
}
