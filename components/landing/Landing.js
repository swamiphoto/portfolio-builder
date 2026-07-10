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

const TESTIMONIAL = {
  quote:
    "Most platforms (Squarespace, Wix, SmugMug) aren't built with the photographer in mind. Pixieset gets close. Sepia takes it to a whole other level.",
  attrib: 'Marcus Oliveira',
  role: 'Landscape photographer',
}

const NAV = ['Features', 'Compare', 'Pricing']

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
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              fontFamily: FONT.script,
              fontSize: 220,
              lineHeight: 0.82,
              color: T.ink,
              letterSpacing: '-0.005em',
              margin: '0 0 8px',
            }}
          >
            Sepia
          </div>

          <div
            style={{
              height: 1,
              background: T.border,
              width: 80,
              margin: '28px auto 32px',
            }}
          />

          <h1
            style={{
              margin: '0 auto',
              fontFamily: FONT.serif,
              fontWeight: 300,
              fontSize: 44,
              lineHeight: 1.1,
              letterSpacing: '-0.018em',
              color: T.ink,
              maxWidth: 680,
            }}
          >
            The platform photographers have been screaming for.
          </h1>

          <p
            style={{
              margin: '24px auto 0',
              fontFamily: FONT.serif,
              fontWeight: 400,
              fontSize: 17,
              lineHeight: 1.55,
              color: T.body,
              maxWidth: 600,
            }}
          >
            A portfolio, client galleries, print sales, and slideshows scored to music, all in one
            place, all built around how photographers actually work. Swap themes without rebuilding
            your site. Import from your existing platform in under two minutes.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
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
                padding: '14px 24px',
                borderRadius: 5,
                fontSize: 14,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                fontFamily: FONT.sans,
              }}
            >
              Get Started →
            </button>
            <button
              onClick={handleSignIn}
              className="sepia-btn-outline"
              style={{
                background: 'transparent',
                color: T.ink,
                padding: '13px 22px',
                borderRadius: 5,
                fontSize: 14,
                fontWeight: 500,
                border: `1px solid ${T.ink}`,
                cursor: 'pointer',
                fontFamily: FONT.sans,
              }}
            >
              Import your existing site
            </button>
          </div>
        </div>

        {/* Admin shot — centered below */}
        <div style={{ marginTop: 80, display: 'flex', justifyContent: 'center' }}>
          <AdminShot width={1080} />
        </div>
      </section>

      {/* Testimonial */}
      <section style={{ padding: '56px 40px 40px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <p
            style={{
              margin: 0,
              fontFamily: FONT.serif,
              fontWeight: 300,
              fontSize: 26,
              lineHeight: 1.4,
              color: T.ink,
              letterSpacing: '-0.005em',
            }}
          >
            “{TESTIMONIAL.quote}”
          </p>
          <div
            style={{
              marginTop: 22,
              fontFamily: FONT.mono,
              fontSize: 10.5,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: T.muted,
            }}
          >
            {TESTIMONIAL.attrib} · {TESTIMONIAL.role}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section style={{ padding: '32px 40px 64px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div style={{ width: 64, height: 1, background: T.border }} />
        </div>

        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
<h2
              style={{
                margin: '14px 0 0',
                fontFamily: FONT.serif,
                fontWeight: 300,
                fontSize: 32,
                color: T.ink,
                letterSpacing: '-0.015em',
              }}
            >
              What you get, by platform.
            </h2>
          </div>
          <div
            style={{
              background: T.card,
              borderRadius: 5,
              boxShadow: '0 1px 3px rgba(26,18,10,0.06), 0 0 0 1px rgba(26,18,10,0.06)',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '14px 20px',
                      fontFamily: FONT.mono,
                      fontSize: 10,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: T.muted,
                      fontWeight: 500,
                      borderBottom: `1px solid ${T.border}`,
                      width: '40%',
                    }}
                  >
                    Capability
                  </th>
                  {COMPARISON.columns.map((c, i) => (
                    <th
                      key={c}
                      style={{
                        padding: '14px 12px',
                        borderBottom: `1px solid ${T.border}`,
                        borderLeft: `1px solid ${T.borderSoft}`,
                        fontFamily: i === 0 ? FONT.script : FONT.sans,
                        fontSize: i === 0 ? 26 : 12,
                        fontWeight: i === 0 ? 400 : 500,
                        color: i === 0 ? T.ink : T.inkSoft,
                        lineHeight: i === 0 ? 0.7 : 1.2,
                      }}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.rows.map((row, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: i === COMPARISON.rows.length - 1 ? 'none' : `1px solid ${T.borderSoft}`,
                    }}
                  >
                    <td style={{ padding: '14px 20px', color: T.inkSoft, fontSize: 14 }}>{row[0]}</td>
                    {row.slice(1).map((v, j) => (
                      <td
                        key={j}
                        style={{
                          padding: '14px 12px',
                          textAlign: 'center',
                          borderLeft: `1px solid ${T.borderSoft}`,
                          background: j === 0 ? 'rgba(139,111,71,0.05)' : undefined,
                        }}
                      >
                        {v ? (
                          <span
                            style={{
                              display: 'inline-block',
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              background: j === 0 ? T.accent : 'rgba(26,18,10,0.85)',
                              color: T.paper,
                              fontSize: 11,
                              lineHeight: '18px',
                            }}
                          >
                            ✓
                          </span>
                        ) : (
                          <span style={{ color: T.faint, fontSize: 16 }}>—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
