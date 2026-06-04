'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Modal } from '@/components/ui'

// Clear every `education-labs:*` localStorage key (shapes earned, CLAUDE.md edits, pinned
// context, onboarding dismissals, per-figure sessions) and reload so the app re-hydrates from
// seed. Confirmation is the shared Modal rather than a native window.confirm.
export function ResetProgressButton() {
  const [open, setOpen] = useState(false)

  const reset = () => {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('education-labs:'))
    keys.forEach((k) => localStorage.removeItem(k))
    window.location.reload()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-text-tertiary hover:text-text-primary inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline"
      >
        <RotateCcw className="size-3" />
        Reset progress
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Reset progress?" className="max-w-md">
        <p className="text-text-secondary m-0 text-sm leading-relaxed">
          This clears every earned shape, your CLAUDE.md edits, and onboarding state, then
          reloads from the starting point. It can&apos;t be undone.
        </p>

        <div className="mt-1 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-text-tertiary hover:text-text-primary px-3 py-1.5 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-sm bg-[color:var(--color-danger)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            <RotateCcw className="size-4" />
            Reset everything
          </button>
        </div>
      </Modal>
    </>
  )
}
