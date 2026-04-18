import { useEffect, useState, useRef } from "react";
import { getSizedUrl } from "../../common/imageUtils";

function formatBytes(bytes) {
  if (!bytes) return null;
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function formatDate(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return String(value);
  }
}

function formatAperture(value) {
  if (!value) return null;
  const n = parseFloat(value);
  return isNaN(n) ? String(value) : `f/${n}`;
}

function formatShutter(value) {
  if (!value) return null;
  const n = parseFloat(value);
  if (isNaN(n)) return String(value);
  if (n >= 1) return `${n}s`;
  return `1/${Math.round(1 / n)}s`;
}

function slugToName(slug) {
  return slug.split('/').map(part =>
    part.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  ).join(' › ');
}

function slugToPath(slug) {
  return slug.split('/').map(part =>
    part.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  ).join(' / ');
}

function slugToChipLabel(slug) {
  const parts = slug.split('/');
  if (parts.length === 1) return parts[0].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const last2 = parts.slice(-2).map(p => p.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
  return last2.join(' / ');
}

function buildCollectionTree(collections) {
  const bySlug = {};
  collections.forEach(c => { bySlug[c.slug] = { ...c, children: [] }; });
  const roots = [];
  collections.forEach(({ slug }) => {
    const parts = slug.split('/');
    if (parts.length === 1) {
      roots.push(bySlug[slug]);
    } else {
      const parentSlug = parts.slice(0, -1).join('/');
      if (bySlug[parentSlug]) {
        bySlug[parentSlug].children.push(bySlug[slug]);
      } else {
        roots.push(bySlug[slug]);
      }
    }
  });
  return roots;
}

function subtreeMatches(node, q) {
  const leafName = node.slug.split('/').pop().split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  if (leafName.toLowerCase().includes(q)) return true;
  return node.children.some(child => subtreeMatches(child, q));
}

function TreeNode({ node, depth, currentSlugs, onAdd, query }) {
  const q = query?.toLowerCase() || '';
  const leafName = node.slug.split('/').pop().split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const selfMatches = !q || leafName.toLowerCase().includes(q);
  const hasMatchingChild = q && node.children.some(child => subtreeMatches(child, q));

  const [expanded, setExpanded] = useState(depth < 1);
  const isExpanded = q ? (selfMatches || hasMatchingChild) : expanded;

  if (q && !selfMatches && !hasMatchingChild) return null;

  const isAdded = currentSlugs.has(node.slug);

  return (
    <div>
      <div
        className="flex items-center gap-1 hover:bg-stone-50 rounded"
        style={{ paddingLeft: `${6 + depth * 12}px` }}
      >
        {node.children.length > 0 ? (
          <button
            onMouseDown={e => { e.preventDefault(); if (!q) setExpanded(v => !v); }}
            className="text-stone-300 hover:text-stone-500 w-4 text-center text-[10px] flex-shrink-0"
          >
            {isExpanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}
        <button
          onMouseDown={e => { e.preventDefault(); if (!isAdded) onAdd(node.slug, node.type); }}
          disabled={isAdded}
          className={`flex-1 text-left text-xs py-1 pr-2 ${
            isAdded ? 'text-stone-300 cursor-default' :
            !selfMatches ? 'text-stone-400 hover:text-stone-600' :
            'text-stone-700 hover:text-stone-900'
          }`}
        >
          {leafName}
          {isAdded && <span className="ml-1 text-[9px]">✓</span>}
        </button>
      </div>
      {isExpanded && node.children.map(child => (
        <TreeNode key={child.slug} node={child} depth={depth + 1} currentSlugs={currentSlugs} onAdd={onAdd} query={query} />
      ))}
    </div>
  );
}

function CollectionPicker({ current, all, onToggle }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const currentSlugs = new Set(current.map(c => c.slug));
  const tree = buildCollectionTree(all || []);
  const hasAnyMatch = q => tree.some(node => subtreeMatches(node, q.toLowerCase()));

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const add = (slug, type) => {
    onToggle(slug, type, true);
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Current collection chips */}
      {current.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {current.map(({ slug, type }) => (
            <span
              key={slug}
              title={slugToPath(slug)}
              className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 text-[11px] px-2 py-0.5 rounded-full"
            >
              <span>{slugToChipLabel(slug)}</span>
              <button
                onClick={() => onToggle(slug, type, false)}
                className="text-stone-400 hover:text-stone-700 leading-none"
                aria-label={`Remove from ${slugToPath(slug)}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add combobox */}
      {all && all.length > 0 && (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder="Add to collection…"
            className="w-full text-xs text-stone-700 border border-stone-200 rounded px-2.5 py-1.5 outline-none focus:border-stone-400 placeholder-stone-300"
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setQuery(''); } }}
          />
          {open && (
            <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border border-stone-200 shadow-lg rounded max-h-48 overflow-y-auto py-1">
              {query && !hasAnyMatch(query) ? (
                <div className="px-2.5 py-2 text-xs text-stone-400">No collections match</div>
              ) : (
                tree.map(node => (
                  <TreeNode key={node.slug} node={node} depth={0} currentSlugs={currentSlugs} onAdd={add} query={query} />
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-stone-400 flex-shrink-0 w-24">{label}</span>
      <span className="text-stone-700 break-all">{value}</span>
    </div>
  );
}

export default function AdminPhotoLightbox({ images, index, onClose, onNavigate, onCaptionChange, onCaptionChangeToLibrary, isOverride, onToggleOverride, onRevertToLibrary, allCollections, onToggleCollection }) {
  const image = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  const [caption, setCaption] = useState(image?.caption || '');
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    setCaption(image?.caption || '');
    setSaved(true);
  }, [index, image?.caption]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && hasNext) onNavigate(index + 1);
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(index - 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [index, hasPrev, hasNext, onClose, onNavigate]);

  const saveCaption = () => {
    const currentOverride = isOverride?.(index) ?? false;
    const effective = caption !== (image?.caption || '');
    if (!effective) return;
    if (currentOverride) {
      onCaptionChange?.(index, caption);  // writes to block ref
    } else {
      onCaptionChangeToLibrary?.(index, caption);  // writes to library asset
    }
    setSaved(true);
  };

  if (!image) return null;

  // File metadata
  const filename = image.originalFilename || image.url?.split('/').pop();
  const sizeLabel = formatBytes(image.bytes);
  const dimensions = image.width && image.height ? `${image.width} × ${image.height} px` : null;
  const source = image.source?.provider
    ? image.source.provider.charAt(0).toUpperCase() + image.source.provider.slice(1)
    : null;
  const uploadedAt = formatDate(image.createdAt || image.updatedAt);

  // EXIF / capture
  const c = image.capture || {};
  const camera = c.cameraModel || c.make && c.model ? [c.make, c.model].filter(Boolean).join(' ') : null;
  const lens = c.lens || c.lensModel;
  const focal = c.focalLength || c.focalLengthMm ? `${c.focalLength || c.focalLengthMm}mm` : null;
  const aperture = formatAperture(c.aperture || c.fNumber);
  const shutter = formatShutter(c.shutterSpeed || c.exposureTime);
  const iso = c.iso ? `ISO ${c.iso}` : null;
  const dateTaken = formatDate(c.dateTaken || c.dateTimeOriginal || c.dateTime);
  const flash = c.flash != null ? (c.flash ? 'Fired' : 'No flash') : null;
  const gps = c.gpsLatitude && c.gpsLongitude
    ? `${parseFloat(c.gpsLatitude).toFixed(4)}, ${parseFloat(c.gpsLongitude).toFixed(4)}`
    : null;

  // Usage — blockIds are references from actual gallery page blocks
  const blockIds = image.usage?.blockIds || [];
  const collections = image.collections || [];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex"
      onClick={onClose}
    >
      {/* Image area */}
      <div
        className="flex-1 flex items-center justify-center relative p-8 min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        {hasPrev && (
          <button
            aria-label="Previous image"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-4xl leading-none px-2 z-10"
            onClick={() => onNavigate(index - 1)}
          >
            ‹
          </button>
        )}

        <img
          src={getSizedUrl(image.url, 'display')}
          alt={caption || ''}
          className="max-w-full max-h-full object-contain"
        />

        {hasNext && (
          <button
            aria-label="Next image"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-4xl leading-none px-2 z-10"
            onClick={() => onNavigate(index + 1)}
          >
            ›
          </button>
        )}

        <div className="absolute bottom-4 text-white/30 text-xs">
          {index + 1} / {images.length}
        </div>
      </div>

      {/* Metadata panel */}
      <div
        className="w-72 bg-white flex flex-col flex-shrink-0 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 flex-shrink-0">
          <span className="text-xs font-semibold text-stone-500 tracking-wide uppercase">Info</span>
          <button
            aria-label="Close"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-4 space-y-5">

          {/* Caption */}
          <Section title="Caption">
            {/* Override toggle */}
            <div className="flex items-center justify-between text-xs mb-2">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isOverride?.(index) ?? false}
                  onChange={(e) => onToggleOverride?.(index, e.target.checked)}
                  className="w-3 h-3 accent-blue-600"
                />
                <span className="text-stone-500">Override for this page</span>
              </label>
              {(isOverride?.(index)) && (
                <button
                  type="button"
                  onClick={() => onRevertToLibrary?.(index)}
                  className="text-blue-600 text-[10px] hover:underline"
                >
                  Revert to library
                </button>
              )}
            </div>
            <textarea
              value={caption}
              rows={3}
              placeholder="Add a caption…"
              className="w-full text-sm text-stone-700 border border-stone-200 rounded px-2.5 py-2 outline-none focus:border-stone-400 placeholder-stone-300 resize-none"
              onChange={(e) => { setCaption(e.target.value); setSaved(false); }}
              onBlur={saveCaption}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.target.blur(); } }}
            />
            {!saved && (
              <p className="text-[10px] text-stone-400">Press Enter or click away to save</p>
            )}
          </Section>

          {/* File */}
          <Section title="File">
            <Row label="Filename" value={filename} />
            <Row label="Dimensions" value={dimensions} />
            <Row label="File size" value={sizeLabel} />
            <Row label="Source" value={source} />
            <Row label="Uploaded" value={uploadedAt} />
          </Section>

          {/* Camera / EXIF */}
          {(camera || lens || focal || aperture || shutter || iso || dateTaken || flash || gps) && (
            <Section title="Camera">
              <Row label="Camera" value={camera} />
              <Row label="Lens" value={lens} />
              <Row label="Focal length" value={focal} />
              <Row label="Aperture" value={aperture} />
              <Row label="Shutter" value={shutter} />
              <Row label="ISO" value={iso} />
              <Row label="Date taken" value={dateTaken} />
              <Row label="Flash" value={flash} />
              <Row label="GPS" value={gps} />
            </Section>
          )}

          {/* Collections */}
          <Section title="Collections">
            <CollectionPicker
              current={collections}
              all={allCollections}
              onToggle={(slug, type, add) => onToggleCollection && onToggleCollection(slug, type, add)}
            />
          </Section>

          {/* Page usage — blocks in published gallery pages that reference this photo */}
          {blockIds.length > 0 && (
            <Section title="Used in pages">
              <p className="text-xs text-stone-700">{blockIds.length} block{blockIds.length !== 1 ? 's' : ''}</p>
            </Section>
          )}

        </div>
      </div>
    </div>
  );
}
