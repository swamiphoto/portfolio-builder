import { DesignSection, PillToggle as DesignPillToggle, DesignSelect } from './designControls'
import { THEME_LIST } from '../../../common/themes'
import { resolveNavStyle } from '../../../common/navStyles'
import { resolveFooterSocial } from '../../../common/siteDesign'
import { AMSTERDAM_INKS, resolveAmsterdamInk } from '../../../common/themes/amsterdam'

const themeOptions = () => THEME_LIST.filter(t => !t.hidden).map(t => ({ value: t.id, label: t.name }))

// The Design control list shared by Site Settings and the sidebar theme bar.
// `onChange(patch)` shallow-merges into siteConfig. `includeTheme` renders the
// theme <select> (Site Settings uses it; the sidebar splits theme into its own
// dropdown and passes includeTheme={false}).
export default function DesignControlsBody({ config, onChange, onEditHandles, includeTheme = false }) {
  const update = onChange
  return (
    <>
      {includeTheme && (
        <DesignSection label="Theme">
          <DesignSelect
            value={config.design?.theme || 'kyoto'}
            onChange={(e) => update({ design: { ...(config.design || {}), theme: e.target.value } })}
          >
            {themeOptions().map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </DesignSelect>
        </DesignSection>
      )}

      {(config.logoType || 'sitename') === 'sitename' && (
        <DesignSection label="Logo font">
          <DesignPillToggle
            value={config.logoFont || 'theme'}
            onChange={(v) => update({ logoFont: v })}
            options={[
              { value: 'theme',     label: <span style={{ fontFamily: 'Muse', fontSize: 15, lineHeight: 1 }}>Signature</span> },
              { value: 'modern',    label: <span style={{ fontFamily: 'Inter, -apple-system, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, fontSize: 11 }}>Modern</span> },
              { value: 'editorial', label: <span style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: 13 }}>Editorial</span> },
              { value: 'cormorant', label: <span style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: 12 }}>Classic</span> },
            ]}
          />
        </DesignSection>
      )}

      {['florence', 'amsterdam'].includes(config.design?.theme || 'kyoto') && (
        <DesignSection label="Logo bar">
          <DesignPillToggle
            value={['1', '2', '3'].includes(config.design?.logoBarLayout) ? config.design.logoBarLayout : '1'}
            onChange={(v) => update({ design: { ...(config.design || {}), logoBarLayout: v } })}
            options={[{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }]}
          />
        </DesignSection>
      )}

      {(config.design?.theme || 'kyoto') === 'florence' && (
        <DesignSection label="Photo details" description="Choose what details to show next to your photos.">
          <DesignPillToggle
            value={['off', 'date', 'exif'].includes(config.design?.florencePhotoMeta) ? config.design.florencePhotoMeta : 'date'}
            onChange={(v) => update({ design: { ...(config.design || {}), florencePhotoMeta: v } })}
            options={[
              { value: 'off', label: 'Off' },
              { value: 'date', label: 'Date' },
              { value: 'exif', label: 'EXIF' },
            ]}
          />
        </DesignSection>
      )}

      {(config.design?.theme || 'kyoto') === 'florence' && (
        <DesignSection label="Photo treatment">
          <DesignPillToggle
            value={config.design?.photoTreatment || 'colour'}
            onChange={(v) => update({ design: { ...(config.design || {}), photoTreatment: v } })}
            options={[
              { value: 'colour', label: 'Colour' },
              { value: 'mono', label: 'Mono' },
              { value: 'sepia', label: 'Sepia' },
            ]}
          />
        </DesignSection>
      )}

      {(config.design?.theme || 'kyoto') === 'amsterdam' && (
        <DesignSection label="Ink" description="The bold color used for solid blocks, titles and the menu.">
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.entries(AMSTERDAM_INKS).map(([id, v]) => {
              const active = resolveAmsterdamInk(config.design) === id
              return (
                <button
                  key={id}
                  type="button"
                  aria-label={`${id} ink`}
                  aria-pressed={active}
                  onClick={() => update({ design: { ...(config.design || {}), amsterdamInk: id } })}
                  style={{
                    width: 26, height: 26, borderRadius: 999, cursor: 'pointer',
                    background: v.ink,
                    border: active ? '2px solid var(--text-primary)' : '2px solid transparent',
                    outline: active ? '1px solid #fff' : 'none', outlineOffset: -3,
                  }}
                />
              )
            })}
          </div>
        </DesignSection>
      )}

      {(config.design?.theme || 'kyoto') === 'amsterdam' && (
        <DesignSection label="Headline" description="The display type on the cover and title openers.">
          <DesignPillToggle
            value={config.design?.amsterdamHeadline === 'editorial' ? 'editorial' : 'condensed'}
            onChange={(v) => update({ design: { ...(config.design || {}), amsterdamHeadline: v } })}
            options={[
              { value: 'condensed', label: 'Condensed' },
              { value: 'editorial', label: 'Editorial' },
            ]}
          />
        </DesignSection>
      )}

      {(config.design?.theme || 'kyoto') === 'amsterdam' && (
        <DesignSection label="Photo details" description="Choose what details to show next to your photos.">
          <DesignPillToggle
            value={['off', 'date', 'exif'].includes(config.design?.amsterdamPhotoMeta) ? config.design.amsterdamPhotoMeta : 'date'}
            onChange={(v) => update({ design: { ...(config.design || {}), amsterdamPhotoMeta: v } })}
            options={[
              { value: 'off', label: 'Off' },
              { value: 'date', label: 'Date' },
              { value: 'exif', label: 'EXIF' },
            ]}
          />
        </DesignSection>
      )}

      {resolveNavStyle(config.design?.theme || 'kyoto') !== 'left-rail' && (
        <DesignSection label="Navigation">
          <DesignPillToggle
            value={config.design?.navStyle === 'menu' ? 'menu' : 'links'}
            onChange={(v) => update({ design: { ...(config.design || {}), navStyle: v } })}
            options={[{ value: 'links', label: 'Links' }, { value: 'menu', label: 'Menu' }]}
          />
        </DesignSection>
      )}

      {config.design?.navStyle !== 'menu' && (
        <DesignSection
          label="Nested pages"
          description={config.design?.subNavStyle === 'inline'
            ? 'Nested pages appear as links on their parent page.'
            : 'Nested pages appear in a dropdown under the parent link in the site menu.'}
        >
          <DesignPillToggle
            value={config.design?.subNavStyle === 'inline' ? 'inline' : 'dropdown'}
            onChange={(v) => update({ design: { ...(config.design || {}), subNavStyle: v } })}
            options={[{ value: 'dropdown', label: 'Dropdown' }, { value: 'inline', label: 'Inline' }]}
          />
        </DesignSection>
      )}

      <DesignSection
        label="Social links"
        description={onEditHandles ? (
          <>You can add these in your{' '}
            <button type="button" onClick={onEditHandles}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#2c2416' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'inherit' }}
              style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2, cursor: 'pointer', transition: 'color 0.15s' }}
            >profile</button>
          </>
        ) : 'You can add these in your profile'}
      >
        {/* Florence only renders social links as text, so it doesn't offer Icons. */}
        <DesignPillToggle
          value={config.design?.theme === 'florence' && resolveFooterSocial(config) === 'icons' ? 'text' : resolveFooterSocial(config)}
          onChange={(v) => update({ design: { ...(config.design || {}), footerSocial: v } })}
          options={[
            { value: 'text', label: 'Text' },
            ...(config.design?.theme === 'florence' ? [] : [{ value: 'icons', label: 'Icons' }]),
            { value: 'off', label: 'Off' },
          ]}
        />
      </DesignSection>
    </>
  )
}
