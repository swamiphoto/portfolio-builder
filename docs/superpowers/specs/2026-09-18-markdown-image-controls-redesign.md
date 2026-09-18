# In-article image controls: redesign

**Date:** 2026-09-18
**Status:** Draft for review
**Builds on:** the in-article images feature (`2026-09-16-markdown-in-article-images`, shipped)

## Problem

The current in-article image controls (`MarkdownImageControls` + `MarkdownEditorPanel`) have three problems the photographer flagged:

1. **Controls float in the wrong place.** The overlay is pinned to the top-right of the full-width image *wrapper*, so for a small/centered image the ✕/brush/caption sit far out to the right, detached from the image. It doesn't match how controls appear elsewhere.
2. **The editor doesn't reflect Layout or Size.** Changing Centered → Edge-to-edge → Side, or L/M/S, changes nothing visible in the editor — the image always renders as the same small fixed thumbnail. The photographer can't see the arrangement they're choosing.
3. **Caption is a typed box.** It should behave like a photo block: the caption is the photo's **library caption**, shown wherever the photo appears — not typed per-article. Here we only style it.

## Goals

- Controls live **on the image** (top-right corner, on hover): a **"⋯" menu** (Move up / Move down / Remove) and a **brush** (Layout / Size / Caption style). Clean formatting.
- The editor **live-renders Layout + Size** so the photographer sees the arrangement: centered / edge-to-edge / side-with-text-wrap, sized L/M/S. Changing the brush updates it immediately.
- **Caption is library-driven** (resolved by photo URL, like a photo block) in both the editor and the public site. No typing; the brush only sets the caption *style*.

## Non-goals

- Changing how photo blocks resolve captions (reuse the same model).
- Per-image caption text stored in markdown (removed).
- Right-side float for "side" (left-only, consistent with the public renderer).

## Data model change

The image directive **drops the caption text**; caption comes from the library:

```
before:  ![Some caption](https://…/p.jpg){layout=side size=m style=serif}
after:   ![](https://…/p.jpg){layout=side size=m style=serif}
```

- Parser (`common/markdown.js`) still tolerates a caption in the alt for backward compatibility, but it is **not used for display** — on the next save the alt serializes empty.
- The caption shown (editor + public) is `assetsByUrl[url]?.caption` — the same value photo blocks use via `common/captionResolver.js`.
- `style` (caption style) stays in the directive and is per-image.

## Components & changes

1. **`common/markdown.js`** — image node keeps `layout/size/style`; caption is no longer meaningful for display (leave alt parsing intact for compat, but downstream ignores it). No behavior change needed beyond documentation, unless serialization drops the alt (see markdownDom).

2. **`common/markdownDom.js`**
   - `createImageBlockNode(doc, url, attrs)` — **drop the caption param**. Apply **layout + size styling to the wrapper/img** so the editor shows the real arrangement:
     - `centered` → block, centered, width by size (L 100% / M 66% / S 40% of the editor column).
     - `full-bleed` → full width.
     - `side` → `float: left`, width by size, so following blocks wrap beside it; `clear` handling so images don't stack-collide.
     - Store `data-layout/data-size/data-style` as today.
   - `setImageAttr(wrapper, key, value)` — for `layout`/`size`, **re-apply the visual styling** (not just the data attr). Remove the `caption` branch (no typed caption).
   - Render the **library caption** beneath the image inside the wrapper: a `<figcaption>`-like element (contenteditable=false) whose text is the resolved library caption and whose style is `captionStyleCss(style)`. The caption value is supplied by the panel (the DOM layer gets it as an argument / via a lookup passed in), since markdownDom is pure DOM and has no library access.
   - `serializeDomToMarkdown` — serialize the image to `![](url){…}` (empty alt); keep round-tripping `layout/size/style`.
   - `removeImageWrapper` / `moveImageWrapper` — unchanged.

3. **`common/markdownImageOptions.js`** — reuse `LAYOUT_OPTIONS`, `SIZE_OPTIONS`, and add an `imageEditorStyle({layout,size})` helper returning the inline styles the editor wrapper/img should use (mirrors `imageFigureClasses` but as inline CSS for the contentEditable surface). The public `imageFigureClasses` stays for `MarkdownText`.

4. **`components/admin/gallery-builder/MarkdownImageControls.js`** — rework:
   - A hover control group in the **image's top-right corner**: a **"⋯"** button opening a small dropdown (Move up / Move down / Remove), and a **brush** button opening the existing Layout/Size/Caption-style popover. Fix the brush glyph/formatting.
   - **Remove the caption text input.** The Caption section in the brush popover keeps the style pills (Sans/Serif/Mono/Accent) only.

5. **`components/admin/gallery-builder/MarkdownEditorPanel.js`**
   - Build a `captionByUrl` map from `libraryConfig`/`libraryImages` (url → asset caption) and use it when creating/refreshing image nodes so the editor shows the library caption.
   - **Overlay positioning:** because the editor now renders the image at its real layout/size, the wrapper *is* the image box — position the control group at the wrapper's top-right (on the image), fixing the float-far-right problem. Re-position on layout/size change.
   - On layout/size change, re-apply the wrapper styling (via `setImageAttr`) and reposition the overlay.

6. **`components/image-displays/MarkdownText.js`** (public renderer)
   - Accept an **`assetsByUrl`** prop. For each image, resolve the caption via `assetsByUrl[url]?.caption` (fall back to none) and render it as the `<figcaption>` with `captionStyleCss(style)`. Layout/size via `imageFigureClasses` as today.
   - Update the call sites that render markdown blocks (Gallery.js and the theme columns) to pass `assetsByUrl` (already available there for photo blocks). Where it isn't available, the caption simply doesn't render (graceful).

## Testing

- **`markdown.js`** — attrs still parse; a `![](url){…}` with empty alt round-trips.
- **`markdownDom.js`** — `createImageBlockNode` applies the right inline styles per layout/size (centered/full-bleed/side widths; side floats); `setImageAttr('layout'|'size')` re-applies styling; serialize emits `![](url){…}` (empty alt); the library caption renders beneath with the style.
- **`markdownImageOptions.js`** — `imageEditorStyle` returns expected widths/float per layout+size.
- **`MarkdownImageControls.js`** — "⋯" menu fires move/remove; brush fires layout/size/style; **no caption input** in the DOM.
- **`MarkdownText.js`** — caption resolved from `assetsByUrl` (not the alt); layout/size/style applied; no caption when the asset has none.

## Migration / compat

- Existing in-article images with a typed caption: the alt is ignored for display (library caption used) and dropped on next save. The feature is new, so there is ~nothing real to migrate. No image loss (bare `![](url)` and attr suffixes still parse).
