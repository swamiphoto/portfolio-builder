import PopoverShell from '../platform/PopoverShell'
import { DesignSection, PillToggle } from '../platform/designControls'
import { getBlockSpec, getTheme } from '../../../common/themes'
import { setVariant, resolveVariant, resolveAlign, resolveButtonStyle } from '../../../common/themes/variants'
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
  const aligns = spec.aligns ? spec.aligns.map(a => ({ value: a, label: ALIGN_LABELS[a] || a })) : null
  const buttonStyles = spec.buttonStyles ? spec.buttonStyles.map(b => ({ value: b.id, label: b.label })) : null
  // Caption pills preview their own style so the choice is legible at a glance.
  const captionStyles = spec.captionStyles
    ? spec.captionStyles.map(c => ({ value: c.id, label: <span style={{ ...captionStyleCss(c.id), fontSize: 12.5 }}>{c.label}</span> }))
    : null
  const sizes = spec.sizes ? spec.sizes.map(s => ({ value: s.id, label: s.label })) : null

  const hasSize = variants.length > 1
  if (!hasSize && !fonts && !aligns && !buttonStyles && !captionStyles && !sizes) return null

  const currentFont = block.font || spec.defaultFont

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width="max-content" minWidth={272} maxWidth="calc(100vw - 24px)" title="Design">
      {fonts && (
        <DesignSection label="Font">
          <PillToggle value={currentFont} onChange={(v) => onUpdate({ ...block, font: v })} options={fonts} />
        </DesignSection>
      )}
      {hasSize && (
        <DesignSection label={block.type === 'text' ? 'Size' : 'Layout'}>
          <PillToggle value={resolveVariant(block, themeId)} onChange={(v) => onUpdate(setVariant(block, themeId, v))} options={variants} />
        </DesignSection>
      )}
      {block.type === 'page-gallery' && resolveVariant(block, themeId) === 'list' && (
        <DesignSection label="Image side">
          <PillToggle
            value={block.imageSide === 'alternating' ? 'alternating' : 'one'}
            onChange={(v) => onUpdate({ ...block, imageSide: v })}
            options={[{ value: 'one', label: 'One side' }, { value: 'alternating', label: 'Alternating' }]}
          />
        </DesignSection>
      )}
      {sizes && (
        <DesignSection label="Size">
          <PillToggle value={block.size || spec.defaultSize} onChange={(v) => onUpdate({ ...block, size: v })} options={sizes} />
        </DesignSection>
      )}
      {aligns && (
        <DesignSection label="Alignment">
          <PillToggle value={resolveAlign(block, themeId)} onChange={(v) => onUpdate({ ...block, align: v })} options={aligns} />
        </DesignSection>
      )}
      {captionStyles && (
        <DesignSection label="Caption">
          <PillToggle value={resolveCaptionStyle(block)} onChange={(v) => onUpdate({ ...block, captionStyle: v })} options={captionStyles} />
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
