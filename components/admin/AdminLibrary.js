import { useState, useEffect, useCallback, useMemo } from "react";
import AlbumSidebar from "./AlbumSidebar";
import PhotoGrid from "./PhotoGrid";
import UploadModal, { uploadFile } from "./UploadModal";
import AddFromLibraryModal from "./AddFromLibraryModal";
import ImportFlow from "./import/ImportFlow";
import DuplicateFinder from "./library/DuplicateFinder";
import { getPagePhotos } from "../../common/assetRefs";
import { sourceCounts as computeSourceCounts, matchesSource, sourceLabel } from '@/common/import/sourceFilter';
import { applyImportToConfig } from '@/common/import/importClient';
import { composeSite, applyComposedPages } from '@/common/import/composer';
import { seedUploadedAsset } from '@/common/import/uploadedAsset';
import { resolveSellableAsset } from "../../common/print/sellAsset";
import { SEED_CATALOG } from "../../common/fulfillment/seedCatalog";

export default function AdminLibrary({ onBack, siteConfig }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [libraryData, setLibraryData] = useState(null);
  // { allImages, portfolios, galleries, counts }

  const [selectedAlbum, setSelectedAlbum] = useState({ type: "all", key: "all" });
  const [selectedPage, setSelectedPage] = useState(null);

  const pagesData = useMemo(() => (siteConfig?.pages || [])
    .filter(p => p.type !== 'link')
    .map(p => ({
      id: p.id,
      title: p.title || 'Untitled',
      parentId: p.parentId ?? null,
      sortOrder: p.sortOrder ?? 0,
      imageUrls: getPagePhotos(p),
    }))
  , [siteConfig]);
  const [filters, setFilters] = useState({
    orientation: "all",
    usage: "all",
    forPrint: "all",
    captureYear: "all",
    uploaded: "all",
    aperture: "all",
    shutter: "all",
    camera: "all",
    lens: "all",
    focalLength: "all",
    iso: "all",
    source: "all",
  });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [dedupeOpen, setDedupeOpen] = useState(false);
  const [clearLibOpen, setClearLibOpen] = useState(false);
  const [clearLibText, setClearLibText] = useState("");
  const [clearLibBusy, setClearLibBusy] = useState(false);
  const [highlightedUrls, setHighlightedUrls] = useState(null);
  const [addLibraryOpen, setAddLibraryOpen] = useState(false);
  const [addLibraryTarget, setAddLibraryTarget] = useState(null);
  // addLibraryTarget: null (add to current album) | { imageUrl } (add single image to album)
  const [printStore, setPrintStore] = useState(null);

  const fetchLibrary = useCallback(async ({ quiet = false } = {}) => {
    try {
      if (!quiet) setLoading(true);
      const res = await fetch("/api/admin/library");
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setLibraryData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  const runClearLibrary = useCallback(async () => {
    if (clearLibText !== "Delete" || clearLibBusy) return;
    setClearLibBusy(true);
    try {
      const r = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "library" }),
      });
      if (!r.ok) throw new Error();
      setClearLibOpen(false);
      setClearLibText("");
      await fetchLibrary();
    } catch {
      alert("Something went wrong clearing the library. Please try again.");
    } finally {
      setClearLibBusy(false);
    }
  }, [clearLibText, clearLibBusy, fetchLibrary]);

  useEffect(() => { fetchLibrary(); }, [fetchLibrary]);

  useEffect(() => {
    fetch('/api/admin/print/settings')
      .then(res => { if (res.ok) return res.json(); })
      .then(data => { if (data?.printStore) setPrintStore(data.printStore); })
      .catch(() => {});
  }, []);

  const saveConfig = useCallback(async (newConfig) => {
    const res = await fetch("/api/admin/library", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newConfig),
    });
    if (!res.ok) throw new Error(`Save failed ${res.status}`);
    // Refresh counts without blanking the whole library (keeps sidebar context).
    await fetchLibrary({ quiet: true });
  }, [fetchLibrary]);

  const getFallbackAsset = useCallback((imageUrl) => {
    if (!imageUrl) return null;

    const meta = libraryData?.metadata?.[imageUrl] || {};

    return {
      assetId: meta.assetId || imageUrl,
      publicUrl: imageUrl,
      originalFilename: meta.name || imageUrl.split("/").pop() || imageUrl,
      bytes: meta.size || 0,
      width: meta.width || null,
      height: meta.height || null,
      orientation: meta.orientation || "unknown",
      caption: "",
      tags: [],
      source: meta.source || { provider: "manual", type: "upload" },
      usage: { usageCount: meta.usageCount || 0 },
      createdAt: meta.timeCreated || null,
      updatedAt: meta.updated || null,
    };
  }, [libraryData]);

  const getAssetByUrl = useCallback((imageUrl) => {
    if (!imageUrl) return null;

    const assetId = libraryData?.assetIdByUrl?.[imageUrl];
    if (assetId && libraryData?.assets?.[assetId]) {
      return libraryData.assets[assetId];
    }

    return getFallbackAsset(imageUrl);
  }, [libraryData, getFallbackAsset]);

  const applyFilters = useCallback((assets) => {
    return assets.filter((asset) => {
      if (filters.orientation !== "all" && asset.orientation !== filters.orientation) return false;

      if (filters.captureYear !== "all") {
        const capturedAt = asset.capture?.capturedAt;
        if (!capturedAt) return false;
        const year = new Date(capturedAt).getFullYear();
        if (String(year) !== filters.captureYear) return false;
      }

      if (filters.uploaded !== "all") {
        const uploadedAt = asset.createdAt ? new Date(asset.createdAt) : null;
        if (!uploadedAt) return false;
        const now = Date.now();
        const age = now - uploadedAt.getTime();
        if (filters.uploaded === "week" && age > 7 * 864e5) return false;
        if (filters.uploaded === "month" && age > 30 * 864e5) return false;
        if (filters.uploaded === "year" && uploadedAt.getFullYear() !== new Date().getFullYear()) return false;
        if (filters.uploaded === "older" && uploadedAt.getFullYear() >= new Date().getFullYear()) return false;
      }

      const usageCount = asset.usage?.usageCount || 0;
      if (filters.usage === "unused" && usageCount > 0) return false;
      if (filters.usage === "used" && usageCount === 0) return false;

      const forSale = !!asset.print?.sellable;
      if (filters.forPrint === "on" && !forSale) return false;
      if (filters.forPrint === "off" && forSale) return false;

      if (filters.aperture !== "all") {
        const raw = asset.capture?.aperture || asset.capture?.fNumber;
        const f = raw ? parseFloat(String(raw).replace(/^[fFƒ]\/?/, '')) : NaN;
        if (isNaN(f)) return false;
        if (filters.aperture === "wide" && f >= 2) return false;
        if (filters.aperture === "mid" && (f < 2 || f >= 4)) return false;
        if (filters.aperture === "narrow" && (f < 4 || f >= 8)) return false;
        if (filters.aperture === "closed" && f < 8) return false;
      }

      if (filters.shutter !== "all") {
        const raw = asset.capture?.shutterSpeed || asset.capture?.exposureTime;
        const sec = (() => {
          if (!raw) return NaN;
          const str = String(raw);
          const slash = str.indexOf('/');
          if (slash > 0) {
            const n = parseFloat(str.slice(0, slash));
            const d = parseFloat(str.slice(slash + 1));
            return (!isNaN(n) && !isNaN(d) && d !== 0) ? n / d : NaN;
          }
          return parseFloat(str);
        })();
        if (isNaN(sec)) return false;
        if (filters.shutter === "fast" && sec >= 1/500) return false;
        if (filters.shutter === "action" && (sec < 1/500 || sec >= 1/125)) return false;
        if (filters.shutter === "hand" && (sec < 1/125 || sec >= 1/30)) return false;
        if (filters.shutter === "slow" && sec < 1/30) return false;
      }

      if (filters.camera !== "all" && asset.capture?.cameraModel !== filters.camera) return false;
      if (filters.lens !== "all" && asset.capture?.lens !== filters.lens) return false;

      if (filters.focalLength !== "all") {
        const fl = asset.capture?.focalLengthMm;
        if (!fl) return false;
        if (filters.focalLength === "wide" && fl > 35) return false;
        if (filters.focalLength === "normal" && (fl <= 35 || fl > 85)) return false;
        if (filters.focalLength === "tele" && (fl <= 85 || fl > 200)) return false;
        if (filters.focalLength === "super" && fl <= 200) return false;
      }

      if (filters.iso !== "all") {
        const iso = asset.capture?.iso;
        if (!iso) return false;
        if (filters.iso === "low" && iso > 400) return false;
        if (filters.iso === "mid" && (iso <= 400 || iso > 1600)) return false;
        if (filters.iso === "high" && iso <= 1600) return false;
      }

      if (!matchesSource(asset, filters.source)) return false;

      return true;
    });
  }, [filters]);

  // Get assets for the currently selected album
  const currentAssets = () => {
    if (!libraryData) return [];

    let base;
    if (selectedAlbum.type === "all") {
      base = libraryData.images || [];
    } else if (selectedAlbum.type === "portfolio") {
      const urls = libraryData.portfolios[selectedAlbum.key] || []
      base = urls.map(getAssetByUrl).filter(Boolean);
    } else {
      // Gallery rollup: own + all descendants, deduped
      const galleries = libraryData.galleries || {}
      const prefix = selectedAlbum.key + '/'
      const matchingKeys = Object.keys(galleries).filter(
        (k) => k === selectedAlbum.key || k.startsWith(prefix)
      )
      const urls = [...new Set(matchingKeys.flatMap((k) => galleries[k] || []))]
      base = urls.map(getAssetByUrl).filter(Boolean);
    }

    if (selectedPage) {
      const pageObj = pagesData.find(p => p.id === selectedPage);
      if (pageObj) {
        const pageUrls = new Set(pageObj.imageUrls);
        base = base.filter(a => pageUrls.has(a.publicUrl));
      }
    }

    return applyFilters(base);
  };

  const allSets = useMemo(() => {
    const galleries = Object.keys(libraryData?.galleries || {}).map(slug => ({ slug, type: 'gallery' }));
    const portfolios = Object.keys(libraryData?.portfolios || {}).map(slug => ({ slug, type: 'portfolio' }));
    return [...galleries, ...portfolios].sort((a, b) => a.slug.localeCompare(b.slug));
  }, [libraryData]);

  const setsByUrl = useMemo(() => {
    if (!libraryData) return {};
    const map = {};
    Object.entries(libraryData.galleries || {}).forEach(([slug, urls]) => {
      (urls || []).forEach(url => {
        if (!map[url]) map[url] = [];
        map[url].push({ slug, type: 'gallery' });
      });
    });
    Object.entries(libraryData.portfolios || {}).forEach(([slug, urls]) => {
      (urls || []).forEach(url => {
        if (!map[url]) map[url] = [];
        map[url].push({ slug, type: 'portfolio' });
      });
    });
    return map;
  }, [libraryData]);

  const currentConfig = useCallback(() => ({
    portfolios: libraryData?.portfolios || {},
    galleries: libraryData?.galleries || {},
    assets: libraryData?.assets || {},
  }), [libraryData]);

  const handleToggleSet = useCallback(async (imageUrl, slug, type, add) => {
    const section = type === 'portfolio' ? 'portfolios' : 'galleries';
    setLibraryData(prev => {
      if (!prev) return prev;
      const current = prev[section]?.[slug] || [];
      const updated = add ? [...new Set([...current, imageUrl])] : current.filter(u => u !== imageUrl);
      return { ...prev, [section]: { ...prev[section], [slug]: updated } };
    });
    const config = currentConfig();
    const current = config[section][slug] || [];
    const updated = add ? [...new Set([...current, imageUrl])] : current.filter(u => u !== imageUrl);
    await fetch("/api/admin/library", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...config, [section]: { ...config[section], [slug]: updated } }),
    });
  }, [currentConfig]);

  const handleRemove = useCallback(async (imageUrl) => {
    if (selectedAlbum.type === "all") return;
    const config = currentConfig();
    const section = selectedAlbum.type === "portfolio" ? "portfolios" : "galleries";
    const updated = {
      ...config,
      [section]: {
        ...config[section],
        [selectedAlbum.key]: (config[section][selectedAlbum.key] || []).filter((u) => u !== imageUrl),
      },
    };
    await saveConfig(updated);
  }, [selectedAlbum, saveConfig, currentConfig]);

  const [deletingUrls, setDeletingUrls] = useState(() => new Set());
  const markDeleting = useCallback((urls, on) => {
    setDeletingUrls(prev => {
      const next = new Set(prev);
      for (const u of urls) { if (on) next.add(u); else next.delete(u); }
      return next;
    });
  }, []);

  const handleDelete = useCallback(async (imageUrl) => {
    markDeleting([imageUrl], true);
    try {
      const res = await fetch("/api/admin/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      if (!res.ok) { alert("Delete failed"); return; }
      await fetchLibrary({ quiet: true });
    } finally {
      markDeleting([imageUrl], false);
    }
  }, [fetchLibrary, markDeleting]);

  // ── Multi-select ──────────────────────────────────────────────────────────
  const [selectedUrls, setSelectedUrls] = useState(() => new Set());
  const selectionActive = selectedUrls.size > 0;
  const toggleSelect = useCallback((url) => {
    setSelectedUrls(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url); else next.add(url);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedUrls(new Set()), []);
  // Drop the selection whenever the viewed album/filter changes.
  useEffect(() => { setSelectedUrls(new Set()); }, [selectedAlbum]);

  const handleRemoveSelected = useCallback(async () => {
    if (selectedAlbum.type === "all" || selectedUrls.size === 0) return;
    const config = currentConfig();
    const section = selectedAlbum.type === "portfolio" ? "portfolios" : "galleries";
    const updated = {
      ...config,
      [section]: {
        ...config[section],
        [selectedAlbum.key]: (config[section][selectedAlbum.key] || []).filter(u => !selectedUrls.has(u)),
      },
    };
    await saveConfig(updated);
    clearSelection();
  }, [selectedAlbum, selectedUrls, saveConfig, currentConfig, clearSelection]);

  const handleDeleteSelected = useCallback(async () => {
    const urls = [...selectedUrls];
    if (!urls.length) return;
    if (!confirm(`Permanently delete ${urls.length} photo${urls.length > 1 ? "s" : ""}? This cannot be undone.`)) return;
    markDeleting(urls, true);
    try {
      for (const imageUrl of urls) {
        try {
          await fetch("/api/admin/delete", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl }) });
        } catch (e) { console.error("delete failed", imageUrl, e); }
      }
      await fetchLibrary({ quiet: true });
      clearSelection();
    } finally {
      markDeleting(urls, false);
    }
  }, [selectedUrls, fetchLibrary, clearSelection, markDeleting]);

  const [dropUploading, setDropUploading] = useState(false);

  // Drag a photo (or the current selection) onto a set: add to target, and if
  // dragging from another set, remove from the source (a move).
  const handleMovePhotosToSet = useCallback(async (targetKey, urls) => {
    if (!targetKey || !urls || urls.length === 0) return;
    const config = currentConfig();
    const galleries = { ...config.galleries };
    galleries[targetKey] = [...new Set([...(galleries[targetKey] || []), ...urls])];
    if (selectedAlbum.type === 'gallery' && selectedAlbum.key !== targetKey) {
      galleries[selectedAlbum.key] = (galleries[selectedAlbum.key] || []).filter(u => !urls.includes(u));
    }
    await saveConfig({ ...config, galleries });
    clearSelection();
  }, [selectedAlbum, currentConfig, saveConfig, clearSelection]);

  const handleUploaded = useCallback(async (uploadedAssets, selectedSets = []) => {
    // uploadedAssets: [{ url, width, height, hash, capture }], selectedSets: string[]
    setUploadOpen(false);
    const uploadedUrls = uploadedAssets.map(a => a.url);

    const config = currentConfig();

    // Seed asset metadata for newly uploaded files
    const { createAssetIdFromUrl } = await import('../../common/adminConfig');
    const now = new Date().toISOString();
    const assetUpdates = {};
    for (const { url, width, height, hash, capture } of uploadedAssets) {
      const assetId = createAssetIdFromUrl(url);
      assetUpdates[assetId] = seedUploadedAsset({ url, width, height, hash, capture, now }, { ...(libraryData?.assets?.[assetId] || {}), assetId });
    }

    const updated = { ...config, assets: { ...config.assets, ...assetUpdates } };

    // Add uploaded URLs to every selected set
    if (selectedSets.length > 0) {
      updated.galleries = { ...config.galleries };
      for (const col of selectedSets) {
        updated.galleries[col] = [...new Set([...(updated.galleries[col] || []), ...uploadedUrls])];
      }
      setSelectedAlbum({ type: 'gallery', key: selectedSets[0] });
    } else {
      setSelectedAlbum({ type: 'all', key: 'all' });
    }

    // Highlight newly uploaded photos for 2.5s
    setHighlightedUrls(new Set(uploadedUrls));
    setTimeout(() => setHighlightedUrls(null), 2500);

    await saveConfig(updated);
  }, [saveConfig, fetchLibrary, currentConfig, libraryData]);

  // ── Drag-drop upload from the computer ────────────────────────────────────
  const handleDropUpload = useCallback(async (fileList, targetSet) => {
    const files = [...(fileList || [])].filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|gif|webp)$/i.test(f.name));
    if (!files.length) return;
    const set = targetSet || (selectedAlbum.type === 'gallery' ? selectedAlbum.key : null);
    const folder = set ? `photos/${set}` : undefined;
    setDropUploading(true);
    try {
      const uploadedAssets = [];
      for (const file of files) {
        try {
          const { gcsUrl, width, height, hash } = await uploadFile(file, { folder });
          uploadedAssets.push({ url: gcsUrl, width, height, hash });
        } catch (e) { console.error('drop upload failed', file.name, e); }
      }
      if (uploadedAssets.length) await handleUploaded(uploadedAssets, set ? [set] : []);
    } finally {
      setDropUploading(false);
    }
  }, [selectedAlbum, handleUploaded]);

  const handleImportComplete = useCallback(async (summary) => {
    setImportOpen(false)
    if (!summary?.imported?.length) return
    const next = applyImportToConfig(currentConfig(), { imported: summary.imported, collections: summary.collections, importBatchId: summary.importBatchId })
    const urls = summary.imported.map((a) => a.publicUrl)
    setHighlightedUrls(new Set(urls))
    setTimeout(() => setHighlightedUrls(null), 2500)
    setSelectedAlbum({ type: 'all', key: 'all' })
    await saveConfig(next)

    if (summary.siteMap?.pages?.length) {
      try {
        const scRes = await fetch('/api/admin/site-config')
        const currentSiteConfig = scRes.ok ? await scRes.json() : { pages: [] }
        const { pages } = composeSite({
          siteMap: summary.siteMap,
          collections: summary.collections,
          imported: summary.imported,
          importBatchId: summary.importBatchId,
          existingPages: currentSiteConfig.pages || [],
        })
        if (pages.length) {
          await fetch('/api/admin/site-config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(applyComposedPages(currentSiteConfig, pages)),
          })
        }
      } catch (err) {
        // Non-fatal — library import already saved; pages just won't be auto-created
        console.error('import page composition failed', err)
      }
    }
  }, [currentConfig, saveConfig])

  const handleCaptionChange = useCallback(async (assetId, caption) => {
    if (!assetId) return;
    // Optimistic local update — patch both assets map and images array
    setLibraryData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        assets: { ...prev.assets, [assetId]: { ...(prev.assets?.[assetId] || {}), caption } },
        images: (prev.images || []).map(img => img.assetId === assetId ? { ...img, caption } : img),
      };
    });
    const config = currentConfig();
    const updated = {
      ...config,
      assets: { ...config.assets, [assetId]: { ...(config.assets[assetId] || {}), caption } },
    };
    await fetch("/api/admin/library", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  }, [currentConfig]);

  const applyPrint = useCallback((assetId, print) => {
    setLibraryData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        assets: { ...prev.assets, [assetId]: { ...(prev.assets?.[assetId] || {}), print, forSale: print.sellable } },
        images: (prev.images || []).map(img => img.assetId === assetId ? { ...img, print, forSale: print.sellable } : img),
      };
    });
  }, []);

  const handleSellChange = useCallback(async (assetId, sellable) => {
    if (!assetId) return;
    const asset = libraryData?.assets?.[assetId] || {};
    const prevPrint = asset.print || {};
    // Optimistic: compute the real available sizes client-side (same pure
    // resolver the server uses) so the toggle is instant AND correct — no
    // "too small" flash while the round-trip is in flight.
    const { print: optimistic } = resolveSellableAsset(
      { ...asset, print: prevPrint }, SEED_CATALOG, printStore?.markup || 3, sellable
    );
    applyPrint(assetId, optimistic);
    try {
      const res = await fetch('/api/admin/print/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, sellable }),
      });
      if (!res.ok) {
        console.error('print sell failed', res.status, await res.text().catch(() => ''));
        applyPrint(assetId, prevPrint);
        return;
      }
      const { print } = await res.json();
      applyPrint(assetId, print);
    } catch (e) {
      console.error('print sell error', e);
      applyPrint(assetId, prevPrint);
    }
  }, [libraryData, applyPrint, printStore]);

  const handleUploadMaster = useCallback(async (assetId, file) => {
    if (!assetId || !file) return;
    try {
      const res = await fetch(
        `/api/admin/print/upload-master?assetId=${encodeURIComponent(assetId)}&filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`,
        { method: 'POST', body: file }
      );
      if (!res.ok) {
        console.error('print master upload failed', res.status, await res.text().catch(() => ''));
        return;
      }
      const { print } = await res.json();
      applyPrint(assetId, print);
    } catch (e) {
      console.error('print master upload error', e);
    }
  }, [applyPrint]);

  const handleCreateSet = useCallback(async (name, parentKey = null) => {
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    if (!slug) return
    const key = parentKey ? `${parentKey}/${slug}` : slug
    const config = currentConfig()
    if (config.galleries[key]) return
    const updated = { ...config, galleries: { ...config.galleries, [key]: [] } }
    await saveConfig(updated)
    setSelectedAlbum({ type: "gallery", key })
  }, [saveConfig, currentConfig]);

  const handleDeleteSet = useCallback(async (key) => {
    const config = currentConfig()
    const prefix = key + '/'
    const filtered = Object.fromEntries(
      Object.entries(config.galleries).filter(([k]) => k !== key && !k.startsWith(prefix))
    )
    const updated = { ...config, galleries: filtered }
    if (selectedAlbum.type === 'gallery' && (selectedAlbum.key === key || selectedAlbum.key.startsWith(prefix))) {
      setSelectedAlbum({ type: 'all', key: 'all' })
    }
    await saveConfig(updated)
  }, [saveConfig, currentConfig, selectedAlbum])

  // "Add to another album" from PhotoTile ⋯ menu
  const handleAddToAlbum = useCallback((imageUrl) => {
    setAddLibraryTarget({ imageUrl });
    setAddLibraryOpen(true);
  }, []);

  // "Add from Library" button in header — adds to current album
  const handleAddFromLibrary = useCallback(() => {
    setAddLibraryTarget(null);
    setAddLibraryOpen(true);
  }, []);

  const handleAddConfirm = useCallback(async (selectedUrls) => {
    setAddLibraryOpen(false);
    const config = currentConfig();

    if (addLibraryTarget) {
      // Single image → user must pick which album — for now add to current album
      if (selectedAlbum.type === "all") return;
      const section = selectedAlbum.type === "portfolio" ? "portfolios" : "galleries";
      const updated = {
        ...config,
        [section]: {
          ...config[section],
          [selectedAlbum.key]: [...new Set([...(config[section][selectedAlbum.key] || []), addLibraryTarget.imageUrl])],
        },
      };
      await saveConfig(updated);
    } else {
      if (selectedAlbum.type === "all") return;
      const section = selectedAlbum.type === "portfolio" ? "portfolios" : "galleries";
      const updated = {
        ...config,
        [section]: {
          ...config[section],
          [selectedAlbum.key]: [...new Set([...(config[section][selectedAlbum.key] || []), ...selectedUrls])],
        },
      };
      await saveConfig(updated);
    }
  }, [selectedAlbum, addLibraryTarget, saveConfig, currentConfig]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: '#a8967a' }}>
        <div
          className="animate-spin"
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: '2px solid rgba(160,140,110,0.25)',
            borderTopColor: '#8b6f47',
          }}
        />
        <span style={{ fontSize: 12, fontFamily: '"SF Mono", Menlo, monospace', letterSpacing: '0.06em', color: '#a8967a' }}>
          Loading library…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-red-500 text-sm font-medium">Error: {error}</div>
        <div className="text-xs max-w-sm text-center" style={{ color: '#a8967a' }}>
          Make sure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_URL are set in .env.local
        </div>
        <button onClick={fetchLibrary} className="text-sm px-4 py-2 rounded-lg" style={{ background: '#2c2416', color: '#f4efe8' }}>
          Retry
        </button>
      </div>
    );
  }

  const assets = currentAssets();
  const allAssets = (libraryData?.images || []).map((asset) => asset || null).filter(Boolean);

  const FILTER_LABELS = {
    orientation: v => v.charAt(0).toUpperCase() + v.slice(1),
    usage: v => v === 'used' ? 'In Use' : 'Unused',
    forPrint: v => v === 'on' ? 'For sale' : 'Not for sale',
    captureYear: v => v,
    uploaded: v => ({ week: 'This week', month: 'This month', year: 'This year', older: 'Older' }[v] || v),
    aperture: v => ({ wide: 'ƒ < 2', mid: 'ƒ 2–4', narrow: 'ƒ 4–8', closed: 'ƒ 8+' }[v] || v),
    shutter: v => ({ fast: '> 1/500s', action: '1/500–1/125s', hand: '1/125–1/30s', slow: '< 1/30s' }[v] || v),
    camera: v => v,
    lens: v => v,
    focalLength: v => ({ wide: '≤ 35mm', normal: '35–85mm', tele: '85–200mm', super: '> 200mm' }[v] || v),
    iso: v => ({ low: 'ISO ≤ 400', mid: 'ISO 400–1600', high: 'ISO > 1600' }[v] || v),
    source: v => sourceLabel(v),
  };
  const activeFilters = Object.entries(filters)
    .filter(([k, v]) => v !== 'all' && FILTER_LABELS[k])
    .map(([k, v]) => ({ key: k, label: FILTER_LABELS[k](v) }));
  const counts = libraryData?.counts || {};
  const orientationCounts = allAssets.reduce((acc, asset) => {
    const orientation = asset.orientation || "unknown";
    acc[orientation] = (acc[orientation] || 0) + 1;
    return acc;
  }, {});
  const usageCounts = allAssets.reduce((acc, asset) => {
    if ((asset.usage?.usageCount || 0) > 0) acc.used += 1;
    else acc.unused += 1;
    return acc;
  }, { used: 0, unused: 0 });
  const printCounts = allAssets.reduce((acc, asset) => {
    if (asset.print?.sellable) acc.on += 1;
    else acc.off += 1;
    return acc;
  }, { on: 0, off: 0 });

  const cameraCounts = allAssets.reduce((acc, asset) => {
    const cam = asset.capture?.cameraModel;
    if (cam) acc[cam] = (acc[cam] || 0) + 1;
    return acc;
  }, {});

  const lensCounts = allAssets.reduce((acc, asset) => {
    const lens = asset.capture?.lens;
    if (lens) acc[lens] = (acc[lens] || 0) + 1;
    return acc;
  }, {});

  const focalLengthCounts = allAssets.reduce((acc, asset) => {
    const fl = asset.capture?.focalLengthMm;
    if (!fl) return acc;
    if (fl <= 35) acc.wide = (acc.wide || 0) + 1;
    else if (fl <= 85) acc.normal = (acc.normal || 0) + 1;
    else if (fl <= 200) acc.tele = (acc.tele || 0) + 1;
    else acc.super = (acc.super || 0) + 1;
    return acc;
  }, {});

  const captureYearCounts = allAssets.reduce((acc, asset) => {
    const capturedAt = asset.capture?.capturedAt;
    if (!capturedAt) return acc;
    const year = String(new Date(capturedAt).getFullYear());
    acc[year] = (acc[year] || 0) + 1;
    return acc;
  }, {});

  const now = Date.now();
  const currentYear = new Date().getFullYear();
  const uploadedCounts = allAssets.reduce((acc, asset) => {
    const t = asset.createdAt ? new Date(asset.createdAt).getTime() : null;
    if (!t) return acc;
    const age = now - t;
    if (age <= 7 * 864e5) acc.week = (acc.week || 0) + 1;
    if (age <= 30 * 864e5) acc.month = (acc.month || 0) + 1;
    if (new Date(t).getFullYear() === currentYear) acc.year = (acc.year || 0) + 1;
    else acc.older = (acc.older || 0) + 1;
    return acc;
  }, {});

  const apertureCounts = allAssets.reduce((acc, asset) => {
    const raw = asset.capture?.aperture || asset.capture?.fNumber;
    if (!raw) return acc;
    const f = parseFloat(String(raw).replace(/^[fFƒ]\/?/, ''));
    if (isNaN(f)) return acc;
    if (f < 2) acc.wide = (acc.wide || 0) + 1;
    else if (f < 4) acc.mid = (acc.mid || 0) + 1;
    else if (f < 8) acc.narrow = (acc.narrow || 0) + 1;
    else acc.closed = (acc.closed || 0) + 1;
    return acc;
  }, {});

  const shutterCounts = allAssets.reduce((acc, asset) => {
    const raw = asset.capture?.shutterSpeed || asset.capture?.exposureTime;
    if (!raw) return acc;
    const str = String(raw);
    const slash = str.indexOf('/');
    const sec = slash > 0
      ? parseFloat(str.slice(0, slash)) / parseFloat(str.slice(slash + 1))
      : parseFloat(str);
    if (isNaN(sec)) return acc;
    if (sec < 1/500) acc.fast = (acc.fast || 0) + 1;
    else if (sec < 1/125) acc.action = (acc.action || 0) + 1;
    else if (sec < 1/30) acc.hand = (acc.hand || 0) + 1;
    else acc.slow = (acc.slow || 0) + 1;
    return acc;
  }, {});

  const isoCounts = allAssets.reduce((acc, asset) => {
    const iso = asset.capture?.iso;
    if (!iso) return acc;
    if (iso <= 400) acc.low = (acc.low || 0) + 1;
    else if (iso <= 1600) acc.mid = (acc.mid || 0) + 1;
    else acc.high = (acc.high || 0) + 1;
    return acc;
  }, {});

  const sourceCounts = computeSourceCounts(allAssets);
  // "Has imported before" — any photo whose source isn't a manual upload.
  const hasImported = Object.keys(sourceCounts).some(p => p !== 'manual');

  const normalLayout = (
    <>
      <AlbumSidebar
        onBack={onBack}
        counts={counts}
        selectedAlbum={selectedAlbum}
        onSelect={setSelectedAlbum}
        onCreateSet={handleCreateSet}
        onDropPhotos={handleMovePhotosToSet}
        onDropFiles={handleDropUpload}
        onDeleteSet={handleDeleteSet}
        orientationCounts={orientationCounts}
        usageCounts={usageCounts}
        printCounts={printCounts}
        captureYearCounts={captureYearCounts}
        uploadedCounts={uploadedCounts}
        apertureCounts={apertureCounts}
        shutterCounts={shutterCounts}
        cameraCounts={cameraCounts}
        lensCounts={lensCounts}
        focalLengthCounts={focalLengthCounts}
        isoCounts={isoCounts}
        sourceCounts={sourceCounts}
        filters={filters}
        onFilterChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        pages={pagesData}
        selectedPage={selectedPage}
        onSelectPage={setSelectedPage}
        onImportFromWeb={() => setImportOpen(true)}
        onFindDuplicates={() => setDedupeOpen(true)}
        onClearLibrary={() => { setClearLibText(""); setClearLibOpen(true); }}
      />
      <PhotoGrid
        assets={assets}
        selectedAlbum={selectedAlbum}
        setsByUrl={setsByUrl}
        allSets={allSets}
        onRemove={handleRemove}
        onDelete={handleDelete}
        onAddToAlbum={handleAddToAlbum}
        onCaptionChange={handleCaptionChange}
        onToggleSet={handleToggleSet}
        selectedUrls={selectedUrls}
        onToggleSelect={toggleSelect}
        selectionActive={selectionActive}
        onDropFiles={handleDropUpload}
        dropUploading={dropUploading}
        deletingUrls={deletingUrls}
        hasImported={hasImported}
        onUploadClick={() => setUploadOpen(true)}
        onImportFromWeb={() => setImportOpen(true)}
        printStore={printStore}
        onSellChange={handleSellChange}
        onUploadMaster={handleUploadMaster}
        onAddFromLibraryClick={handleAddFromLibrary}
        activeFilters={activeFilters}
        onRemoveFilter={k => setFilters(prev => ({ ...prev, [k]: 'all' }))}
        allAssets={allAssets}
        onAlbumSelect={setSelectedAlbum}
        onClose={onBack}
        highlightedUrls={highlightedUrls}
      />
    </>
  );

  return (
    <div className="flex h-full w-full overflow-hidden font-sans">
      {libraryData && (libraryData.images || []).length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center" style={{ padding: 40 }}>
          <h2 className="font-fraunces" style={{ fontSize: 24, color: 'var(--text-primary)', marginBottom: 8 }}>
            Bring in your existing photos
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 360, lineHeight: 1.55, marginBottom: 22 }}>
            Import from your current website, SmugMug, or Squarespace. Or upload photos from your computer.
          </p>
          <div className="flex items-center gap-3">
            <button onClick={() => setImportOpen(true)} style={{ background: '#2c2416', color: '#f5ecd6', fontSize: 13, fontWeight: 500, padding: '10px 18px', borderRadius: 4, border: 'none', cursor: 'pointer' }}>
              Import from your other sites
            </button>
            <button onClick={() => setUploadOpen(true)} style={{ background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, padding: '10px 18px', borderRadius: 4, border: '1px solid rgba(160,140,110,0.35)', cursor: 'pointer' }}>
              Upload photos
            </button>
          </div>
        </div>
      ) : (
        normalLayout
      )}

      {uploadOpen && (
        <UploadModal
          sets={Object.keys(libraryData?.galleries || {})}
          defaultSet={selectedAlbum.type === 'gallery' ? selectedAlbum.key : null}
          onClose={() => setUploadOpen(false)}
          onUploaded={handleUploaded}
        />
      )}

      {addLibraryOpen && (
        <AddFromLibraryModal
          allAssets={allAssets}
          currentAlbumAssets={addLibraryTarget ? [] : assets}
          onClose={() => setAddLibraryOpen(false)}
          onAdd={handleAddConfirm}
        />
      )}

      {importOpen && (
        <ImportFlow variant="modal" onClose={() => setImportOpen(false)} onComplete={handleImportComplete} />
      )}

      {dedupeOpen && libraryData && (
        <DuplicateFinder
          libraryData={libraryData}
          siteConfig={siteConfig}
          onClose={() => setDedupeOpen(false)}
          onComplete={async () => { setDedupeOpen(false); await fetchLibrary(); }}
        />
      )}

      {clearLibOpen && (
        <div
          onMouseDown={() => { if (!clearLibBusy) setClearLibOpen(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(26,18,10,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            onMouseDown={e => e.stopPropagation()}
            style={{ width: 360, maxWidth: '100%', background: '#faf7f1', borderRadius: 12, boxShadow: '0 20px 60px rgba(26,18,10,0.35)', padding: '20px 20px 16px' }}
          >
            <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 18, fontWeight: 500, color: '#2c2416', marginBottom: 8 }}>Clear library</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
              This permanently deletes every photo you have uploaded. Any page still using those photos will show blanks. This cannot be undone.
            </p>
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Type <b style={{ color: '#2c2416' }}>Delete</b> to confirm</label>
              <input
                autoFocus
                value={clearLibText}
                onChange={e => setClearLibText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') runClearLibrary(); }}
                style={{ width: '100%', marginTop: 5, padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid rgba(160,140,110,0.35)', background: '#fff', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <button
                type="button"
                onClick={() => { if (!clearLibBusy) setClearLibOpen(false); }}
                disabled={clearLibBusy}
                className="transition-colors"
                style={{ fontSize: 12.5, color: 'var(--text-secondary)', padding: '7px 12px', cursor: clearLibBusy ? 'default' : 'pointer' }}
                onMouseEnter={e => { if (!clearLibBusy) e.currentTarget.style.color = '#2c2416'; }}
                onMouseLeave={e => { if (!clearLibBusy) e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >Cancel</button>
              <button
                type="button"
                onClick={runClearLibrary}
                disabled={clearLibText !== 'Delete' || clearLibBusy}
                style={{ fontSize: 12.5, fontWeight: 500, padding: '7px 14px', borderRadius: 6, border: 'none', color: '#fff', background: clearLibText === 'Delete' && !clearLibBusy ? '#c14a4a' : 'rgba(193,74,74,0.4)', cursor: clearLibText === 'Delete' && !clearLibBusy ? 'pointer' : 'default', transition: 'background 120ms' }}
                onMouseEnter={e => { if (clearLibText === 'Delete' && !clearLibBusy) e.currentTarget.style.background = '#a83e3e'; }}
                onMouseLeave={e => { if (clearLibText === 'Delete' && !clearLibBusy) e.currentTarget.style.background = '#c14a4a'; }}
              >
                {clearLibBusy ? 'Working…' : 'Delete all photos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectionActive && (
        <div
          style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9998,
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#2c2416', color: '#f6f3ec', padding: '8px 10px 8px 16px', borderRadius: 10,
            boxShadow: '0 10px 30px rgba(26,18,10,0.32)',
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', fontSize: 12, letterSpacing: '0.03em',
          }}
        >
          <span style={{ marginRight: 8 }}>{selectedUrls.size} selected</span>
          {selectedAlbum.type === 'gallery' && (
            <button
              type="button"
              onClick={handleRemoveSelected}
              className="transition-colors"
              style={{ padding: '6px 10px', borderRadius: 6, color: '#f6f3ec' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Remove from set
            </button>
          )}
          <button
            type="button"
            onClick={handleDeleteSelected}
            className="transition-colors"
            style={{ padding: '6px 10px', borderRadius: 6, color: '#f0a3a3' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(240,90,90,0.16)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Delete
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="transition-colors"
            style={{ padding: '6px 10px', borderRadius: 6, color: 'rgba(246,243,236,0.7)' }}
            onMouseEnter={e => e.currentTarget.style.color = '#f6f3ec'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(246,243,236,0.7)'}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
