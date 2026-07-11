// components/admin/onboarding/tourSteps.js
export function buildTourSteps({ imported = false } = {}) {
  return [
    {
      selector: '[data-tour="add-page"]',
      title: 'Add a page',
      body: 'Start here. Every part of your site is a page.',
      placement: 'above',
    },
    {
      selector: '[data-tour="pages-section"]',
      title: 'Your pages',
      body: 'Your pages live here and become your site’s navigation.',
      placement: 'right',
    },
    {
      selector: '[data-tour="library"]',
      title: 'Your library',
      body: imported
        ? 'All your photos live here. The ones you just imported are ready to drop in.'
        : 'All your photos live here, ready to drop in.',
      placement: 'above',
    },
    {
      selector: '[data-tour="settings"]',
      title: 'Settings',
      body: 'Set your cover page, custom domain, and print store here.',
      placement: 'above',
    },
  ]
}

export const WELCOME = {
  title: 'You’re in.',
  body: 'Want a quick tour? It takes about 20 seconds.',
  confirm: 'Show me',
  dismiss: 'I’ll explore',
}

export const BLOCKS_TIP_STEP = {
  selector: '[data-tour="add-block"]',
  title: 'Build your page',
  body: 'This is where you build the page. Add photo, text, and video blocks.',
  placement: 'left',
}
