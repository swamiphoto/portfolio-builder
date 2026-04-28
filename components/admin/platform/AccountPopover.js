import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import PopoverShell from './PopoverShell'

function AutoGrowTextarea({ value, onChange, placeholder, maxHeight, style: styleProp, ...props }) {
  const ref = useRef(null)
  const adjust = useCallback(() => {
    if (!ref.current) return
    ref.current.style.height = '0'
    const sh = ref.current.scrollHeight
    ref.current.style.height = Math.min(sh, maxHeight || sh) + 'px'
    ref.current.style.overflowY = maxHeight && sh > maxHeight ? 'auto' : 'hidden'
  }, [maxHeight])
  useLayoutEffect(() => { adjust() }, [value, adjust])
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={1}
      style={{ resize: 'none', overflow: 'hidden', ...styleProp }}
      {...props}
    />
  )
}

const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace'

const DIVIDER_STRONG = '1px solid rgba(160,140,110,0.20)'
const INPUT_BORDER   = 'rgba(160,140,110,0.32)'

const inputStyle = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  borderBottom: `1px solid ${INPUT_BORDER}`,
  padding: '0 0 7px',
  fontSize: 13,
  lineHeight: 1.35,
  color: '#2c2416',
  outline: 'none',
  transition: 'border-color 0.15s',
}

const smallInputStyle = {
  ...inputStyle,
  fontSize: 12,
  padding: '0 0 6px',
}

const inputCls = 'site-input'

function Section({ label, children }) {
  return (
    <div style={{ padding: '10px 14px' }}>
      {label && (
        <div
          style={{
            fontSize: 10,
            fontFamily: MONO,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            fontWeight: 500,
            marginBottom: 0,
          }}
        >
          {label}
        </div>
      )}
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      {label && (
        <div
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            fontFamily: MONO,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            marginBottom: 0,
          }}
        >
          {label}
        </div>
      )}
      {children}
    </div>
  )
}

function slugify(v) {
  return v.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')
}

const SOCIAL_LINKS = [
  { key: 'instagram', label: 'Instagram',   placeholder: '@handle' },
  { key: 'facebook',  label: 'Facebook',    placeholder: 'Page name or URL' },
  { key: 'twitter',   label: 'X / Twitter', placeholder: '@handle' },
  { key: 'tiktok',    label: 'TikTok',      placeholder: '@handle' },
  { key: 'youtube',   label: 'YouTube',     placeholder: 'Channel URL' },
  { key: 'website',   label: 'Website',     placeholder: 'https://…' },
]

