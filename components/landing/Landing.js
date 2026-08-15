import { signIn } from 'next-auth/react'
import SlideshowStack from './SlideshowStack'
import ThemeShowcase from './ThemeShowcase'

const T = {
  ink: '#1d1b17',
  inkSoft: '#3a362f',
  body: '#4a463d',
  muted: '#8a8276',
  faint: '#b0a490',
  paper: '#f5efe4',
  paperWarm: '#f0e9da',
  paperDeep: '#ebe2cf',
  card: '#faf6ec',
  border: 'rgba(26,18,10,0.10)',
  borderSoft: 'rgba(26,18,10,0.07)',
  accent: '#8b6f47',
  accentDeep: '#6b5436',
  ink900: '#15130f',
}

const FONT = {
  serif: "'Fraunces', Georgia, serif",
  script: "'Italianno', cursive",
  sans: "'Inter', system-ui, sans-serif",
  mono: "'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace",
}

const PHOTOS = {
  hero: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=2000&q=80',
  trio: [
    'https://images.unsplash.com/photo-1500964757637-c85e8a162699?w=900&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=900&q=80',
    'https://images.unsplash.com/photo-1519058082700-08a0b56da9b4?w=900&q=80',
  ],
  cta: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=2000&q=80',
}

function Wordmark({ size = 32, color = T.ink }) {
  return (
    <span
      style={{
        fontFamily: FONT.script,
        fontSize: size,
        color,
        lineHeight: 1,
        display: 'inline-block',
        paddingRight: Math.round(size * 0.18),
      }}
    >
      Sepia
    </span>
  )
}

function Eyebrow({ children, color }) {
  return (
    <span
      style={{
        fontFamily: FONT.mono,
        fontSize: 11,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: color || T.accent,
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  )
}

function WarmPhoto({ src, style, overlay = 0.08, children }) {
  return (
    <div
      style={{
        position: 'relative',
        backgroundImage: `url(${src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, rgba(74,55,30,${overlay * 0.4}) 0%, rgba(74,55,30,${overlay}) 100%)`,
          pointerEvents: 'none',
        }}
      />
      {children}
    </div>
  )
}

const COMPARISON = {
  rows: [
    ['Slideshows scored to music', true, false, false, false, false],
    ['Client galleries + portfolio in one place', true, false, false, false, false],
    ['Sell prints & packages', true, false, false, true, true],
    ['Reuse a photo across pages without duplicating it', true, false, false, false, false],
    ['Swap themes without rebuilding the site', true, false, false, false, false],
    ['Import from your existing platform', true, false, false, false, false],
    ['Built specifically for photographers', true, false, false, true, true],
  ],
  columns: ['Sepia', 'Squarespace', 'Wix', 'Pixieset', 'SmugMug'],
}

// Founder's note — honest first-person version until real user testimonials land.
const TESTIMONIAL = {
  quote:
    'In the 15 years I’ve been a photographer, I’ve tried every platform out there, and not one felt like it was truly made for photographers. Pixieset comes closest, but still lacks a real photographer’s workflow. So I built Sepia, and I sweated the details only another photographer would appreciate.',
  attrib: 'Swami Venkat',
  attribHref: 'https://www.swamiphoto.com',
  role: 'Founder of Sepia',
}

const NAV = ['Features', 'Compare', 'Pricing']

// Placeholder feature rows — swap the copy and drop real screenshots into the
// image slot later. Order roughly by what makes a photographer lean in.
const FEATURES = [
  {
    eyebrow: 'Themes',
    title: 'The best-looking galleries on the internet',
    body: 'Toggle through a range of stunning, museum-grade themes and find the one that fits. Your content stays put as you switch, so there’s nothing to rework.',
    themes: ['/slideshow/slide-1.jpg', '/slideshow/slide-3.jpg', '/slideshow/slide-4.jpg', '/slideshow/slide-5.jpg', '/slideshow/slide-2.jpg', '/splash/photo-3.jpg', '/splash/photo-8.jpg', '/splash/photo-12.jpg', '/splash/photo-19.jpg'],
  },
  {
    eyebrow: 'Block Builder',
    title: 'The most satisfying way to build a site',
    body: 'Every page is made of blocks you arrange like Lego: photos, videos, text, testimonials, contact forms, and plenty more. Every variant is curated, so whatever you choose looks beautiful, and you can’t make a design mistake.',
  },
  {
    eyebrow: 'Music Slideshows',
    title: 'Move clients to tears',
    body: 'Turn any gallery into an immersive, musical slideshow, almost like a Reel made from your photos. Add text wherever you like, and choose from a range of layouts and themes, from sleek and modern to beautifully retro.',
    link: { label: 'See an example', href: 'https://www.swamiphoto.com/galleries/arizona/slideshow' },
    stack: ['/slideshow/slide-1.jpg', '/slideshow/slide-4.jpg', '/slideshow/slide-3.jpg', '/slideshow/slide-5.jpg', '/slideshow/slide-2.jpg'],
  },
  {
    eyebrow: 'Prints',
    title: 'Sell prints with one click',
    body: 'Turn on selling for any photo, on any page, and it’s for sale right where it sits. There’s no separate store to set up and no marketplace to manage. Every order is printed and shipped to your customer’s door automatically.',
  },
  {
    eyebrow: 'The Library',
    title: 'Upload once, use it everywhere',
    body: 'Every photo you upload goes into one library shared across your whole site. Use the same shot on any page without uploading it twice. Search everything by camera, lens, date, or location.',
  },
  {
    eyebrow: 'Client Galleries',
    title: 'Deliver shoots, collect favorites, and get paid',
    body: 'Flip a toggle and any gallery becomes a client gallery. You choose what clients can do: pick favorites, download photos, and buy prints and packages. Add watermarks if you like.',
  },
]

// Simple hairline divider — a thin line that fades out at both ends, so it's a
// touch more graceful than a hard rule without being fancy.
function GradientDivider({ width = 140 }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height: 1,
        background: `linear-gradient(90deg, transparent, ${T.accent}, transparent)`,
        opacity: 0.55,
      }}
    />
  )
}

