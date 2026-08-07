import { signIn } from 'next-auth/react'

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

function AdminShot({ width = 1080 }) {
  const panel = '#efeae1'
  const desk = '#e8e2d9'
  const cardBg = '#f6f3ec'
  const ink = T.ink
  const faint = '#b0a490'
  return (
    <div
      style={{
        width,
        height: width * 0.59,
        background: desk,
        borderRadius: 10,
        boxShadow:
          '0 0 0 1px rgba(26,18,10,0.08), 0 60px 100px -40px rgba(26,18,10,0.30), 0 30px 60px -20px rgba(26,18,10,0.15)',
        overflow: 'hidden',
        display: 'flex',
        padding: 12,
        gap: 0,
        maxWidth: '100%',
      }}
    >
      {/* Page sidebar */}
      <div
        style={{
          width: 188,
          background: panel,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 0 0 1px rgba(26,18,10,0.06)',
          borderRadius: 2,
        }}
      >
        <div style={{ padding: '14px 12px 10px', borderBottom: `1px solid ${T.borderSoft}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontFamily: FONT.script, fontSize: 22, color: ink, lineHeight: 0.85 }}>Sepia</span>
            <div style={{ display: 'flex', gap: 3 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(26,18,10,0.10)' }} />
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(26,18,10,0.10)' }} />
            </div>
          </div>
          <div style={{ fontFamily: FONT.serif, fontSize: 14, lineHeight: 1.05, color: ink }}>
            Swami
            <br />
            Venkataramani
          </div>
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 7.5,
              color: faint,
              letterSpacing: '0.06em',
              marginTop: 5,
            }}
          >
            swamiphoto.sepia.photo
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 9 }}>
            <div
              style={{
                flex: 1,
                height: 18,
                borderRadius: 3,
                border: `1px solid ${T.border}`,
                fontFamily: FONT.mono,
                fontSize: 7.5,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: T.inkSoft,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Preview
            </div>
            <div
              style={{
                flex: 1,
                height: 18,
                borderRadius: 3,
                background: T.ink900,
                color: T.paper,
                fontFamily: FONT.mono,
                fontSize: 7.5,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Publish
            </div>
          </div>
        </div>
        <div style={{ flex: 1, padding: '8px 0' }}>
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 7,
              letterSpacing: '0.12em',
              color: faint,
              padding: '4px 12px 6px',
            }}
          >
            PAGES
          </div>
          {[
            ['Home', 12, false],
            ['About', null, false],
            ['Redwoods', 48, true],
            ['Street Photography', 124, false],
            ['Iceland 2025', 86, false],
            ['Instagram', null, false],
            ['Contact', null, false],
          ].map(([title, count, sel], i) => (
            <div
              key={i}
              style={{
                margin: '0 6px',
                padding: '4px 8px',
                borderRadius: 3,
                background: sel ? '#f6f3ec' : 'transparent',
                boxShadow: sel ? 'inset 0 0 0 1px rgba(139,111,71,0.12)' : undefined,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                marginBottom: 1,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 1,
                  background: sel ? T.accent : 'rgba(26,18,10,0.20)',
                }}
              />
              <span
                style={{
                  flex: 1,
                  fontSize: 9.5,
                  color: sel ? ink : T.inkSoft,
                  fontWeight: sel ? 500 : 400,
                }}
              >
                {title}
              </span>
              {count != null && (
                <span style={{ fontFamily: FONT.mono, fontSize: 7.5, color: faint }}>{count}</span>
              )}
            </div>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${T.borderSoft}`, padding: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: T.ink,
              color: T.paper,
              fontFamily: FONT.serif,
              fontSize: 9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            S
          </div>
          <div
            style={{
              flex: 1,
              height: 22,
              borderRadius: 3,
              fontFamily: FONT.mono,
              fontSize: 7.5,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color: T.inkSoft,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Library
          </div>
          <div
            style={{
              flex: 1,
              height: 22,
              borderRadius: 3,
              fontFamily: FONT.mono,
              fontSize: 7.5,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color: T.inkSoft,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Settings
          </div>
        </div>
      </div>

      {/* Block sidebar */}
      <div
        style={{
          width: 200,
          background: panel,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 0 0 1px rgba(26,18,10,0.06)',
          borderLeft: `1px solid ${T.borderSoft}`,
          marginLeft: 1,
        }}
      >
        <div style={{ padding: '14px 12px 10px', borderBottom: `1px solid ${T.borderSoft}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 7, letterSpacing: '0.14em', color: faint }}>EDITING</span>
            <div style={{ display: 'flex', gap: 2 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 9, height: 9, borderRadius: 1.5, background: 'rgba(26,18,10,0.08)' }} />
              ))}
            </div>
          </div>
          <div style={{ fontFamily: FONT.serif, fontSize: 17, color: ink, lineHeight: 1, fontWeight: 400 }}>Redwoods</div>
        </div>
        <div style={{ flex: 1, padding: 8 }}>
          <div
            style={{
              background: cardBg,
              borderRadius: 3,
              padding: '6px 8px',
              marginBottom: 4,
              boxShadow: '0 0 0 1px rgba(26,18,10,0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
              <div style={{ width: 5, height: 8, background: 'rgba(26,18,10,0.18)', borderRadius: 1 }} />
              <span style={{ fontFamily: FONT.mono, fontSize: 6.5, letterSpacing: '0.12em', color: T.inkSoft, flex: 1 }}>HERO</span>
              <span style={{ fontFamily: FONT.mono, fontSize: 6.5, color: faint }}>Full Bleed</span>
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 6, letterSpacing: '0.10em', color: faint, marginBottom: 2 }}>TITLE</div>
            <div
              style={{
                fontSize: 9,
                color: ink,
                paddingBottom: 3,
                borderBottom: '1px solid rgba(26,18,10,0.12)',
                marginBottom: 6,
              }}
            >
              Redwoods
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 6, letterSpacing: '0.10em', color: faint, marginBottom: 2 }}>
              DESCRIPTION
            </div>
            <div
              style={{
                fontSize: 9,
                color: ink,
                paddingBottom: 3,
                borderBottom: '1px solid rgba(26,18,10,0.12)',
                marginBottom: 6,
                lineHeight: 1.3,
              }}
            >
              A walk through Muir Woods, December 2024.
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg,#7a6244,#a08a68)',
                }}
              />
              <span style={{ fontSize: 8, color: T.inkSoft, textDecoration: 'underline' }}>Replace from library</span>
            </div>
          </div>
          <div
            style={{
              background: cardBg,
              borderRadius: 3,
              padding: '6px 8px',
              marginBottom: 4,
              boxShadow: '0 0 0 1px rgba(26,18,10,0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <div style={{ width: 5, height: 8, background: 'rgba(26,18,10,0.18)', borderRadius: 1 }} />
              <span style={{ fontFamily: FONT.mono, fontSize: 6.5, letterSpacing: '0.12em', color: T.inkSoft, flex: 1 }}>TEXT</span>
            </div>
            <div
              style={{
                fontSize: 9,
                color: ink,
                paddingBottom: 3,
                borderBottom: '1px solid rgba(26,18,10,0.12)',
                lineHeight: 1.4,
              }}
            >
              Among the giants, light arrives in slow vertical shafts.
            </div>
          </div>
          <div
            style={{
              background: cardBg,
              borderRadius: 3,
              padding: '6px 8px',
              marginBottom: 4,
              boxShadow: '0 0 0 1px rgba(26,18,10,0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
              <div style={{ width: 5, height: 8, background: 'rgba(26,18,10,0.18)', borderRadius: 1 }} />
              <span style={{ fontFamily: FONT.mono, fontSize: 6.5, letterSpacing: '0.12em', color: T.inkSoft, flex: 1 }}>PHOTOS</span>
              <span style={{ fontFamily: FONT.mono, fontSize: 6.5, color: faint }}>Stacked</span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 1,
                background: '#e8dfcd',
              }}
            >
              {['#3a2e1e', '#5a4a36', '#7a6244', '#9a8466', '#c4a987', '#7a6244', '#5a4a36', '#a08a68', '#8a7252'].map(
                (c, i) => (
                  <div key={i} style={{ aspectRatio: '1/1', background: c }} />
                ),
              )}
            </div>
          </div>
          <div
            style={{
              marginTop: 6,
              height: 22,
              border: `1px dashed ${T.border}`,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: FONT.mono,
              fontSize: 7,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color: faint,
            }}
          >
            + Add Block
          </div>
        </div>
      </div>

      {/* Preview pane */}
      <div style={{ flex: 1, marginLeft: 16, display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <div
            style={{
              height: 14,
              padding: '0 6px',
              borderRadius: 2,
              background: '#e8e2d9',
              border: `1px solid ${T.border}`,
              fontFamily: FONT.mono,
              fontSize: 7,
              color: '#8a8276',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span style={{ color: T.faint }}>swamiphoto.sepia.photo</span>
            <span style={{ color: T.inkSoft }}>/redwoods</span>
          </div>
        </div>
        <div
          style={{
            flex: 1,
            background: '#fbf9f4',
            borderRadius: 4,
            boxShadow: '0 0 0 1px rgba(26,18,10,0.08)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <WarmPhoto src={PHOTOS.cta} style={{ height: '48%', position: 'relative' }} overlay={0.18} />
          <div
            style={{
              flex: 1,
              padding: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
            }}
          >
            {PHOTOS.trio.concat(PHOTOS.trio).map((src, i) => (
              <div
                key={i}
                style={{
                  backgroundImage: `url(${src})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: 2,
                  aspectRatio: '4/3',
                }}
              />
            ))}
          </div>
        </div>
      </div>
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
    'In the 15 years I’ve been a photographer, I’ve tried every platform out there, and not one truly felt like it was made for photographers. Pixieset comes closest, but still lacks a real photographer’s workflow. So I built Sepia, and I sweated the details only another photographer would appreciate.',
  attrib: 'Swami Venkat',
  attribHref: 'https://www.swamiphoto.com',
  role: 'Founder of Sepia',
}

const NAV = ['Features', 'Compare', 'Pricing']

// Placeholder feature rows — swap the copy and drop real screenshots into the
// image slot later. Order roughly by what makes a photographer lean in.
const FEATURES = [
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
  },
  {
    eyebrow: 'Prints',
    title: 'Sell prints with one click',
    body: 'Turn on selling for any photo, on any page, and it’s for sale right where it sits. There’s no separate store to set up and no marketplace to manage. Every order is printed and shipped to your customer’s door automatically.',
  },
  {
    eyebrow: 'Themes',
    title: 'Change your theme, your content stays put',
    body: 'Your content lives in the blocks, not the theme. Swap your whole design and every photo and caption stays exactly where you put it. There’s nothing to rework.',
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

function FeatureRow({ index, eyebrow, title, body, link, flip }) {
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
      {/* Image placeholder — drop a real screenshot here */}
      <div style={{ flex: '1 1 380px', minWidth: 300 }}>
        <div
          style={{
            aspectRatio: '4 / 3',
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
      </div>

      {/* Text */}
      <div style={{ flex: '1 1 380px', minWidth: 300 }}>
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
              href="#magic"
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

        {/* Admin shot — centered below */}
        <div
          id="magic"
          style={{ marginTop: 80, display: 'flex', justifyContent: 'center', scrollMarginTop: 40 }}
        >
          <AdminShot width={1080} />
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
      <section style={{ position: 'relative', padding: '96px 40px 88px' }}>
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
            whiteSpace: 'nowrap',
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
