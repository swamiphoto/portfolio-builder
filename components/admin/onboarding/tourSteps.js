// components/admin/onboarding/tourSteps.js

// The first-run tour. It walks the studio from the top of the sidebar down:
// the idea (a site is pages), then cover, pages, hidden pages, adding a page,
// the library, and settings. Every anchored step is placed to the RIGHT of the
// sidebar so the card never covers the thing it's pointing at.
export function buildTourSteps({ imported = false } = {}) {
  return [
    {
      // No selector: a centered "chapter" card that sets up the mental model.
      selector: null,
      title: 'Your site, in pages',
      body: "Your site is built from pages. Each page is a collection of images, text, and other blocks. We'll get to those shortly.",
      placement: 'center',
    },
    {
      selector: '[data-tour="cover"]',
      title: 'Cover page',
      body: 'Optionally, give your site a cover: a landing page that greets visitors first. You can toggle it on or off whenever you like.',
      placement: 'right',
    },
    {
      selector: '[data-tour="pages-section"]',
      title: 'Your pages',
      body: "This is where you add your pages. Anything you add here becomes a public page on your site's menu.",
      placement: 'right',
    },
    ...(imported
      ? [{
          selector: '[data-tour="pages-section"]',
          title: 'Pages we imported for you',
          body: 'We rebuilt these pages from your old site, photos and all. Open any of them to fine-tune the layout, and if you would rather begin from a clean slate, you can delete them anytime from your profile menu.',
          placement: 'right',
        }]
      : []),
    {
      selector: '[data-tour="hidden-section"]',
      title: 'Hidden pages',
      body: "Want a page that isn't listed publicly? Add it here. It won't be displayed on your menu and opens only through its direct link, like an unlisted page.",
      placement: 'right',
    },
    {
      selector: '[data-tour="add-page"]',
      title: 'Add a page',
      body: "This is where you add a page. Start from a blank canvas or pick one of several templates. Every page is a set of blocks, and we'll get into those once your first page is up.",
      placement: 'right',
    },
    {
      selector: '[data-tour="library"]',
      title: 'Your library',
      body: imported
        ? "All your photos are here, including the ones we just imported. Search and filter by camera, date, and other EXIF details to find what you're looking for fast."
        : "All your photos are here. Search and filter by camera, date, and other EXIF details to find what you're looking for fast.",
      placement: 'right',
    },
    {
      selector: '[data-tour="settings"]',
      title: 'Settings',
      body: "This is your control room. Change your site's theme, connect a custom domain, and set up your print store whenever you're ready.",
      placement: 'right',
    },
  ]
}

export const WELCOME = {
  title: 'Welcome to your studio.',
  body: 'Would you like a quick tour to see how Sepia works? It takes about 20 seconds.',
  confirm: 'Sure, show me around',
  dismiss: 'Maybe later',
}

// Shown the first time a real page is open, once the main tour is done: the
// block sidebar, per-block design, and page settings.
export const BLOCKS_TOUR_STEPS = [
  {
    selector: '[data-tour="add-block"]',
    title: 'Your block sidebar',
    body: 'This is where you build your page. Add blocks and drag them to reorder: photos, text, testimonials, and more. Whatever you add appears live in the preview on the right.',
    placement: 'left',
  },
  {
    selector: '[data-tour="block-design"]',
    title: 'Design each block',
    body: 'Every block has a design menu. Toggle through a few ready-made variants to change how it looks.',
    placement: 'left',
  },
  {
    selector: '[data-tour="page-settings"]',
    title: 'Page settings',
    body: "Open page settings to turn on a music slideshow or client features. Have a poke around when you're ready.",
    placement: 'below',
  },
]