function FeatureRow({ index, eyebrow, title, body, link, flip, image, stack, themes }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: flip ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 56,
        flexWrap: 'wrap',
      }}
    >
      {/* Image — an animated slideshow stack, a real screenshot, else a labeled placeholder */}
      <div style={themes ? { flex: '1.55 1 460px', minWidth: 320 } : { flex: '1 1 380px', minWidth: 300 }}>
        {stack ? (
          <SlideshowStack images={stack} />
        ) : themes ? (
          <ThemeShowcase images={themes} />
        ) : image ? (
          <img
            src={image}
            alt={title}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: 8,
              boxShadow: '0 0 0 1px rgba(26,18,10,0.08), 0 30px 60px -30px rgba(26,18,10,0.25)',
            }}
          />
        ) : (
          <div
            style={{
              aspectRatio: '2 / 1',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #efe7d8, #e3d6bf)',
              boxShadow: '0 0 0 1px rgba(26,18,10,0.08), 0 30px 60px -30px rgba(26,18,10,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontFamily: FONT.mono,
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: T.faint,
              }}
            >
              Feature image
            </span>
          </div>
        )}
      </div>

      {/* Text */}
      <div style={themes ? { flex: '1 1 300px', minWidth: 260 } : { flex: '1 1 380px', minWidth: 300 }}>
        <div
          style={{
            fontFamily: FONT.sans,
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: T.accent,
            marginBottom: 12,
          }}
        >
          {eyebrow}
        </div>
        <h3
          style={{
            margin: 0,
            fontFamily: FONT.serif,
            fontWeight: 400,
            fontSize: 30,
            lineHeight: 1.15,
            letterSpacing: '-0.015em',
            color: T.ink,
            textWrap: 'pretty',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: '14px 0 0',
            fontFamily: FONT.sans,
            fontSize: 16,
            lineHeight: 1.6,
            color: T.body,
            maxWidth: 460,
          }}
        >
          {body}
        </p>
        {link && (
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="sepia-link"
            style={{
              display: 'inline-block',
              margin: '12px 0 0',
              fontFamily: FONT.sans,
              fontSize: 15,
              color: T.accent,
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            {link.label}
          </a>
        )}
      </div>
    </div>
  )
}

