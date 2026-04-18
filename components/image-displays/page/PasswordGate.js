// components/image-displays/page/PasswordGate.js
import { useState } from 'react'

export default function PasswordGate({ pageTitle, onUnlock }) {
  const [val, setVal] = useState('')
  const [error, setError] = useState(false)

  function submit(e) {
    e.preventDefault()
    if (onUnlock(val)) return
    setError(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <form onSubmit={submit} className="w-full max-w-xs space-y-3">
        <h1 className="text-lg font-semibold text-stone-800">{pageTitle}</h1>
        <p className="text-sm text-stone-500">This page is protected.</p>
        <input
          type="password"
          autoFocus
          value={val}
          onChange={(e) => { setVal(e.target.value); setError(false) }}
          className={`w-full border ${error ? 'border-red-400' : 'border-stone-300'} rounded px-3 py-2 text-sm`}
          placeholder="Password"
        />
        {error && <div className="text-xs text-red-600">Incorrect password.</div>}
        <button type="submit" className="w-full bg-stone-900 text-white text-sm py-2 rounded">Continue</button>
      </form>
    </div>
  )
}
