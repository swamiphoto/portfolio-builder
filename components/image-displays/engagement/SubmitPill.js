// components/image-displays/engagement/SubmitPill.js
// Floating "N selected · Submit favorites" pill, shown once the visitor has
// hearted at least one photo and the photographer enabled the submit workflow.
import { useState } from 'react'
import { useClientEngagement } from './ClientEngagementContext'

export default function SubmitPill() {
  const ctx = useClientEngagement()
  const [confirming, setConfirming] = useState(false)
  if (!ctx || !ctx.features.submitWorkflow || ctx.myFavoriteCount === 0) return null

  if (ctx.submitted) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur text-stone-600 text-sm px-5 py-2.5 rounded-full shadow-lg border border-stone-200">
        ✓ {ctx.myFavoriteCount} favorite{ctx.myFavoriteCount === 1 ? '' : 's'} sent
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-stone-900/95 backdrop-blur text-white text-sm pl-5 pr-2 py-2 rounded-full shadow-xl">
      <span>{ctx.myFavoriteCount} selected</span>
      {confirming ? (
        <button onClick={() => { ctx.submitFavorites(); setConfirming(false) }} className="bg-white text-stone-900 px-4 py-1.5 rounded-full font-medium">
          Confirm send
        </button>
      ) : (
        <button onClick={() => setConfirming(true)} className="bg-white/15 px-4 py-1.5 rounded-full">
          Submit favorites
        </button>
      )}
    </div>
  )
}
