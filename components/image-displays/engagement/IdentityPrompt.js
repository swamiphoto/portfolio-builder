// components/image-displays/engagement/IdentityPrompt.js
// Asked once per device: name required, email optional (required when the
// photographer flips requireEmail). Copy stays warm and short.
import { useState } from 'react'

export default function IdentityPrompt({ requireEmail, initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '')
  const [email, setEmail] = useState(initial?.email || '')
  const canSave = name.trim() && (!requireEmail || /.+@.+\..+/.test(email.trim()))

  function submit(e) {
    e.preventDefault()
    if (canSave) onSave(name.trim(), email.trim())
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onCancel}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-medium text-stone-800">Who&rsquo;s picking?</h2>
          <p className="text-sm text-stone-500 mt-1">So the photographer knows who this is from. Asked just once.</p>
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={100}
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-stone-500"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={requireEmail ? 'Email' : 'Email (optional)'}
          maxLength={200}
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-stone-500"
        />
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="text-sm text-stone-500 px-3 py-2">Cancel</button>
          <button type="submit" disabled={!canSave} className="text-sm bg-stone-900 text-white px-4 py-2 rounded-lg disabled:opacity-40">Continue</button>
        </div>
      </form>
    </div>
  )
}
