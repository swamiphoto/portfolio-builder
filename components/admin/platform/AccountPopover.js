import { useState, useEffect } from 'react'
import PopoverShell from './PopoverShell'

const smallInputCls = 'w-full border-b border-rule p-0 pb-1 text-xs text-ink-2 outline-none focus:border-ink-3 placeholder:text-ink-4 bg-transparent'
const inputCls = 'w-full border-b border-rule p-0 pb-1 text-sm text-ink-2 outline-none focus:border-ink-3 placeholder:text-ink-4 bg-transparent'
const overlineCls = 'text-[10px] font-mono font-medium text-ink-4 uppercase tracking-[0.14em]'

function Section({ label, children }) {
  return (
    <div className="px-3 py-3 border-b border-rule last:border-b-0">
      {label && <div className={`${overlineCls} mb-2.5`}>{label}</div>}
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div className={`${overlineCls} mb-1.5`}>{label}</div>
      {children}
    </div>
  )
}

function slugify(v) {
  return v.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')
}

export default function AccountPopover({ siteConfig, username, email, anchorEl, onUpdate, onClose, onSignOut }) {
  const [tab, setTab] = useState('profile')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [usernameDraft, setUsernameDraft] = useState(username || '')
  const [usernameError, setUsernameError] = useState(null)

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

  const tabBtnCls = (active) => ({
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: active ? 'var(--ink)' : 'var(--ink-4)',
    borderBottom: active ? '2px solid var(--ink)' : '2px solid transparent',
    marginBottom: active ? '-1px' : undefined,
  })

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={290} title="Account">

      <div className="flex border-b border-rule px-1">
        {['profile', 'account', 'billing'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-2.5 py-2 transition-colors"
            style={tabBtnCls(tab === t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'profile' && <>
        <Section>
          <div className="space-y-3">
            <Field label="Name">
              <input
                className={inputCls}
                placeholder="Jane Smith"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={() => commitProfile({ displayName })}
              />
            </Field>
            <Field label="Bio">
              <textarea
                className="w-full border-b border-rule p-0 pb-1 text-sm text-ink-2 outline-none focus:border-ink-3 placeholder:text-ink-4 bg-transparent resize-none"
                placeholder="Portrait photographer based in NYC"
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                onBlur={() => commitProfile({ bio })}
              />
            </Field>
            <Field label="Username">
              <input
                className={inputCls}
                placeholder="janesmith"
                value={usernameDraft}
                onChange={(e) => { setUsernameDraft(slugify(e.target.value)); setUsernameError(null) }}
                onBlur={() => commitProfile({})}
              />
              {usernameError
                ? <div className="text-[10px] text-red-500 mt-0.5">{usernameError}</div>
                : <div className="text-[10px] text-ink-4 mt-0.5 font-mono">{(slugify(usernameDraft) || username)}.{displayDomain}</div>
              }
            </Field>
            {email && (
              <Field label="Email">
                <div className="text-xs text-ink-3">{email}</div>
              </Field>
            )}
          </div>
        </Section>

        <Section label="Social Links">
          <div className="space-y-2">
            {[
              { key: 'instagram', label: 'Instagram',   placeholder: '@handle' },
              { key: 'facebook',  label: 'Facebook',    placeholder: 'Page name or URL' },
              { key: 'twitter',   label: 'X / Twitter', placeholder: '@handle' },
              { key: 'tiktok',    label: 'TikTok',      placeholder: '@handle' },
              { key: 'youtube',   label: 'YouTube',     placeholder: 'Channel URL' },
              { key: 'website',   label: 'Website',     placeholder: 'https://…' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-[10px] text-ink-4 w-16 flex-shrink-0">{label}</span>
                <input
                  className={smallInputCls}
                  placeholder={placeholder}
                  value={contact[key] || ''}
                  onChange={(e) => updateContact({ [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </Section>
      </>}

      {tab === 'account' && <>
        <Section label="Login">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-ink-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
              </svg>
              <span className="text-sm text-ink-2">Google</span>
            </div>
            <span className="text-[10px] text-ink-3 bg-paper-2 border border-rule px-2 py-0.5 rounded-full">Connected</span>
          </div>
        </Section>

        <Section label="Password">
          <p className="text-xs text-ink-4">Password login is not available for Google-connected accounts.</p>
        </Section>
      </>}

      {tab === 'billing' && <>
        <Section label="Plan">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-2">Free</span>
            <button className="text-xs text-ink-3 hover:text-ink underline transition-colors">Upgrade →</button>
          </div>
        </Section>

        <Section label="Payment">
          <p className="text-xs text-ink-4">No payment method on file.</p>
        </Section>
      </>}

      <div className="px-3 py-2.5 border-t border-rule">
        <button onClick={onSignOut} className="text-sm text-ink-3 hover:text-red-600 transition-colors">
          Sign out
        </button>
      </div>

    </PopoverShell>
  )
}
