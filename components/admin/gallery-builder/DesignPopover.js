import PopoverShell from '../platform/PopoverShell'
import { DesignSection, PillToggle } from '../platform/designControls'
import { getBlockSpec, getTheme } from '../../../common/themes'
import { setVariant, resolveVariant, resolveAlign, resolveButtonStyle, resolvePhotoSize, resolveQuoteStyle, resolveAmsterdamStyle, resolveAmsterdamFrame, resolveAmsterdamGround } from '../../../common/themes/variants'
import { captionStyleCss, resolveCaptionStyle } from '../../../common/captionStyles'

const IconAlignLeft = () => (
  <svg width="14" height="10" viewBox="0 0 14 10" fill="none" style={{ display: 'block', margin: '0 auto' }}>
    <rect x="0" y="0" width="14" height="2" rx="1" fill="currentColor"/>
    <rect x="0" y="4" width="9" height="2" rx="1" fill="currentColor"/>
    <rect x="0" y="8" width="11" height="2" rx="1" fill="currentColor"/>
  </svg>
)
const IconAlignCenter = () => (
  <svg width="14" height="10" viewBox="0 0 14 10" fill="none" style={{ display: 'block', margin: '0 auto' }}>
    <rect x="0" y="0" width="14" height="2" rx="1" fill="currentColor"/>
    <rect x="2.5" y="4" width="9" height="2" rx="1" fill="currentColor"/>
    <rect x="1" y="8" width="12" height="2" rx="1" fill="currentColor"/>
  </svg>
)
const ALIGN_LABELS = { left: <IconAlignLeft />, center: <IconAlignCenter /> }

