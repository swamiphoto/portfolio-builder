import { useState, useRef, useEffect } from "react";

const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace';
const SERIF = '"Cormorant Garamond", "Muse", Georgia, serif';

function formatCardDate(asset) {
  const raw = asset.capture?.capturedAt || asset.createdAt;
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d)) return null;
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatBytes(bytes) {
  if (!bytes) return null;
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${(bytes / 1024).toFixed(0)}KB`;
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
  const n = parseFloat(value);
  if (isNaN(n)) return String(value);
  if (n >= 1) {
    const r = Math.round(n * 10) / 10;
    return `${Number.isInteger(r) ? r : r.toFixed(1)}s`;
  }
  return `1/${Math.round(1 / n)}`;
}

function formatFocal(value) {
  if (!value) return null;
  const n = parseFloat(String(value).replace(/mm$/i, ''));
  return isNaN(n) ? String(value) : `${Math.round(n)}mm`;
}

function shortenCamera(model) {
  if (!model) return null;
  // Strip common manufacturer prefixes redundant with model
  return model
    .replace(/^Canon EOS\s+/i, '')
    .replace(/^NIKON CORPORATION\s+/i, '')
    .replace(/^SONY\s+/i, '')
    .replace(/^FUJIFILM\s+/i, '')
    .trim();
}

function shortenLens(lens) {
  if (!lens) return null;
  return lens
    .replace(/\s+\([^)]*\)/g, '')           // drop parenthetical
    .replace(/\s+\d+\.?\d*mm\s+f\/[\d.]+/i, '') // strip trailing "6.765mm f/1.78" (iPhone embeds these)
    .replace(/^Canon\s+(EF|RF)\s*/i, '')
    .replace(/^Sigma\s+/i, '')
    .replace(/^Sony\s+/i, '')
    .replace(/^Apple\s+/i, '')
    .trim() || null;
}

const TILE_SHADOW = '0 0 0 1px rgba(26,18,10,0.07), 0 1px 2px rgba(26,18,10,0.06), 0 6px 16px -4px rgba(26,18,10,0.10)';
const TILE_SHADOW_HOVER = '0 0 0 1px rgba(26,18,10,0.10), 0 2px 4px rgba(26,18,10,0.08), 0 12px 28px -6px rgba(26,18,10,0.16)';

const SEPIA_PLACEHOLDERS = [
  '#e2d9cd', '#d8cfc0', '#ddd4c4', '#cfc4b2',
  '#e8e0d2', '#d4c9b6', '#dbd0be', '#c8baa6',
];

function placeholderColor(assetId) {
  let h = 0;
  for (let i = 0; i < (assetId || '').length; i++) {
    h = Math.imul(31, h) + assetId.charCodeAt(i) | 0;
  }
  return SEPIA_PLACEHOLDERS[Math.abs(h) % SEPIA_PLACEHOLDERS.length];
}

export default function PhotoTile({ asset, albumType, onRemove, onDelete, onAddToAlbum, onCaptionChange, onImageClick }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [captionValue, setCaptionValue] = useState(asset.caption || "");
  const [hovered, setHovered] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setCaptionValue(asset.caption || "");
  }, [asset.caption]);

  const imageUrl = asset.publicUrl;
  const thumbnailUrl = imageUrl.replace('/photos/', '/thumbnails/').replace(/\.[^.]+$/, '.jpg');
  const filename = asset.originalFilename || imageUrl.split("/").pop();
  const inAlbum = albumType !== "all";
  const sizeLabel = formatBytes(asset.bytes);
  const cardDate = formatCardDate(asset);

  // EXIF
  const c = asset.capture || {};
  const camera = shortenCamera(c.cameraModel || (c.cameraMake && c.cameraModel ? `${c.cameraMake} ${c.cameraModel}` : null));
  const lens = shortenLens(c.lens || c.lensModel);
  const focal = formatFocal(c.focalLength || c.focalLengthMm);
  const aperture = formatAperture(c.aperture || c.fNumber);
  const shutter = formatShutter(c.shutterSpeed || c.exposureTime);
  const iso = c.iso ? `ISO${c.iso}` : null;

  const settings = [focal, aperture, shutter, iso].filter(Boolean);
  const hasExif = camera || lens || settings.length > 0;

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const handleCopy = () => { navigator.clipboard.writeText(imageUrl); setMenuOpen(false); };
  const handleRemove = () => { setMenuOpen(false); onRemove(imageUrl); };
  const handleDelete = () => {
    if (!confirm(`Permanently delete ${filename}? This cannot be undone.`)) return;
    setMenuOpen(false);
    onDelete(imageUrl);
  };
  const handleAddToAlbum = () => { setMenuOpen(false); onAddToAlbum(imageUrl); };

  return (
    <div
      className="relative rounded-lg overflow-hidden group w-full h-full flex flex-col"
      style={{
        background: '#f4efe8',
        boxShadow: hovered ? TILE_SHADOW_HOVER : TILE_SHADOW,
        transition: 'box-shadow 0.18s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="relative flex-1 overflow-hidden cursor-pointer"
        style={{ background: placeholderColor(asset.assetId) }}
        onClick={() => onImageClick && onImageClick()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailUrl}
          alt={asset.caption || filename}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
          style={{ opacity: loaded ? 1 : 0 }}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={e => { if (e.target.src !== imageUrl) e.target.src = imageUrl }}
        />
      </div>

      <button
        onClick={() => setMenuOpen((value) => !value)}
        className="absolute top-2 right-2 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'rgba(26,18,10,0.55)', backdropFilter: 'blur(4px)' }}
      >
        ⋯
      </button>

      <div style={{ background: '#f4efe8' }}>
        {/* Caption — editorial italic serif */}
        <input
          type="text"
          value={captionValue}
          placeholder="Add a caption…"
          className="w-full outline-none"
          style={{
            background: '#f4efe8',
            color: '#2c2416',
            fontFamily: SERIF,
            fontStyle: 'italic',
            fontSize: 15,
            lineHeight: 1.25,
            padding: '8px 10px 6px',
            borderBottom: '1px solid rgba(160,140,110,0.18)',
          }}
          onFocus={e => e.target.style.borderBottomColor = 'rgba(139,111,71,0.5)'}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setCaptionValue(e.target.value)}
          onBlur={(e) => {
            e.target.style.borderBottomColor = 'rgba(160,140,110,0.18)';
            if (captionValue !== (asset.caption || "") && onCaptionChange) {
              onCaptionChange(asset.assetId, captionValue);
            }
          }}
          onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
        />

        {/* EXIF / Metadata strip — monospace */}
        <div style={{ padding: '6px 10px 8px', fontFamily: MONO }}>
          {hasExif ? (
            <>
              {(camera || lens) && (
                <div
                  className="truncate"
                  style={{
                    fontSize: 9.5,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#7a6b55',
                    marginBottom: settings.length > 0 ? 2 : 0,
                  }}
                  title={[camera, lens].filter(Boolean).join(' · ')}
                >
                  {[camera, lens].filter(Boolean).join(' · ')}
                </div>
              )}
              {settings.length > 0 && (
                <div
                  className="truncate"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.02em',
                    color: '#a8967a',
                    marginBottom: 2,
                  }}
                >
                  {settings.join('  ')}
                </div>
              )}
            </>
          ) : (
            <div
              className="truncate"
              style={{ fontSize: 9.5, letterSpacing: '0.04em', color: '#a8967a', marginBottom: 2 }}
              title={filename}
            >
              {filename}
            </div>
          )}

          {/* Footer row: date / size */}
          <div className="flex items-center gap-2" style={{ fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#b0a490' }}>
            {cardDate && <span>{cardDate}</span>}
            <span className="flex-1" />
            {sizeLabel && <span>{sizeLabel}</span>}
          </div>
        </div>
      </div>

      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute top-8 right-2 rounded-lg py-1 min-w-[180px] z-20"
          style={{
            background: '#f9f6f1',
            boxShadow: '0 0 0 1px rgba(26,18,10,0.08), 0 4px 12px rgba(26,18,10,0.12), 0 16px 32px -8px rgba(26,18,10,0.18)',
          }}
        >
          <button
            onClick={handleCopy}
            className="w-full text-left px-3 py-2 text-sm transition-colors"
            style={{ color: '#5c4f3a' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(44,36,22,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Copy URL
          </button>
          <button
            onClick={handleAddToAlbum}
            className="w-full text-left px-3 py-2 text-sm transition-colors"
            style={{ color: '#5c4f3a' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(44,36,22,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Add to another album
          </button>
          {inAlbum && (
            <>
              <div style={{ borderTop: '1px solid rgba(160,140,110,0.18)', margin: '4px 0' }} />
              <button
                onClick={handleRemove}
                className="w-full text-left px-3 py-2 text-sm transition-colors"
                style={{ color: '#c14a4a' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(193,74,74,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Remove from album
              </button>
            </>
          )}
          <div style={{ borderTop: '1px solid rgba(160,140,110,0.18)', margin: '4px 0' }} />
          <button
            onClick={handleDelete}
            className="w-full text-left px-3 py-2 text-sm font-medium transition-colors"
            style={{ color: '#a82828' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,40,40,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Delete permanently
          </button>
        </div>
      )}
    </div>
  );
}