export default function Landing() {
  const COL = 760
  const handleSignIn = () => signIn('google', { callbackUrl: '/auth/post-login' })

  return (
    <div style={{ background: T.card, fontFamily: FONT.sans, color: T.ink, lineHeight: 1.5 }}>
      <style>{`
        html {
          scroll-behavior: smooth;
        }
        .sepia-btn-primary {
          transition: background 0.15s ease, opacity 0.15s ease;
        }
        .sepia-btn-primary:hover {
          background: #3a362f !important;
        }
        .sepia-btn-outline {
          transition: background 0.15s ease;
        }
        .sepia-btn-outline:hover {
          background: ${T.paperDeep} !important;
        }
        .sepia-link {
          transition: color 0.15s ease;
        }
        .sepia-link:hover {
          color: ${T.ink} !important;
        }
        .sepia-footer-link {
          transition: color 0.15s ease;
        }
        .sepia-footer-link:hover {
          color: ${T.inkSoft} !important;
        }
        .sepia-ghost-link {
          transition: color 0.15s ease;
        }
        .sepia-ghost-link:hover {
          color: ${T.accent} !important;
        }
        .sepia-ghost-arrow {
          display: inline-block;
          transition: transform 0.15s ease;
        }
        .sepia-ghost-link:hover .sepia-ghost-arrow {
          transform: translateY(2px);
        }
        .sepia-margin-note {
          position: absolute;
          left: 30px;
          top: 50%;
          writing-mode: vertical-rl;
          transform: translateY(-50%) rotate(180deg);
          font-family: ${FONT.mono};
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: ${T.faint};
          white-space: nowrap;
          pointer-events: none;
        }
        @media (max-width: 1180px) {
          .sepia-margin-note { display: none; }
        }
      `}</style>
      {/* Sign-in link, floats top-right */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          right: 40,
          zIndex: 10,
        }}
      >
        <span
          onClick={handleSignIn}
          className="sepia-link"
          style={{
            cursor: 'pointer',
            fontSize: 13.5,
            color: T.inkSoft,
            fontFamily: FONT.sans,
          }}
        >
          Sign in
        </span>
      </div>

      {/* Hero — centered editorial masthead, admin shot below */}
      <section
        style={{
          position: 'relative',
          padding: '48px 40px 56px',
        }}
      >
        {/* Type stack, centered */}
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          {/* Small wordmark */}
          <div style={{ marginBottom: 44 }}>
            <Wordmark size={44} />
          </div>

          {/* Sarcastic hook — quote, with attribution on a second line */}
          <h1
            style={{
              margin: '0 auto',
              fontFamily: FONT.serif,
              fontWeight: 500,
              fontSize: 46,
              lineHeight: 1.16,
              letterSpacing: '-0.018em',
              color: T.ink,
              maxWidth: 680,
            }}
          >
            “Building a beautiful site for my photos was actually easy”
          </h1>
          <div
            style={{
              margin: '14px auto 0',
              fontFamily: FONT.serif,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 22,
              color: T.muted,
            }}
          >
            — said no photographer, ever.
          </div>

          {/* CTA row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 22,
              marginTop: 40,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={handleSignIn}
              className="sepia-btn-primary"
              style={{
                background: T.ink,
                color: T.paper,
                padding: '18px 38px',
                borderRadius: 6,
                fontSize: 19,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                fontFamily: FONT.sans,
              }}
            >
              Try Sepia →
            </button>
            <a
              href="#features"
              className="sepia-ghost-link"
              style={{
                cursor: 'pointer',
                fontSize: 16,
                color: T.inkSoft,
                fontFamily: FONT.sans,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>Why it’s magical</span>
              <span aria-hidden="true" className="sepia-ghost-arrow">↓</span>
            </a>
          </div>
        </div>

        {/* Admin shot — a real screenshot of the editor, centered below */}
        <div
          id="magic"
          style={{ marginTop: 80, display: 'flex', justifyContent: 'center', scrollMarginTop: 40 }}
        >
          <img
            src="/home-editor-shot.jpg"
            alt="Building a photography portfolio in Sepia, with one-click print sales"
            style={{
              width: 1080,
              maxWidth: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: 10,
              boxShadow:
                '0 0 0 1px rgba(26,18,10,0.08), 0 60px 100px -40px rgba(26,18,10,0.30), 0 30px 60px -20px rgba(26,18,10,0.15)',
            }}
          />
        </div>
      </section>

      {/* Testimonial — placeholder quote until a real one lands */}
      <section style={{ padding: '96px 40px 0', display: 'flex', justifyContent: 'center' }}>
        <figure style={{ margin: 0, maxWidth: 680, textAlign: 'center' }}>
          <img
            src="/swami-portrait.jpg"
            alt="Swami Venkat"
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              objectFit: 'cover',
              objectPosition: 'center 30%',
              display: 'block',
              margin: '0 auto 22px',
              boxShadow: '0 0 0 1px rgba(26,18,10,0.10), 0 10px 24px -12px rgba(26,18,10,0.35)',
            }}
          />
          <blockquote
            style={{
              margin: 0,
              fontFamily: FONT.serif,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 23,
              lineHeight: 1.5,
              letterSpacing: '-0.01em',
              color: T.inkSoft,
              textWrap: 'balance',
            }}
          >
            “{TESTIMONIAL.quote}”
          </blockquote>
          <figcaption
            style={{
              marginTop: 18,
              fontFamily: FONT.sans,
              fontSize: 14,
              color: T.muted,
            }}
          >
            <a
              href={TESTIMONIAL.attribHref}
              target="_blank"
              rel="noopener noreferrer"
              className="sepia-link"
              style={{
                color: T.ink,
                fontWeight: 500,
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              {TESTIMONIAL.attrib}
            </a>
            {' · '}
            {TESTIMONIAL.role}
          </figcaption>
        </figure>
      </section>

      {/* Features — divider, section heading, then alternating image/text rows */}
      <section id="features" style={{ position: 'relative', padding: '96px 40px 88px', scrollMarginTop: 24 }}>
        {/* Lens gradient divider */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <GradientDivider />
        </div>

        {/* Section title */}
        <h2
          style={{
            margin: '0 auto',
            textAlign: 'center',
            fontFamily: FONT.serif,
            fontWeight: 600,
            fontSize: 34,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            color: T.ink,
            maxWidth: 820,
            textWrap: 'balance',
          }}
        >
          For photographers, by a photographer.
        </h2>

        {/* Section subtitle */}
        <p
          style={{
            margin: '16px auto 0',
            textAlign: 'center',
            fontFamily: FONT.serif,
            fontWeight: 400,
            fontSize: 22,
            lineHeight: 1.35,
            letterSpacing: '-0.01em',
            color: T.inkSoft,
            maxWidth: 600,
            textWrap: 'balance',
          }}
        >
          Sepia is a refreshingly simple way to build your portfolio, sell your prints, and
          delight your clients.
        </p>

        <div
          style={{
            maxWidth: 1000,
            margin: '72px auto 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 88,
          }}
        >
          {FEATURES.map((f, i) => (
            <FeatureRow key={i} index={i + 1} flip={i % 2 === 1} {...f} />
          ))}
        </div>
      </section>

      {/* Closing CTA — the hero's joke, kept as a promise */}
      <section style={{ padding: '120px 40px 128px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <GradientDivider />
        </div>
        <h2
          style={{
            margin: '0 auto',
            fontFamily: FONT.serif,
            fontWeight: 500,
            fontSize: 34,
            lineHeight: 1.25,
            letterSpacing: '-0.015em',
            color: T.ink,
            maxWidth: 680,
            textWrap: 'balance',
          }}
        >
          “Building a beautiful site for my photos was actually easy.”
        </h2>
        <div
          style={{
            marginTop: 14,
            fontFamily: FONT.serif,
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 20,
            color: T.muted,
          }}
        >
          — you, soon.
        </div>
        <div style={{ marginTop: 40 }}>
          <button
            onClick={handleSignIn}
            className="sepia-btn-primary"
            style={{
              background: T.ink,
              color: T.paper,
              padding: '18px 38px',
              borderRadius: 6,
              fontSize: 19,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              fontFamily: FONT.sans,
            }}
          >
            Try Sepia →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: '48px 40px 40px',
          textAlign: 'center',
          borderTop: `1px solid ${T.borderSoft}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            fontFamily: FONT.mono,
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: T.muted,
          }}
        >
          <span>© 2026 Sepia</span>
          <span style={{ color: T.faint }}>·</span>
          <span>Made in San Francisco</span>
          <span style={{ color: T.faint }}>·</span>
          <a href="mailto:swami@swamiphoto.com" className="sepia-footer-link" style={{ color: T.muted, textDecoration: 'none' }}>Contact</a>
          <span style={{ color: T.faint }}>·</span>
          <a href="/privacy" className="sepia-footer-link" style={{ color: T.muted, textDecoration: 'none' }}>Privacy</a>
          <span style={{ color: T.faint }}>·</span>
          <a href="/terms" className="sepia-footer-link" style={{ color: T.muted, textDecoration: 'none' }}>Terms</a>
        </div>
      </footer>
    </div>
  )
}
