import { useEffect, useState, useRef } from "react";
import { getSizedUrl } from "../../common/imageUtils";

const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace';
const SERIF = '"Cormorant Garamond", "Muse", Georgia, serif';
const BORDER = 'rgba(160,140,110,0.18)';

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
  const n = parseFloat(String(value).replace(/^[fFƒ]\/?/, ''));
  if (isNaN(n)) return String(value);
  const r = Math.round(n * 10) / 10;
  return `ƒ${Number.isInteger(r) ? r : r.toFixed(1)}`;
}

function formatShutter(value) {
  if (!value) return null;
  const str = String(value);
  const slash = str.indexOf('/');
  const n = slash > 0
    ? parseFloat(str.slice(0, slash)) / parseFloat(str.slice(slash + 1))
    : parseFloat(str);
  if (isNaN(n)) return str;
  if (n >= 1) { const r = Math.round(n * 10) / 10; return `${Number.isInteger(r) ? r : r.toFixed(1)}s`; }
  return `1/${Math.round(1 / n)}`;
}

function slugToPath(slug) {
  return slug.split('/').map(part =>
    part.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  ).join(' / ');
}

function slugToChipLabel(slug) {
  const parts = slug.split('/');
  if (parts.length === 1) return parts[0].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return parts.slice(-2).map(p => p.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')).join(' / ');
}

function buildSetTree(sets) {
  const bySlug = {};
  sets.forEach(c => { bySlug[c.slug] = { ...c, children: [] }; });
  const roots = [];
  sets.forEach(({ slug }) => {
    const parts = slug.split('/');
    if (parts.length === 1) {
      roots.push(bySlug[slug]);
    } else {
      const parentSlug = parts.slice(0, -1).join('/');
      if (bySlug[parentSlug]) bySlug[parentSlug].children.push(bySlug[slug]);
      else roots.push(bySlug[slug]);
    }
  });
  return roots;
}

function subtreeMatches(node, q) {
  const leafName = node.slug.split('/').pop().split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  if (leafName.toLowerCase().includes(q)) return true;
  return node.children.some(child => subtreeMatches(child, q));
}

const LINE_COLOR = 'rgba(160,140,110,0.22)';

function TreeNode({ node, depth, currentSlugs, onAdd, query }) {
  const q = query?.toLowerCase() || '';
  const leafName = node.slug.split('/').pop().split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const selfMatches = !q || leafName.toLowerCase().includes(q);
  const hasMatchingChild = q && node.children.some(child => subtreeMatches(child, q));
  const [expanded, setExpanded] = useState(depth < 1);
  const isExpanded = q ? (selfMatches || hasMatchingChild) : expanded;

  if (q && !selfMatches && !hasMatchingChild) return null;

  const isAdded = currentSlugs.has(node.slug);
  const INDENT = 14;
  const left = 8 + depth * INDENT;

  return (
    <div style={{ position: 'relative' }}>
      {depth > 0 && (
        <div style={{ position: 'absolute', left: left - INDENT + 7, top: 0, bottom: 0, width: 1, background: LINE_COLOR, pointerEvents: 'none' }} />
      )}
      <div
        className="flex items-center"
        style={{ paddingLeft: left, paddingRight: 8, height: 26 }}
        onMouseEnter={e => { if (!isAdded) e.currentTarget.style.background = 'rgba(44,36,22,0.04)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        {node.children.length > 0 ? (
          <button
            onMouseDown={e => { e.preventDefault(); if (!q) setExpanded(v => !v); }}
            style={{ color: '#b0a490', width: 14, flexShrink: 0, fontSize: 9, fontFamily: MONO, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {isExpanded ? '▾' : '▸'}
          </button>
        ) : (
          <span style={{ width: 14, flexShrink: 0 }}>
            {depth > 0 && (
              <span style={{ display: 'inline-block', width: 6, height: 1, background: LINE_COLOR, verticalAlign: 'middle', marginLeft: 0 }} />
            )}
          </span>
        )}
        <button
          onMouseDown={e => { e.preventDefault(); if (!isAdded) onAdd(node.slug, node.type); }}
          disabled={isAdded}
          style={{
            flex: 1, textAlign: 'left', background: 'none', border: 'none', padding: 0,
            fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.01em',
            color: isAdded ? '#b0a490' : (!selfMatches ? '#a8967a' : '#2c2416'),
            cursor: isAdded ? 'default' : 'pointer',
          }}
        >
          {leafName}
          {isAdded && <span style={{ marginLeft: 5, fontSize: 9, color: '#a8967a' }}>✓</span>}
        </button>
      </div>
      {isExpanded && node.children.map(child => (
        <TreeNode key={child.slug} node={child} depth={depth + 1} currentSlugs={currentSlugs} onAdd={onAdd} query={query} />
      ))}
    </div>
  );
}

function SetPicker({ current, all, onToggle }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const currentSlugs = new Set(current.map(c => c.slug));
  const tree = buildSetTree(all || []);
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
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {current.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {current.map(({ slug, type }) => {
            const parts = slug.split('/').map(p =>
              p.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
            ).slice(-2);
            return (
              <span
                key={slug}
                title={slugToPath(slug)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.03em',
                  padding: '2px 6px 2px 8px', borderRadius: 3,
                  background: 'rgba(139,111,71,0.1)',
                  border: '1px solid rgba(139,111,71,0.22)',
                }}
              >
                <span>
                  {parts.map((part, i) => (
                    <span key={i}>
                      {i > 0 && <span style={{ color: '#b0a490', margin: '0 2px' }}>/</span>}
                      <span style={{ color: i === parts.length - 1 ? '#2c2416' : '#a8967a' }}>{part}</span>
                    </span>
                  ))}
                </span>
                <button
                  onClick={() => onToggle(slug, type, false)}
                  style={{ color: '#a8967a', background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px', lineHeight: 1, fontSize: 13 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#5c4f3a'}
                  onMouseLeave={e => e.currentTarget.style.color = '#a8967a'}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {all && all.length > 0 && (
        <div style={{ position: 'relative' }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder="Add to set…"
            style={{
              width: '100%', boxSizing: 'border-box',
              fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.01em',
              color: '#2c2416',
              background: '#ede8df',
              border: `1px solid ${BORDER}`,
              borderRadius: 4,
              padding: '5px 10px',
              outline: 'none',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(139,111,71,0.45)'; setOpen(true); }}
            onBlur={e => { e.target.style.borderColor = BORDER; }}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setQuery(''); } }}
          />
          {open && (
            <div
              style={{
                position: 'absolute', zIndex: 30, top: '100%', marginTop: 4,
                left: 0, right: 0,
                background: '#f9f6f1',
                border: `1px solid ${BORDER}`,
                borderRadius: 6,
                boxShadow: '0 4px 16px rgba(26,18,10,0.12)',
                maxHeight: 200, overflowY: 'auto',
                padding: '4px 0',
              }}
            >
              {query && !hasAnyMatch(query) ? (
                <div style={{ padding: '8px 12px', fontFamily: MONO, fontSize: 10.5, color: '#a8967a' }}>No sets match</div>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a8967a', margin: 0 }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({ label, value, children }) {
  if (!children && !value && value !== 0) return null;
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.02em', color: '#a8967a', flexShrink: 0, width: 88 }}>{label}</span>
      {children || <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.01em', color: '#2c2416', wordBreak: 'break-all' }}>{value}</span>}
    </div>
  );
}

function FilenameValue({ filename }) {
  if (!filename) return null;
  const parts = filename.split('/');
  return (
    <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.01em', wordBreak: 'break-all' }}>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && <span style={{ color: '#b0a490' }}>/</span>}
          <span style={{ color: i === parts.length - 1 ? '#2c2416' : '#a8967a' }}>{part}</span>
        </span>
      ))}
    </span>
  );
}

export default function AdminPhotoLightbox({ images, index, onClose, onNavigate, onCaptionChange, onCaptionChangeToLibrary, isOverride, onToggleOverride, onRevertToLibrary, allSets, onToggleSet }) {
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
    if (caption === (image?.caption || '')) return;
    if (isOverride?.(index)) {
      onCaptionChange?.(index, caption);
    } else {
      onCaptionChangeToLibrary?.(index, caption);
    }
    setSaved(true);
  };

  if (!image) return null;

  const filename = image.originalFilename || image.url?.split('/').pop();
  const sizeLabel = formatBytes(image.bytes);
  const dimensions = image.width && image.height ? `${image.width} × ${image.height}` : null;
  const uploadedAt = formatDate(image.createdAt || image.updatedAt);

  const c = image.capture || {};
  const capturedAt = formatDate(c.capturedAt || c.dateTaken || c.dateTimeOriginal || c.dateTime);
  const camera = c.cameraModel || (c.make && c.model ? [c.make, c.model].filter(Boolean).join(' ') : null);
  const lens = c.lens || c.lensModel;
  const focal = (c.focalLength || c.focalLengthMm) ? `${Math.round(c.focalLength || c.focalLengthMm)}mm` : null;
  const aperture = formatAperture(c.aperture || c.fNumber);
  const shutter = formatShutter(c.shutterSpeed || c.exposureTime);
  const iso = c.iso ? `ISO ${c.iso}` : null;
  const dateTaken = formatDate(c.dateTaken || c.dateTimeOriginal || c.dateTime);
  const flash = c.flash != null ? (c.flash ? 'Fired' : 'No flash') : null;
  const gps = c.gpsLatitude && c.gpsLongitude
    ? `${parseFloat(c.gpsLatitude).toFixed(4)}, ${parseFloat(c.gpsLongitude).toFixed(4)}`
    : null;

  const blockIds = image.usage?.blockIds || [];
  const sets = image.sets || [];

  return (
    <div
      className="fixed inset-0 z-50 flex"
      style={{ background: 'rgba(20,14,8,0.96)' }}
      onClick={onClose}
    >
      {/* Image area */}
      <div
        className="flex-1 flex items-center justify-center relative min-w-0"
        style={{ padding: 48 }}
        onClick={e => e.stopPropagation()}
      >
        {hasPrev && (
          <button
            aria-label="Previous image"
            onClick={() => onNavigate(index - 1)}
            className="absolute flex items-center justify-center transition-colors"
            style={{ left: 12, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, background: 'rgba(255,255,255,0.08)', borderRadius: 6, color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
          >
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 1L1 7l6 6" />
            </svg>
          </button>
        )}

        <img
          src={getSizedUrl(image.url, 'display')}
          alt={caption || ''}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />

        {hasNext && (
          <button
            aria-label="Next image"
            onClick={() => onNavigate(index + 1)}
            className="absolute flex items-center justify-center transition-colors"
            style={{ right: 12, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, background: 'rgba(255,255,255,0.08)', borderRadius: 6, color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
          >
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 1l6 6-6 6" />
            </svg>
          </button>
        )}

        <div style={{ position: 'absolute', bottom: 16, fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.25)' }}>
          {index + 1} / {images.length}
        </div>
      </div>

      {/* Metadata panel */}
      <div
        className="flex flex-col flex-shrink-0 overflow-y-auto scroll-quiet"
        style={{ width: 280, background: '#f4efe8', borderLeft: '1px solid rgba(160,140,110,0.15)', position: 'relative' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button — absolutely positioned so it doesn't push content down */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, background: 'transparent', border: 'none', cursor: 'pointer', color: '#7a6b55', zIndex: 1 }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(44,36,22,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
            <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" />
          </svg>
        </button>

        <div style={{ padding: '48px 16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Caption */}
          <Section title="Caption">
            <textarea
              value={caption}
              rows={3}
              placeholder="Add a caption…"
              style={{
                width: '100%', boxSizing: 'border-box',
                fontFamily: SERIF, fontStyle: 'italic', fontSize: 14,
                color: '#2c2416',
                background: '#ede8df',
                border: `1px solid ${BORDER}`,
                borderRadius: 4,
                padding: '8px 10px',
                outline: 'none',
                resize: 'none',
                lineHeight: 1.4,
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(139,111,71,0.45)'}
              onBlur={e => { e.target.style.borderColor = BORDER; saveCaption(); }}
              onChange={e => { setCaption(e.target.value); setSaved(false); }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.target.blur(); } }}
            />
            {!saved && (
              <p style={{ fontFamily: MONO, fontSize: 9.5, color: '#b0a490', margin: 0 }}>Enter or click away to save</p>
            )}
          </Section>

          {/* File */}
          <Section title="File">
            <Row label="Filename"><FilenameValue filename={filename} /></Row>
            <Row label="Dimensions" value={dimensions} />
            <Row label="Size" value={sizeLabel} />
            <Row label="Captured" value={capturedAt} />
            <Row label="Uploaded" value={uploadedAt} />
          </Section>

          {/* Camera / EXIF */}
          {(camera || lens || focal || aperture || shutter || iso || flash || gps) && (
            <Section title="Camera">
              <Row label="Camera" value={camera} />
              <Row label="Lens" value={lens} />
              <Row label="Focal" value={focal} />
              <Row label="Aperture" value={aperture} />
              <Row label="Shutter" value={shutter} />
              <Row label="ISO" value={iso} />
              <Row label="Flash" value={flash} />
              <Row label="GPS" value={gps} />
            </Section>
          )}

          {/* Sets */}
          <Section title="Sets">
            <SetPicker
              current={sets}
              all={allSets}
              onToggle={(slug, type, add) => onToggleSet && onToggleSet(slug, type, add)}
            />
          </Section>

          {blockIds.length > 0 && (
            <Section title="Used in pages">
              <span style={{ fontFamily: MONO, fontSize: 10.5, color: '#2c2416' }}>
                {blockIds.length} block{blockIds.length !== 1 ? 's' : ''}
              </span>
            </Section>
          )}

        </div>
      </div>
    </div>
  );
}
