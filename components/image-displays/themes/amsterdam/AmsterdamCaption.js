// components/image-displays/themes/amsterdam/AmsterdamCaption.js
// A museum wall-label in the poster register: small Inter caps title, dimmer
// capture meta beneath. `white-space: pre-line` keeps multi-line labels intact.
export default function AmsterdamCaption({ caption, meta }) {
  if (!caption && !meta) return null
  return (
    <figcaption className="ams-caption">
      {caption && <span className="ams-caption__title">{caption}</span>}
      {meta && <span className="ams-caption__meta">{meta}</span>}
    </figcaption>
  )
}
