// A caption that lives inside the image, revealed on hover at the bottom over a
// subtle scrim. Used by Manhattan image blocks. Parent must be `relative group`.
import { captionStyleCss } from '../../../common/captionStyles'

export default function HoverCaption({ caption, captionStyle = 'sans' }) {
  if (!caption) return null
  return (
    <div
      data-hover-caption
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))' }}
    >
      <p
        className="px-3 pb-2.5 pt-8 text-[13px] font-sans text-white/95"
        style={captionStyleCss(captionStyle)}
      >
        {caption}
      </p>
    </div>
  )
}
