// components/image-displays/themes/amsterdam/AmsterdamCaption.js
// A museum wall-label in the poster register: an optional letter-spaced position
// tag (LEFT / RIGHT — which photo it names in the dividerless flow), then the
// title in italic, then dimmer capture meta. `beside` swaps to the plaque layout
// (a label set to the RIGHT of the hung photo instead of tucked beneath it).
export default function AmsterdamCaption({ caption, meta, tag = null, beside = false, titleStyle = null }) {
  if (!caption && !meta) return null
  return (
    <figcaption className={`ams-caption${beside ? ' ams-caption--beside' : ''}`}>
      {tag && <span className="ams-caption__tag">{tag}</span>}
      {caption && <span className="ams-caption__title" style={titleStyle || undefined}>{caption}</span>}
      {meta && <span className="ams-caption__meta">{meta}</span>}
    </figcaption>
  )
}
