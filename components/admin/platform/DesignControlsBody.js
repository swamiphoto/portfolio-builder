import { DesignSection, PillToggle as DesignPillToggle, DesignSelect } from './designControls'
import { THEME_LIST } from '../../../common/themes'
import { resolveNavStyle } from '../../../common/navStyles'
import { resolveFooterSocial } from '../../../common/siteDesign'

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
        <DesignSection label="Nested pages">
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
        <DesignPillToggle
          value={resolveFooterSocial(config)}
          onChange={(v) => update({ design: { ...(config.design || {}), footerSocial: v } })}
          options={[{ value: 'text', label: 'Text' }, { value: 'icons', label: 'Icons' }, { value: 'off', label: 'Off' }]}
        />
      </DesignSection>
    </>
  )
}
