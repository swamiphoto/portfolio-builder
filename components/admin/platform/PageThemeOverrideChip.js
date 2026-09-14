// A read-only indicator for the preview toolbar, shown beside the site-theme pill
// (ThemeToolbarControl) only when the open page overrides the site theme. It
// explains why the preview renders in a different theme than the site pill says.
// The override itself is set from the page's Theme control in the sidebar.
import { pageThemeOverrideInfo } from '../../../common/themes'
import Tip from '../Tip'

const CHIP = {
  display: 'flex', alignItems: 'center', gap: 6, height: 22, borderRadius: 5,
  border: '1px solid rgba(176,106,52,0.35)', background: 'rgba(176,106,52,0.10)',
  padding: '0 9px', fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.06em',
  color: '#8a5326', whiteSpace: 'nowrap',
}

export default function PageThemeOverrideChip({ siteConfig, page }) {
  if (!page) return null
  const info = pageThemeOverrideInfo(siteConfig, page)
  if (!info.overridden) return null
  return (
    <Tip label={`This page overrides the site theme (${info.siteThemeName}). Change it under Theme in the page settings.`}>
      <span style={CHIP} data-page-theme-override>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#b06a34', flexShrink: 0 }} />
        This page: {info.pageThemeName}
      </span>
    </Tip>
  )
}