export default function DesignPopover({ block, themeId = 'kyoto', onUpdate, onClose, anchorEl }) {
  const spec = getBlockSpec(themeId, block.type)
  if (!spec) return null

  const variants = (spec.variants || []).map(v => ({ value: v.id, label: v.label }))
  // Font pills preview their own face (family from the active theme's tokens).
  const themeFonts = getTheme(themeId).tokens?.fonts || {}
  const fonts = spec.fonts
    ? spec.fonts.map(f => ({ value: f.id, label: <span style={{ fontFamily: themeFonts[f.id], fontSize: 13 }}>{f.label}</span> }))
    : null
  const aligns = spec.aligns && spec.aligns.length > 1 ? spec.aligns.map(a => ({ value: a, label: ALIGN_LABELS[a] || a })) : null
  const buttonStyles = spec.buttonStyles ? spec.buttonStyles.map(b => ({ value: b.id, label: b.label })) : null
  // Caption pills preview their own style so the choice is legible at a glance.
  // Manhattan drops the "accent" caption style (photo + video).
  const captionStyles = spec.captionStyles
    ? spec.captionStyles
        .filter(c => !(themeId === 'manhattan' && c.id === 'accent'))
        .map(c => ({ value: c.id, label: <span style={{ ...captionStyleCss(c.id), fontSize: 12.5 }}>{c.label}</span> }))
    : null
  const currentVariant = resolveVariant(block, themeId)
  // Only offer Size for layouts that actually respond to it (e.g. not full-bleed
  // photos). `sizeVariants` on the spec lists the variants where size applies.
  const sizeAllowed = !spec.sizeVariants || spec.sizeVariants.includes(currentVariant)
  // Manhattan renders page-links and testimonials at a fixed size — no Size control.
  const hideSize = themeId === 'manhattan' && (block.type === 'page-gallery' || block.type === 'testimonial')
  const sizes = spec.sizes && sizeAllowed && !hideSize ? spec.sizes.map(s => ({ value: s.id, label: s.label })) : null
  const isPhotoBlock = block.type === 'photos' || block.type === 'photo'
  const sizeValue = isPhotoBlock ? resolvePhotoSize(block, themeId) : (block.size || spec.defaultSize)

  const hasSize = variants.length > 1
  // Testimonials expose an italic/regular style toggle (both themes).
  const isTestimonial = block.type === 'testimonial'
  // Amsterdam always offers a background-color swatch, so keep the popover open.
  if (!hasSize && !fonts && !aligns && !buttonStyles && !captionStyles && !sizes && !isTestimonial && themeId !== 'amsterdam') return null

  const currentFont = block.font || spec.defaultFont

  // Panel order: Font → Style → Size → Layout → (image side / align / caption / button).
  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width="max-content" minWidth={272} maxWidth="calc(100vw - 24px)" title="Design">
      {/* Amsterdam: the block's ground color, shown as swatches (Auto follows the
          wall's rotation). Sits first — it sets the stage for everything else. */}
      {themeId === 'amsterdam' && (
        <DesignSection label="Background color">
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { value: 'auto', title: 'Auto — follows the wall', bg: 'conic-gradient(#141210 0 33.34%, #f6efe4 0 66.67%, #e02b20 0)' },
              { value: 'light', title: 'Light', bg: '#f6efe4' },
              { value: 'ink', title: 'Red', bg: '#e02b20' },
              { value: 'dark', title: 'Black', bg: '#141210' },
            ].map((s) => {
              const active = resolveAmsterdamGround(block) === s.value
              return (
                <button
                  key={s.value}
                  type="button"
                  aria-label={s.title}
                  title={s.title}
                  aria-pressed={active}
                  onClick={() => onUpdate({ ...block, amsterdamGround: s.value })}
                  style={{
                    width: 26, height: 26, borderRadius: 999, cursor: 'pointer', background: s.bg,
                    border: active ? '2px solid var(--text-primary)' : '2px solid rgba(0,0,0,0.12)',
                    outline: active ? '1px solid #fff' : 'none', outlineOffset: -3,
                  }}
                />
              )
            })}
          </div>
        </DesignSection>
      )}
      {fonts && (
        <DesignSection label="Font">
          <PillToggle value={currentFont} onChange={(v) => onUpdate({ ...block, font: v })} options={fonts} />
        </DesignSection>
      )}
      {isTestimonial && (
        <DesignSection label="Style">
          <PillToggle
            value={resolveQuoteStyle(block, themeId)}
            onChange={(v) => onUpdate({ ...block, quoteStyle: v })}
            options={[{ value: 'italic', label: 'Italic' }, { value: 'regular', label: 'Regular' }]}
          />
        </DesignSection>
      )}
      {sizes && (
        <DesignSection label="Size">
          <PillToggle value={sizeValue} onChange={(v) => onUpdate({ ...block, size: v })} options={sizes} />
        </DesignSection>
      )}
      {hasSize && (
        <DesignSection label={block.type === 'text' ? 'Size' : 'Layout'}>
          <PillToggle value={resolveVariant(block, themeId)} onChange={(v) => onUpdate(setVariant(block, themeId, v))} options={variants} />
        </DesignSection>
      )}
      {block.type === 'page-gallery' && themeId !== 'manhattan' && resolveVariant(block, themeId) === 'list' && (
        <DesignSection label="Image side">
          <PillToggle
            value={block.imageSide === 'alternating' ? 'alternating' : 'one'}
            onChange={(v) => onUpdate({ ...block, imageSide: v })}
            options={[{ value: 'one', label: 'One side' }, { value: 'alternating', label: 'Alternating' }]}
          />
        </DesignSection>
      )}
      {aligns && (
        <DesignSection label="Alignment">
          <PillToggle value={resolveAlign(block, themeId)} onChange={(v) => onUpdate({ ...block, align: v })} options={aligns} />
        </DesignSection>
      )}
      {/* Florence: vertical Position of the content within its full-height column.
          For a single photo it only matters when Centered (Full height fills). */}
      {themeId === 'florence'
        && (block.type === 'photos' || block.type === 'text' || (block.type === 'photo' && currentVariant === 'centered')) && (
        <DesignSection label="Position">
          <PillToggle
            value={block.florenceAnchor || 'top'}
            onChange={(v) => onUpdate({ ...block, florenceAnchor: v })}
            options={[{ value: 'top', label: 'Top' }, { value: 'center', label: 'Center' }, { value: 'bottom', label: 'Bottom' }]}
          />
        </DesignSection>
      )}
      {/* Amsterdam: a text block is a solid ink Panel (default) or Quiet museum text. */}
      {themeId === 'amsterdam' && block.type === 'text' && (
        <DesignSection label="Style">
          <PillToggle
            value={resolveAmsterdamStyle(block)}
            onChange={(v) => onUpdate({ ...block, amsterdamStyle: v })}
            options={[{ value: 'panel', label: 'Panel' }, { value: 'quiet', label: 'Quiet' }]}
          />
        </DesignSection>
      )}
      {/* Amsterdam: mount a photo (or a whole set) in a vintage frame — the caption
          prints on the card. Mixed rotates the three styles across a set. Frames
          only make sense for a Centered photo (a Fill photo is edge-to-edge). */}
      {themeId === 'amsterdam' && ((block.type === 'photo' && currentVariant === 'centered') || block.type === 'photos') && (
        <DesignSection label="Frame">
          <PillToggle
            value={resolveAmsterdamFrame(block)}
            onChange={(v) => onUpdate({ ...block, amsterdamFrame: v })}
            options={[
              { value: 'none', label: 'None' },
              { value: 'card', label: 'Card' },
              { value: 'mount', label: 'Mount' },
              { value: 'print', label: 'Print' },
              ...(block.type === 'photos' ? [{ value: 'mixed', label: 'Mixed' }] : []),
            ]}
          />
        </DesignSection>
      )}
      {captionStyles && (
        <DesignSection label="Caption">
          <PillToggle value={resolveCaptionStyle(block, spec.defaultCaptionStyle)} onChange={(v) => onUpdate({ ...block, captionStyle: v })} options={captionStyles} />
        </DesignSection>
      )}
      {buttonStyles && (
        <DesignSection label="Button style">
          <PillToggle value={resolveButtonStyle(block, themeId)} onChange={(v) => onUpdate({ ...block, buttonStyle: v })} options={buttonStyles} />
        </DesignSection>
      )}
    </PopoverShell>
  )
}
