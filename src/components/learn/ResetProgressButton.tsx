'use client'

import { RotateCcw } from 'lucide-react'

// Clear every `education-labs:*` localStorage key (shapes earned, CLAUDE.md
// edits, onboarding-card dismissals, sidebar collapse state) and reload so
// the app re-hydrates from seed.
export function ResetProgressButton() {
  return (
    <button
      type="button"
      onClick={() => {
        const confirmed = window.confirm(
          'Clear all earned shapes, CLAUDE.md edits, and onboarding state? This cannot be undone.',
        )
        if (!confirmed) return
        const keys = Object.keys(localStorage).filter((k) =>
          k.startsWith('education-labs:'),
        )
        keys.forEach((k) => localStorage.removeItem(k))
        window.location.reload()
      }}
      className="text-text-tertiary hover:text-text-primary inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline"
    >
      <RotateCcw className="size-3" />
      Reset progress
    </button>
  )
}