export default function AccountPopover({ siteConfig, username, email, anchorEl, onUpdate, onClose, onSignOut }) {
  const [tab, setTab] = useState('profile')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [usernameDraft, setUsernameDraft] = useState(username || '')
  const [usernameError, setUsernameError] = useState(null)
  const [addedKeys, setAddedKeys] = useState([]) // keys added in this session (may be empty)
  const [focusKey, setFocusKey] = useState(null) // most recently added — auto-focus once
  const [linkMenuOpen, setLinkMenuOpen] = useState(false)
  const [linkMenuPos, setLinkMenuPos] = useState(null)
  const inputRefs = useRef({})
  const linkMenuRef = useRef(null)
  const linkButtonRef = useRef(null)

  useEffect(() => {
    if (focusKey && inputRefs.current[focusKey]) {
      inputRefs.current[focusKey].focus()
      setFocusKey(null)
    }
  }, [focusKey])

  useEffect(() => {
    if (!linkMenuOpen) return
    function handler(e) {
      if (linkMenuRef.current?.contains(e.target)) return
      if (linkButtonRef.current?.contains(e.target)) return
      setLinkMenuOpen(false)
    }
    function onScroll() { setLinkMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', handler)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [linkMenuOpen])

  function openLinkMenu() {
    if (!linkButtonRef.current) return
    const rect = linkButtonRef.current.getBoundingClientRect()
    setLinkMenuPos({ left: rect.left, top: rect.bottom + 4 })
    setLinkMenuOpen(true)
  }

  function addLink(key) {
    setAddedKeys(prev => prev.includes(key) ? prev : [...prev, key])
    setFocusKey(key)
    setLinkMenuOpen(false)
  }

  function removeLink(key) {
    setAddedKeys(prev => prev.filter(k => k !== key))
    if (contact[key]) updateContact({ [key]: '' })
  }

  const contact = siteConfig?.contact || {}
  const rootDomain = (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ROOT_DOMAIN) || 'localhost:3000'
  const displayDomain = rootDomain.replace(/:\d+$/, '')

  useEffect(() => {
    fetch('/api/admin/profile')
      .then(r => r.json())
      .then(p => {
        if (p.displayName) setDisplayName(p.displayName)
        if (p.bio) setBio(p.bio)
        if (p.username) setUsernameDraft(p.username)
      })
      .catch(() => {})
  }, [])

  function updateContact(patch) {
    onUpdate({ ...(siteConfig || {}), contact: { ...contact, ...patch } })
  }

  async function commitProfile(fields) {
    const slug = slugify(usernameDraft)
    if (!slug) return
    setUsernameError(null)
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: slug, displayName, bio, ...fields }),
      })
      if (res.status === 409) { setUsernameError('Username already taken'); return }
      if (!res.ok) return

      const patch = { ...(siteConfig || {}) }
      const name = fields.displayName ?? displayName
      if (name && (!patch.siteName || patch.siteName === 'My Portfolio')) {
        patch.siteName = `${name} Photography`
      }
      const bioPatch = fields.bio ?? bio
      if (bioPatch && !patch.tagline) {
        patch.tagline = bioPatch
        if (!patch.cover?.subheading) {
          patch.cover = { ...(patch.cover || {}), subheading: bioPatch }
        }
      }
      onUpdate(patch)
    } catch (e) {}
  }

  const tabsNode = (
    <div className="flex" style={{ height: '100%', marginLeft: -4 }}>
      {['profile', 'account', 'billing'].map((t) => {
        const active = tab === t
        return (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="relative transition-colors flex items-center"
            style={{
              padding: '0 10px',
              fontSize: 11,
              fontFamily: MONO,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color: active ? '#2c2416' : 'var(--text-muted)',
              fontWeight: active ? 500 : 400,
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text-secondary)' }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            {t}
            {active && (
              <span
                style={{
                  position: 'absolute',
                  left: 8, right: 8, bottom: -1,
                  height: 1.5,
                  background: '#2c2416',
                  borderRadius: 1,
                }}
              />
            )}
          </button>
        )
      })}
    </div>
  )

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={300} title={tabsNode}>

      {/* ── Profile tab ── */}
      {tab === 'profile' && <>
        <Section>
          <div className="space-y-5">
            <Field label="Name">
              <input
                className={inputCls}
                style={inputStyle}
                placeholder="Jane Smith"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={() => commitProfile({ displayName })}
              />
            </Field>
            <Field label="Bio">
              <AutoGrowTextarea
                className={inputCls}
                style={inputStyle}
                placeholder="Portrait photographer based in NYC"
                maxHeight={140}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                onBlur={() => commitProfile({ bio })}
              />
            </Field>
            <Field label="Username">
              <input
                className={inputCls}
                style={inputStyle}
                placeholder="janesmith"
                value={usernameDraft}
                onChange={(e) => { setUsernameDraft(slugify(e.target.value)); setUsernameError(null) }}
                onBlur={() => commitProfile({})}
              />
              {usernameError
                ? <div style={{ fontSize: 10.5, color: '#c14a4a', marginTop: 4 }}>{usernameError}</div>
                : <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4, fontFamily: MONO, letterSpacing: '0.04em' }}>{(slugify(usernameDraft) || username)}.{displayDomain}</div>
              }
            </Field>
            {email && (
              <Field label="Email">
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontFamily: MONO, letterSpacing: '0.02em' }}>{email}</div>
              </Field>
            )}
          </div>
        </Section>

        <Section label="Social Links">
          {(() => {
            const visibleKeys = SOCIAL_LINKS
              .filter(({ key }) => contact[key] || addedKeys.includes(key))
              .map(s => s.key)
            const remaining = SOCIAL_LINKS.filter(s => !visibleKeys.includes(s.key))
            return (
              <div className="space-y-2">
                {SOCIAL_LINKS.filter(s => visibleKeys.includes(s.key)).map(({ key, label, placeholder }) => (
                  <div key={key} className="flex items-center gap-3 group">
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)', width: 64, flexShrink: 0 }}>{label}</span>
                    <input
                      ref={(el) => { inputRefs.current[key] = el }}
                      className={inputCls}
                      style={smallInputStyle}
                      placeholder={placeholder}
                      value={contact[key] || ''}
                      onChange={(e) => updateContact({ [key]: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => removeLink(key)}
                      title={`Remove ${label}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      style={{
                        width: 18, height: 18,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-muted)',
                        marginLeft: -4,
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#c14a4a'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                        <path d="M4 4l8 8M12 4l-8 8" />
                      </svg>
                    </button>
                  </div>
                ))}
                {remaining.length > 0 && (
                  <div style={{ paddingTop: visibleKeys.length > 0 ? 4 : 0 }}>
                    <button
                      ref={linkButtonRef}
                      type="button"
                      onClick={openLinkMenu}
                      className="inline-flex items-center gap-1.5 transition-colors"
                      style={{
                        fontSize: 11.5,
                        color: linkMenuOpen ? '#2c2416' : 'var(--text-secondary)',
                        padding: '3px 0',
                      }}
                      onMouseEnter={e => { if (!linkMenuOpen) e.currentTarget.style.color = '#2c2416' }}
                      onMouseLeave={e => { if (!linkMenuOpen) e.currentTarget.style.color = 'var(--text-secondary)' }}
                    >
                      <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                        <path d="M7 3v8M3 7h8" />
                      </svg>
                      Add link
                    </button>
                  </div>
                )}
              </div>
            )
          })()}
        </Section>
      </>}

      {/* ── Account tab ── */}
      {tab === 'account' && <>
        <Section label="Login">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--text-secondary)' }}>
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
              </svg>
              <span style={{ fontSize: 13, color: '#2c2416' }}>Google</span>
            </div>
            <span
              style={{
                fontSize: 9.5,
                fontFamily: MONO,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                background: 'rgba(160,140,110,0.14)',
                padding: '3px 8px',
                borderRadius: 999,
                fontWeight: 500,
              }}
            >
              Connected
            </span>
          </div>
        </Section>

        <Section label="Password">
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Password login is not available for Google-connected accounts.
          </p>
        </Section>
      </>}

      {/* ── Billing tab ── */}
      {tab === 'billing' && <>
        <Section label="Plan">
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 13, color: '#2c2416' }}>Free</span>
            <button
              style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'underline', textUnderlineOffset: 2, transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#2c2416'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              Upgrade →
            </button>
          </div>
        </Section>

        <Section label="Payment">
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>No payment method on file.</p>
        </Section>
      </>}

      <div style={{ padding: '11px 14px', borderTop: DIVIDER_STRONG }}>
        <button
          onClick={onSignOut}
          style={{ fontSize: 12.5, color: 'var(--text-secondary)', transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#c14a4a'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          Sign out
        </button>
      </div>

      {linkMenuOpen && linkMenuPos && typeof window !== 'undefined' && createPortal(
        <div
          ref={linkMenuRef}
          onMouseDown={(e) => e.stopPropagation()}
          className="fixed rounded-md overflow-hidden"
          style={{
            left: linkMenuPos.left,
            top: linkMenuPos.top,
            zIndex: 10000,
            minWidth: 160,
            background: 'var(--popover)',
            boxShadow: '0 0 0 1px rgba(26,18,10,0.10), 0 4px 12px rgba(26,18,10,0.12), 0 16px 32px -8px rgba(26,18,10,0.16)',
            padding: '4px 0',
          }}
        >
          {SOCIAL_LINKS
            .filter(s => !(contact[s.key] || addedKeys.includes(s.key)))
            .map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => addLink(key)}
                className="w-full text-left transition-colors"
                style={{ padding: '7px 12px', fontSize: 12.5, color: '#2c2416' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(160,140,110,0.10)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {label}
              </button>
            ))}
        </div>,
        document.body
      )}

    </PopoverShell>
  )
}
