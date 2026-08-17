// A museum wall-label: the manual caption (title/medium/dims), then optional
// capture metadata (date / EXIF) beneath it in a dimmer tone. Both are Geist-/
// IBM-Plex-Mono via .florence-caption; `white-space: pre-line` keeps multi-line
// labels and multi-line meta intact.
export default function FlorenceCaption({ caption, meta, titleStyle = null }) {
  if (!caption && !meta) return null
  return (
    <figcaption className="florence-caption">
      {caption && <span className="florence-caption__title" style={titleStyle || undefined}>{caption}</span>}
      {meta && <span className="florence-caption__meta">{meta}</span>}
    </figcaption>
  )
}
